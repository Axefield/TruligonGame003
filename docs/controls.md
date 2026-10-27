# Truligon Controls

The current movement, camera, and traversal bindings come from the sample `/Game/Input/IMC_Sandbox` context. `SandboxCharacter_Mover` owns that context; keep it enabled on the playable pawn.

## Keyboard and mouse

| Input | Action |
| --- | --- |
| W / A / S / D | Move |
| Mouse movement | Look |
| Left Shift | Sprint |
| Left Control | Walk |
| Space | Jump / contextual traversal |
| C | Crouch |
| E | Interact |
| Right mouse button | Aim |
| Middle mouse button | Strafe |
| 1–4 | Activate the selected character's active/fracture abilities in kit order |
| Tab / M | Toggle the 12-zone board |
| Escape | Close the zone board when open |

## Gamepad

| Input | Action |
| --- | --- |
| Left stick | Move |
| Right stick | Look |
| Left shoulder | Sprint |
| Right shoulder | Walk |
| South face button | Jump / contextual traversal |
| East face button | Crouch |
| North face button | Interact |
| Left trigger | Aim |
| Right stick button | Strafe |
| D-pad up / right / down / left | Ability slots 1 / 2 / 3 / 4 |
| View / Back | Toggle the 12-zone board |

The Truligon ability slots skip passive and reaction abilities. The default Diego kit exposes Memory Code Injection on slot 1 and Time Compression on slot 2; slots 3–4 remain empty for that character. Ability activation and cooldown effects are server-authoritative through the PlayerState ASC. Keyboard/gamepad behavior still needs a PIE pass.

When the zone board is open, use the mouse or keyboard/gamepad focus navigation to choose one of the 12 zones. Selecting a zone travels to its mapped level; the board also provides a return-to-hub action. Movement and ability input are suppressed while this overlay is open.
