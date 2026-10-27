# Truligon playable demo readiness

**Reviewed:** 2026-10-24  
**Scope assumption:** a short, single-player or locally hosted demo that proves one complete story loop. MMO session hosting and 100-player capacity are separate milestones.

## Current foundation

- The hub blockout and 12 zone maps exist. The 4×3 zone board and keyboard/gamepad ability bindings are implemented in native code.
- Sample Mover movement remains the playable pawn path. The Truligon controller and GAS classes are present; Diego is assigned by default.
- Six DataTables and the seven quest definitions exist.
- The title and house-select Widget Blueprints exist, but `GameDefaultMap` still points at `/Game/Levels/DefaultLevel`. Native code does not create either screen; check the startup level/game-mode Blueprint path when wiring the demo entry flow.
- There is no end-to-end PIE verification of the Truligon start, controls, board travel, abilities, or quest flow.

## Demo blockers, in priority order

| Priority | Gap | Evidence / work needed |
| --- | --- | --- |
| P0 | Launch flow | Change the demo start from the sample `DefaultLevel` to a Truligon title/character flow, then reliably enter `L_TheTouch_Hub`. The current game mode assigns Diego automatically; native code does not open the existing title or house-select widgets. |
| P0 | Playable quest loop | Add an interaction/quest offer, objective event sources, objective HUD, completion feedback, and reward application. `ATruligonGameState::AdvanceQuest` only increments an index; no gameplay code calls it. It does not validate objective, zone, dependency, or status. |
| P0 | Quest state across travel | Quest state is seeded in `GameState::BeginPlay`, so each map load resets it. Keep demo progression in persistent player state or a travel-safe campaign object. |
| P0 | DataTable import warning | The Oct 23 import log says `MapAssetPath` is missing from the editor's reflected `TruligonZone` schema. This is a stale Live Coding/editor schema; restart the editor and reimport the updated CSV after loading the current module. A source guard and native map-path fallback were added so stale row layouts are not read as the new struct. Rebuild/runtime behavior is not yet verified. |
| P0 | Quest-to-level mapping | The forest objectives require `zone_ancient` and the retrofuturistic quest requires `zone_fort_lauderdale`; neither is among the 12 zone IDs. Assign these beats to the hub/one of the 12 levels or explicitly add separate story maps. |
| P0 | The Touch party mechanic | The opening quest asks four characters to touch the Patolli beans simultaneously. Decide how a solo demo represents the other three: companion actors, a single-player interaction sequence, or a co-op-only requirement. No such encounter is implemented yet. |
| P1 | Character choice and presentation | The six playable character records and house-select asset are not connected to the Mover pawn, player state, or an in-game selection flow. Choose a demo character and confirm its appearance, movement, and ability kit. |
| P1 | Demonstrable abilities | Ability classes currently share a generic self-effect activation path. Pick a small set for the demo and give them clear, visible effects that serve the encounter; connect the required target/interaction rules and cooldown feedback. |
| P1 | Objective content | The 12 levels are accepted as blockouts. For the demo, finish only the hub route and the one or two zones used by the chosen quest slice with objective triggers, clear landmarks, and a return path. |
| P1 | Playtest and package | Run the keyboard and gamepad loop in PIE, fix warnings/errors that affect it, then package and launch a standalone build. Packaging and standalone launch are not verified. |

## Suggested first vertical slice

1. Start at the Truligon title screen and enter the hub with a defined playable character.
2. Meet a hub quest giver or use a clearly identified board to take **The Touch**.
3. Travel to the rendezvous space and complete a short, solo-friendly Patolli interaction sequence that represents the four-character synchronization.
4. Show objective progress and the fracture event, grant the Echo progression/reward, and preserve that state when returning to the hub.
5. Offer the Shadow Ace follow-up, then end the demo on a clear story beat.

This proves the campaign loop without requiring all seven quests or all 12 blockout levels to be production complete. Multiplayer sessions, dedicated servers, persistence services, and MMO-scale load testing remain outside this demo slice.
