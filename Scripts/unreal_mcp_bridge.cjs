/**
 * unreal_mcp_bridge.cjs
 * Dual-purpose bridge:
 * 1. Stdio MCP server for Antigravity IDE to talk to Unreal Engine's ModelContextProtocol plugin.
 * 2. CLI utility to execute tool calls directly against Unreal Engine 5.8 on port 8000.
 */

const http = require('http');
const readline = require('readline');

const UNREAL_HOST = process.env.UNREAL_MCP_HOST || '127.0.0.1';
const UNREAL_PORT = parseInt(process.env.UNREAL_MCP_PORT || '8000', 10);
const UNREAL_PATH = '/mcp';

let currentSessionId = null;

function httpRequest(method, postData, headers = {}) {
  return new Promise((resolve, reject) => {
    const dataStr = postData ? JSON.stringify(postData) : null;
    const reqHeaders = {
      ...headers
    };
    if (dataStr) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(dataStr);
    }

    const req = http.request({
      host: UNREAL_HOST,
      port: UNREAL_PORT,
      path: UNREAL_PATH,
      method: method,
      headers: reqHeaders,
      timeout: 10000
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let parsed = null;
        try {
          if (body) parsed = JSON.parse(body);
        } catch (e) {
          parsed = body;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: parsed
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Connection to Unreal MCP timed out'));
    });

    if (dataStr) req.write(dataStr);
    req.end();
  });
}

async function ensureSession() {
  if (currentSessionId) return currentSessionId;

  const initRes = await httpRequest('POST', {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'antigravity-bridge', version: '1.0' }
    }
  });

  if (initRes.statusCode !== 200) {
    throw new Error(`Failed to initialize session with Unreal MCP: HTTP ${initRes.statusCode}`);
  }

  const sessionId = initRes.headers['mcp-session-id'];
  if (!sessionId) {
    throw new Error('Unreal MCP did not return Mcp-Session-Id header');
  }

  currentSessionId = sessionId;

  // Send initialized notification
  await httpRequest('POST', {
    jsonrpc: '2.0',
    method: 'notifications/initialized'
  }, { 'Mcp-Session-Id': currentSessionId });

  return currentSessionId;
}

async function callMcpTool(name, args = {}, toolsetName = null) {
  const sessionId = await ensureSession();

  let params;
  if (name === 'call_tool') {
    params = {
      name: 'call_tool',
      arguments: args
    };
  } else if (name === 'list_toolsets' || name === 'describe_toolset') {
    params = {
      name: name,
      arguments: args
    };
  } else {
    // Convenience shortcut: if calling a tool directly
    params = {
      name: 'call_tool',
      arguments: {
        toolset_name: toolsetName || args.toolset_name,
        tool_name: name,
        arguments: args.arguments || args
      }
    };
  }

  const res = await httpRequest('POST', {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'tools/call',
    params: params
  }, { 'Mcp-Session-Id': sessionId });

  if (res.statusCode !== 200) {
    throw new Error(`Unreal MCP error: HTTP ${res.statusCode} - ${JSON.stringify(res.body)}`);
  }

  return res.body;
}

// -------------------------------------------------------------
// CLI Mode
// -------------------------------------------------------------
async function runCli() {
  const [,, cmd, ...rest] = process.argv;

  if (!cmd || cmd === 'help') {
    console.log(`
Usage:
  node unreal_mcp_bridge.cjs list
  node unreal_mcp_bridge.cjs describe <toolset_name>
  node unreal_mcp_bridge.cjs call <toolset_name> <tool_name> [json_arguments]
  node unreal_mcp_bridge.cjs raw <tool_name> [json_arguments]
    `);
    process.exit(0);
  }

  try {
    if (cmd === 'list') {
      const res = await callMcpTool('list_toolsets', {});
      const text = res.result?.content?.[0]?.text;
      console.log(text || JSON.stringify(res, null, 2));
    } else if (cmd === 'describe') {
      const toolsetName = rest[0];
      if (!toolsetName) {
        console.error('Missing toolset name');
        process.exit(1);
      }
      const res = await callMcpTool('describe_toolset', { toolset_name: toolsetName });
      const text = res.result?.content?.[0]?.text;
      console.log(text || JSON.stringify(res, null, 2));
    } else if (cmd === 'call') {
      const toolsetName = rest[0];
      const toolName = rest[1];
      const argsJson = rest[2] || '{}';
      let argsObj = {};
      try {
        argsObj = JSON.parse(argsJson);
      } catch (e) {
        console.error('Invalid JSON arguments:', argsJson);
        process.exit(1);
      }
      const res = await callMcpTool(toolName, {
        toolset_name: toolsetName,
        tool_name: toolName,
        arguments: argsObj
      }, toolsetName);
      const text = res.result?.content?.[0]?.text;
      console.log(text || JSON.stringify(res, null, 2));
    } else if (cmd === 'raw') {
      const toolName = rest[0];
      const argsJson = rest[1] || '{}';
      const argsObj = JSON.parse(argsJson);
      const res = await callMcpTool(toolName, argsObj);
      console.log(JSON.stringify(res, null, 2));
    } else {
      console.error(`Unknown command: ${cmd}`);
      process.exit(1);
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

// -------------------------------------------------------------
// Stdio MCP Server Mode
// -------------------------------------------------------------
async function runStdioServer() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  const sendResponse = (resp) => {
    process.stdout.write(JSON.stringify(resp) + '\n');
  };

  rl.on('line', async (line) => {
    line = line.trim();
    if (!line) return;

    let req;
    try {
      req = JSON.parse(line);
    } catch (e) {
      return sendResponse({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error' }
      });
    }

    const { id, method, params } = req;

    try {
      if (method === 'initialize') {
        await ensureSession();
        sendResponse({
          jsonrpc: '2.0',
          id: id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: { listChanged: false }
            },
            serverInfo: {
              name: 'unreal-mcp-bridge',
              version: '1.0.0'
            }
          }
        });
      } else if (method === 'notifications/initialized') {
        // No-op
      } else if (method === 'tools/list') {
        const sessionId = await ensureSession();
        const listRes = await httpRequest('POST', {
          jsonrpc: '2.0',
          id: id,
          method: 'tools/list',
          params: {}
        }, { 'Mcp-Session-Id': sessionId });

        sendResponse({
          jsonrpc: '2.0',
          id: id,
          result: listRes.body?.result || { tools: [] }
        });
      } else if (method === 'tools/call') {
        const sessionId = await ensureSession();
        const toolRes = await httpRequest('POST', {
          jsonrpc: '2.0',
          id: id,
          method: 'tools/call',
          params: params
        }, { 'Mcp-Session-Id': sessionId });

        sendResponse({
          jsonrpc: '2.0',
          id: id,
          result: toolRes.body?.result,
          error: toolRes.body?.error
        });
      } else if (method === 'ping') {
        sendResponse({ jsonrpc: '2.0', id: id, result: {} });
      } else {
        sendResponse({
          jsonrpc: '2.0',
          id: id,
          error: { code: -32601, message: `Method not found: ${method}` }
        });
      }
    } catch (err) {
      sendResponse({
        jsonrpc: '2.0',
        id: id,
        error: { code: -32603, message: err.message }
      });
    }
  });
}

if (process.argv.length > 2) {
  runCli();
} else {
  runStdioServer();
}
