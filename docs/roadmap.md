# Game Animation Sample → MMO: Roadmap

**Project:** `GameAnimationSample1` (UE 5.8)
**Goal:** Evolve Epic's Game Animation Sample into a server-authoritative MMO that supports **≥100 players**.
**Status:** Gameplay foundation implemented; Phase 0 benchmark and multiplayer validation remain open

---

## How to read this document

- Each phase has **tasks** (checkboxes), **acceptance criteria** (what "done" means), and **risks**.
- Phases 1–3 are the only work that answers the core question: *can this support 100 players?*
  Everything after Phase 3 is content and services and can be parallelized.
- Do not start a phase until the previous phase's acceptance criteria pass.

---

## Current state of the codebase (baseline)

| Aspect | State |
| --- | --- |
| Engine | UE 5.8, Category "Samples", `EpicSampleNameHash=1673045636` |
| Language | Blueprint content + source-backed `GameAnimationSample` module |
| Source | `Source/GameAnimationSample/` contains the Truligon gameplay layer; `.uproject` declares the module and enables GameplayAbilities |
| Gameplay logic | Static game data, 20 concrete gameplay abilities, fracture ability, instant effect, replicated attributes, player-state ASC, inventory/relics, traits, world/quest state, controller, and game mode are implemented |
| Networking | Core player/world state, ASC, inventory, and character movement replication are configured in code; dedicated-server and multi-client behavior is not yet validated. Replication Graph and production relevancy policy remain open |
| Movement | Two parallel implementations: `SandboxCharacter_CMC` and `SandboxCharacter_Mover` |
| Default movement | **Mover** (`DDCvar.LocomotionSetupMover=1`) |
| Renderer | Lumen + Nanite + VSM, DX12 SM6, `r.AllowStaticLighting=0` |
| Key plugins | PoseSearch, Chooser, MotionWarping, AnimationWarping, AnimationLayering, Locomotor, Mover, ChaosMover, NetworkPrediction, SmartObjects, GameplayInteractions, StateTree, RigLogic, LiveLink, HairStrands, MovieSceneAnimMixer, DrawDebugLibrary |
| Content | Includes the sample content areas plus `Truligon/` game data; six imported DataTable assets are present under `Content/Truligon/Data/` |
| Truligon presentation | `WBP_Truligon_TitleScreen` and `WBP_Truligon_HouseSelect` are compiled UMG assets. Start opens the hub map; Codex opens the house overview; Back returns to title. A native 12-zone board widget is implemented in the controller for keyboard/gamepad/mouse zone selection and level travel. |
| Truligon level blockout | `L_TheTouch_Hub` is the central board hub. All 12 zone maps from `DT_TruligonZones.csv` now have saved Unreal level assets under `Content/Truligon/Levels/Zones/`, with names and metadata mapped in `TruligonZoneMapManifest.json` / `.csv`. Each now has an added house-color landmark placed away from the shared hub cluster; full zone-specific traversal, environment art, and encounter mechanics are the next pass. `L_Truligon_Rendezvous` is a preserved traversal reference. |
| Maps | `DefaultLevel`, `LocomotorLevel`, `NPCLevel`, `RagdollLevel`, `LookAtPOI_Level` |

**Key insight:** this is not "extending a game." It is building an MMO that *reuses the sample's animation content*. Gameplay data and a GAS foundation now exist; movement, animation, and server-authoritative multiplayer integration still needs proof.

### Environment findings (verified 2026-10-20)

These were the initial environment findings. The C++ module and gameplay foundation have since been implemented and compile-verified; recheck local build-toolchain assumptions before additional compilation work.

| Finding | Detail | Impact |
| --- | --- | --- |
| Prebuilt binary module | `UnrealEditor-GameAnimationSample.dll` is registered in `UnrealEditor.modules`, but there is no source for it and `.uproject` declares no modules | We **add** a new module alongside it; we are not "converting a Blueprint-only project" |
| Engine association mismatch | `.uproject` says `5.8`; build metadata references `D:\build\++UE5\Sync\LocalInstall`, which **does not exist** on this machine; `HKCU\...\Unreal Engine\Builds` is absent | The project was built against an Epic-internal source build. Local builds may fail until the association is repointed |
| Engines present | `C:\Program Files\Epic Games\UE_5.7` and `UE_5.8` | Launcher engines are available as a fallback target |
| Toolchain | Only `Microsoft Visual Studio\18\BuildTools`; `vswhere` reports no full VS install | UE 5.8 expects a validated MSVC toolchain; VS 18 is newer than UE 5.8 validation. **Compilation is unverified and may fail** |

**Consequence:** Phase 0's movement benchmark requires a working C++ build, so **Phase 0 and Phase 1 are entangled** rather than strictly sequential. A **Phase -1** was therefore added to unblock the toolchain.

---

## Target architecture (recommendation)

**Shape:** social/combat hub MMO with instanced content. **Not** a seamless single open world.

Rationale: 100 simultaneously visible, simulating players in one persistent world is the hardest networking problem in UE. A hub + instance model reaches the 100-player target with far less risk, and is what real MMOs do.

| Layer | Concurrent players | Technique |
| --- | --- | --- |
| Social hub / town | ~100 visible | Relevancy, replication graph, animation LOD, reduced fidelity |
| Open zone | ~30–50 visible | World partition cells + net cull distance |
| Dungeon / raid | 4–20 | Full fidelity — all sample features intact |

**Server model:** UE dedicated server, server-authoritative GAS. Single codebase.

---

## Phase 0 — Resolve the two forks

No production code. This phase exists so later decisions are not re-litigated.

### Tasks

- [ ] **Decide movement stack: Mover vs CharacterMovementComponent**
  - [ ] Build a benchmark level with 100 simulated proxies.
  - [ ] Measure server CPU + bandwidth for each stack at 100 proxies.
  - [ ] Measure client CPU with 100 interpolated remote characters.
  - [ ] Test input latency / reconciliation behaviour under 100ms simulated ping.
  - [ ] Record results in `docs/benchmarks/movement-stack.md`.
  - [ ] Make a final call and document *why*.
- [ ] **Confirm MMO shape and target counts**
  - [ ] Write down players-per-zone-type targets (hub / open zone / instance).
  - [ ] Confirm hub + instanced model is the target (or document the alternative).
- [ ] **Inventory sample content for keep / fork / drop**
  - [ ] Mark each content area as: reuse as-is, wrap in C++, fork for multiplayer, or leave isolated.

### Acceptance criteria

- A written decision exists for the movement stack, backed by measured numbers, not opinion.
- Zone-type player targets are documented as concrete numbers.
- A content triage list exists covering every top-level `Content/` folder.

### Risks

- **Highest-risk decision in the project.** Mover is newer and built for this problem, but less battle-tested at MMO scale. CMC is a known quantity but older. Committing without benchmarks is the most likely way to waste months.
- Deferring this decision into Phase 2 or 3 will corrupt the design of everything that depends on it.

---

## Phase 1 — Make it a real game project

Convert from a Blueprint-only sample into a mixed C++/Blueprint game project, without discarding any sample content.

### Tasks

- [ ] **Add C++ module**
  - [ ] Create `Source/GameAnimationMMO/` with `GameAnimationMMO.Build.cs`, `.h`, `.cpp`.
  - [ ] Add module to `GameAnimationSample1.uproject` (`Modules` array).
  - [ ] Add the movement stack dependency chosen in Phase 0 (Mover or CMC).
  - [ ] Add `GameplayAbilities`, `GameplayTags`, `GameplayTasks` dependencies.
  - [ ] Verify the project compiles and the editor opens with existing content intact.
- [ ] **Establish core class hierarchy**
  - [ ] `AMMOCharacterBase` — replications, ASC holder, movement entry points.
  - [ ] `AMMOPlayerController` — input routing, server-authoritative intents.
  - [ ] `AMMOGameMode` — login, spawn rules, zone/instance selection.
  - [ ] `AMMOGameState` — global zone state, player count, world time.
  - [ ] `AMMOPlayerState` — persistent per-player data, replication.
  - [ ] `UPersistenceSubsystem` (stub) — load/save hooks, no backing store yet.
- [ ] **Reparent existing blueprints**
  - [ ] `SandboxCharacter_Mover` → derives from `AMMOCharacterBase`.
  - [ ] `SandboxCharacter_CMC` → derives from `AMMOCharacterBase`.
  - [ ] `PC_Sandbox`, `GM_Sandbox` → derive from the new controller/game mode.
  - [ ] Confirm all sample animation content still functions after reparenting.
- [ ] **Add baseline networking config to `Config/DefaultEngine.ini`**
  - [ ] Replication driver class.
  - [ ] Per-class net update frequency / priority defaults.
  - [ ] Net cull distance squared defaults.
  - [ ] Dormancy defaults.
  - [ ] `net.MaxRPCPerNetUpdate`, bandwidth budget settings.
- [ ] **Multiplayer correctness pass on input-driven animation**
  - [ ] Audit `S_PlayerInputState`, `E_AnalogStickBehavior`, `S_MoverCustomInputs`.
  - [ ] Ensure remote characters never run local input logic.
  - [ ] Ensure animation states read replicated state, not local-only input.

### Acceptance criteria

- Project builds as a C++ project; editor opens; no sample content is missing or broken.
- Two clients + dedicated server can connect and see each other move.
- Remote characters animate correctly (no input leakage, no desync artifacts).
- Networking baseline config is committed, not left at engine defaults.

### Risks

- Reparenting Blueprints can silently break `Cast` nodes and class filters scattered across sample assets.
- Blueprint-only → mixed C++ is a one-way door; do it before content grows further.

---

## Phase 2 — Gameplay Ability System foundation

Build the combat/progression layer. Server-authoritative by construction.

### Tasks

- [ ] **Attribute sets**
  - [ ] `UMMOAttributeSet_Base` — health, max health, resource, max resource.
  - [ ] Movement-derived attributes fed from the movement stack.
  - [ ] Replication + clamping handled in C++, not Blueprint.
- [ ] **Ability system wiring**
  - [ ] `UAbilitySystemComponent` on `AMMOCharacterBase`.
  - [ ] Owner/avatar setup for both player and AI characters.
  - [ ] Initial abilities granted on login, replication-safe.
- [ ] **Core abilities**
  - [ ] Sprint / walk toggle.
  - [ ] Jump + predict/confirm path.
  - [ ] Crouch, slide.
  - [ ] Dash / dodge with client prediction.
- [ ] **Gameplay effects**
  - [ ] Stat modification effects (damage, heal, resource cost).
  - [ ] Movement-related effects (slows, roots, speed modifiers).
- [ ] **Port sample traversal into GAS**
  - [ ] `AC_TraversalLogic` → traversal ability + montage task.
  - [ ] Traversal choosers (`S_CHT_TraversalMontages_*`) wired into ability activation.
  - [ ] Verify traversal still respects server authority across 2+ clients.
- [ ] **Animation integration**
  - [ ] Gameplay tags drive animation state transitions.
  - [ ] Montage playback routed through ability tasks on both authority and clients.

### Acceptance criteria

- Two clients can fight/affect each other; all outcomes are server-decided.
- Movement abilities feel responsive at 100ms simulated ping (prediction + correction works).
- Traversal (mantle/vault/climb/hurdle) works between clients without desync.
- No ability logic runs authoritatively on a client.

### Risks

- GAS has a steep learning curve; predicting movement abilities correctly is subtle and easy to get wrong.
- The sample's animation data was authored single-player; some montage choices assume no external actors.

---

## Phase 3 — Relevancy and animation LOD *(the phase that makes 100 possible)*

This is the go/no-go gate for the 100-player target.

### Tasks

- [ ] **Animation fidelity tiers**
  - [ ] Define tiers: `Full` → `Simplified` → `Sequence Only` → `Frozen`.
  - [ ] Tier 1 (Full): pose search / motion matching, foot placement control rig, full modifier stacks.
  - [ ] Tier 2 (Simplified): reduced pose search frequency or nearest-N only.
  - [ ] Tier 3 (Sequence Only): no motion matching, driven blend/sequence playback.
  - [ ] Tier 4 (Frozen): update at very low rate, no IK, no foley.
  - [ ] Map tiers to distance thresholds, tunable via data asset.
- [ ] **Cheap animation variants**
  - [ ] Fallback for `CR_Biped_FootPlacement` (foot placement off below tier 1).
  - [ ] Fallback for the `Blueprints/AnimModifiers/` stacks.
  - [ ] Fallback for motion matching pose search node.
  - [ ] Fallback for `ControlStyle` variants.
- [ ] **Relevancy**
  - [ ] Replication graph nodes for always-relevant / distance / dormant buckets.
  - [ ] Per-class net cull distance tuning.
  - [ ] Dormancy for idle/distant characters.
  - [ ] Priority scaling so combat-relevant actors win bandwidth.
- [ ] **Server simulation LOD**
  - [ ] Tick-rate reduction for distant NPCs and players.
  - [ ] StateTree / AI cost scaling by distance.
- [ ] **Capacity test**
  - [ ] Bot harness driving 100 characters simultaneously.
  - [ ] Measure server frame time, bandwidth per client, client frame time.
  - [ ] Tune tier thresholds until budget holds.

### Acceptance criteria

- **100 characters simulated and rendered on a client within frame budget.**
- Server holds its frame budget with 100 players in one zone.
- Bandwidth per client stays within target under peak conditions.
- Nearest characters still look and animate correctly — degradation must be imperceptible up close.

### Risks

- Motion matching posesearch at 100 characters is the technical crux of the whole project. If tiering cannot reduce cost enough, the player target must drop.
- Relevancy rules that are too aggressive produce visible pop-in and gameplay problems (players can't see attacks).
- This phase may reveal that Phase 0's movement choice was wrong. That is why Phase 0 exists.

---

## Phase 4 — MMO services *(parallelizable, ongoing)*

- [ ] Character persistence (durable storage, atomic saves, crash safety).
- [ ] Accounts and login flow.
- [ ] Inventory, equipment, and item database.
- [ ] Economy and currency, with server-side validation.
- [ ] Chat: channels, whisper, party, guild, moderation.
- [ ] Party, group, and raid formation.
- [ ] Nameplates, target markers, and social UI.
- [ ] Group finder / LFG matchmaking.
- [ ] Decide in-house vs external backend service; document the decision.

**Acceptance criteria:** a player can log out, log in on another machine, and find their character, items, and progression intact.

**Risks:** persistence bugs cause data loss and are unforgiving. Chat and economy are the primary attack surfaces for cheats and abuse — both must be server-validated, never client-trusted.

---

## Phase 5 — Zones and instancing

- [ ] Hub ↔ instance travel and hand-off.
- [ ] Instance creation, matchmaking, and lifecycle management.
- [ ] World partition configuration per zone type.
- [ ] Cross-zone party and social continuity.
- [ ] Zone-specific player caps enforced server-side.

**Acceptance criteria:** players can form a party, enter an instance from the hub, complete content, and return with state intact.

**Risks:** instance hand-off is a classic source of duplication and lost-state bugs. Zone caps must be enforced by the server, never requested by the client.

---

## Cross-cutting concerns

- **Security:** never trust client input for position, damage, inventory, or currency. Every one of these must be server-validated.
- **Anti-cheat:** speed/teleport validation against the movement stack; server-side hit validation.
- **Observability:** server metrics (frame time, player count, bandwidth), structured logs, and client perf telemetry from day one.
- **Automated testing:** the bot harness from Phase 3 becomes the regression suite for every later phase.
- **Content pipeline:** establish conventions now so new content scales — naming, net frequencies, animation tier tagging.

---

## Content triage (baseline recommendation)

| Content | Disposition |
| --- | --- |
| Motion matching data (`UEFN_Mannequin/Animations/MotionMatchingData`) | **Reuse** — but gate behind animation tiers |
| Traversal animations (`Mantle`, `Climb`, `Vault`, `Hurdle`, `Catch`) | **Reuse** — wrap in GAS abilities (Phase 2) |
| Ragdoll (`E_RagdollInjuryState`, ragdoll movement mode) | **Reuse** |
| Smart objects + StateTrees | **Reuse** — scale AI cost by distance (Phase 3) |
| Camera rigs (`Blueprints/Cameras/`) | **Reuse** |
| Foley MetaSounds (`Audio/Foley/`) | **Reuse** — disable at low animation tiers |
| Foot placement control rig | **Reuse + fork** — needs a cheap fallback |
| `Blueprints/AnimModifiers/` stacks | **Reuse + fork** — needs cheap fallbacks |
| `SandboxCharacter_Mover` / `_CMC` | **Wrap** — reparent to `AMMOCharacterBase` |
| `S_PlayerInputState`, `E_AnalogStickBehavior` | **Fork** — remote players must not run input logic |
| `IsolatedExamples/` (Locomotor, LookAtPOI) | **Leave isolated** — reference only, never in shipping path |
| `Characters/Paragon`, `MetaHumans`, `Echo` | **Reuse** — art/content, no architectural impact |

---

## Immediate next steps

1. Run a PIE controls pass on keyboard/gamepad and resolve any possession, movement, or ability activation issues.
2. Wire title startup and hub flow, then build a 12-zone selection screen from `DT_TruligonZones.csv` and route each selection to its map.
3. Build distinct traversal, encounter, and environment passes for the 12 zone blockouts.
4. Continue the Phase 0 Mover-vs-CMC benchmark and dedicated-server multiplayer validation.

### Controls integration

The sample `SandboxCharacter_Mover` owns `/Game/Input/IMC_Sandbox` and handles movement, camera, sprint, walk, jump, crouch, aim, interact, and traversal. `PC_Sandbox` now derives from `ATruligonPlayerController`; `GM_Sandbox` now derives from `ATruligonGameMode` and uses the Truligon PlayerState/GameState/controller while retaining `SandboxCharacter_Mover`. The controller initializes the PlayerState ASC against the possessed Mover pawn. Keyboard ability slots 1–4 resolve against the selected character kit, skipping passive and reaction abilities. See `docs/controls.md` for the current mapping. Source compiled as a Live Coding patch. A PIE keyboard/gamepad pass is still pending.

Ability hotkeys resolve slots 1–4 against the selected character's active/fracture abilities and exclude passive/reaction abilities. Keyboard uses number-row keys; gamepad uses the D-pad. The controller source has compiled as a Live Coding patch and `PC_Sandbox` is connected to it; a PIE pass is still needed to confirm movement, possession, and ability activation end to end.

---
## Change log

| Date | Change |
| --- | --- |
| 2026-10-20 | Initial roadmap created. Phase 0 in progress. |
| 2026-10-20 | Phase 1 scaffolding: `Source/` tree, `GameAnimationSample.Build.cs`, targets, `Modules` array in `.uproject`, GameplayAbilities plugin enabled. |
| 2026-10-20 | Content layer ported to C++ and **compile-verified** (see below): 12 enums, 52 characters, 12 zones, 7 quests, 20 abilities, 3 relics, 2 traits. |
| 2026-10-20 | GAS foundation landed and **compile-verified**: `ATruligonPlayerState` (ASC owner), `ATruligonGameState` (world/quest authority), `UTruligonAttributeSet` (7 replicated attributes), `UTruligonAbilitySystemComponent`, native gameplay tags. |
| 2026-10-20 | Renamed the relic static-data manager `FTruligonRelicData` -> `FTruligonRelicTable` after a compile error: it collided with the `FTruligonRelicData` row struct. |
| 2026-10-20 | Ability registration reworked: `FGameplayAbilitySpec` requires a `UGameplayAbility` class, not an `FName`. Abilities are now tracked by id on the ASC (`RegisteredAbilityIds`) until concrete ability classes are authored. |
| 2026-10-20 | **All 20 concrete `UGameplayAbility` classes authored and compile-verified**, bound to their static-table rows. Added `UTruligonFractureAbility` (advances the Time Logic ladder, registers the fracture on PlayerState and GameState) and `FTruligonAbilityRegistry` (id -> class map with an `ValidateAllAbilitiesMapped` self-check). |
| 2026-10-20 | **Effects layer**: `UTruligonInstantEffect`, a single SetByCaller-magnitude instant effect that serves every flat damage/heal/buff (no per-ability effect assets). Abilities now apply their static-table `EffectMagnitude` (`kal7_memory_wave` +3, `diego_entropy_glitch` 5). Added `Effect.Magnitude` / `Effect.Attribute` / `Effect.Duration` SetByCaller tags. |
| 2026-10-21 | **Relic system**: `UTruligonInventoryComponent` on the PlayerState. Add/remove relics by id, applies their stat modifiers to the attribute set with an explicit ±1 delta so removal is exact (no drift from clamping). Replicates for clients and re-applies locally on late join. |
| 2026-10-21 | **Relic mechanics live**: fracture immunity (`relic_patlolli_seed`) now actually suppresses fractures in `UTruligonFractureAbility`; ability-enhance lists are surfaced from relic to ability bar. |
| 2026-10-21 | **Trait system**: `FTruligonTraits` evaluator — checks fracture count, Time Logic rung (by ladder position, not enum value), required character and required relic. Unlockable traits referenced only by memory tag stay locked (fail closed). `ATruligonPlayerState::RefreshTraits()` runs on fracture; unlocked traits replicate. |
| 2026-10-21 | **DataTable CSVs generated from the C++ tables** (single source of truth, no hand-maintained drift): `FTruligonCsvExporter` + `Truligon.ExportCsv` console command writes `Content/Truligon/Data/DT_Truligon{Characters,Abilities,Relics,Traits,Zones,Quests}.csv`. Verified row counts: 52 / 20 / 3 / 2 / 12 / 7. |
| 2026-10-21 | Imported DataTable assets are present for all six tables under `Content/Truligon/Data/`. |
| 2026-10-22 | Added and compile-verified `WBP_Truligon_TitleScreen` and `WBP_Truligon_HouseSelect`; built `L_TheTouch_Hub` from sample assets. Created and saved all 12 named zone map assets from the hub blockout, mapped to source zone rows in `TruligonZoneMapManifest.json` / `.csv`. Added a named house-color landmark to each zone map. Distinct traversal environments, board selection, and title startup flow remain pending. |
| 2026-10-23 | Added a native 4×3 zone-selection overlay backed by the 12 zone definitions, keyboard Tab/M to toggle, Escape to close, and gamepad View controls, with initial focus on the first zone, and level travel/return-to-hub actions. Added `MapAssetPath` to the zone row and CSV export. Live Coding build succeeded. In the current editor session, the existing native row schema remains stale, so the DataTable asset still needs reimport after a full editor restart; runtime/PIE is not verified. |
| 2026-10-22 | Integrated the Truligon control framework into the sample chain: `PC_Sandbox` derives from `ATruligonPlayerController`; `GM_Sandbox` derives from `ATruligonGameMode` and its defaults use `ATruligonPlayerState`, `ATruligonGameState`, `PC_Sandbox`, and the existing `SandboxCharacter_Mover`. All 13 hub/zone maps use `GM_Sandbox`. Controller initializes the PlayerState ASC on possession; keyboard 1–4 and gamepad D-pad activate character-kit slots. Cooldown GameplayEffects use each ability row's cooldown. Both Blueprints compile and save. PIE controls verification remains pending. |

### Verified build status (2026-10-21)

`UnrealEditor-GameAnimationSample.dll` grew **46,592 -> ~638 KB** across the
session. Verified present in the linked binary: `ETruligonHouse`,
`ETruligonTimeLogic`, `FTruligonCharacter`, `FTruligonZone`, `FTruligonQuest`,
`FTruligonAbility`, `FTruligonRelicData`, `FTruligonTrait`,
`ATruligonPlayerState`, `ATruligonGameState`, `UTruligonAttributeSet`,
`UTruligonAbilitySystemComponent`, `UTruligonInventoryComponent`,
`UTruligonFractureAbility`, `UTruligonInstantEffect`, `FTruligonTraitProgress`,
`TruligonAbilityRegistry`, the 20 concrete ability classes, and all 20 ability
row ids (checked in both ASCII and UTF-16).

The module also **loads headless without errors** (`UnrealEditor-Cmd -run=pythonscript`,
`Success - 0 error(s), 0 warning(s)`), which exercises module init and the
console-command registration.

**Not yet done:** memory-tag trait gating remains unimplemented. No dedicated-server or multi-client proof exists. Phase 0 movement benchmark is unresolved. `DefaultLevel` uses `GM_Sandbox`, based on `ATruligonGameMode`, with Truligon state classes and `PC_Sandbox`; the sample Mover pawn remains the default. The 12 named zone level assets, front-end screen assets, and hub blockout exist. Each zone map now has a named, house-color landmark beyond the shared hub blockout. Distinct traversal routes, environmental set dressing, playable zone objectives, and title startup remain pending. The updated zone DataTable row schema and map paths need a full editor restart and reimport before the asset reflects the native struct addition. A PIE pass on keyboard/gamepad controls remains pending.

