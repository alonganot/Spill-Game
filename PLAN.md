# PLAN.md — Spill Development Roadmap

## Current Focus
**Milestone 2 done; Milestone 3 next (Roguelite Run Loop).** The single-battle prototype is playable via `npm run dev` (battle screen in `src/ui/BattleScreen.tsx`, driven by `useBattle`). Early playtest note: the starter fight against Ink Blob is easy (a simple bot wins by turn 4 with most HP left), so expect tuning in Milestone 4.

## Milestones

### Milestone 0: Project & Test Setup ✅
- [x] Initialize Vite + React + TypeScript project with Vitest configured.
- [x] Create directory structure (`src/engine/`, `src/data/`, `src/ui/`, `src/mobile/`).
- [x] Add initial data schemas/configs for base colors (`red`, `blue`, `green`), secondary mixes (`purple`, `cyan`, `orange`), basic attacks/combos, and status rules (`poison`, `burn`).

### Milestone 1: Headless Combat Engine (Vertical Slice — Logic) ✅
- [x] Model dice faces, roll results (with injectable RNG for deterministic tests), and persistent turn/carry-over Color Pool (respecting `MAX_POOL_SIZE`).
- [x] Implement color mixing rules (consuming selected colors from the pool and adding the resulting color).
- [x] Implement color combining/triggering rules for attacks and effects (damage, block/shield, poison, burn, combos).
- [x] Implement turn order: start-of-turn dice roll -> player mixes/attacks -> end turn -> status resolution (`poison` and `burn`) -> enemy action -> win/loss check.
- [x] Cover rules, edge cases, color consumption, carry-over, status ticks, and invalid actions with Vitest unit tests.

### Milestone 2: Minimal Mobile Battle UI (Playable Prototype) ✅
- [x] Build mobile-first battle screen (portrait layout, clear touch targets).
- [x] Wire dice rolling, color selection, mixing, attack activation, enemy intent/HP/block/status display, and end turn.
- [x] Add quick battle restart / victory / defeat feedback to test game feel and clarity.

### Milestone 3: Roguelite Run Loop
- [ ] Support multi-encounter progression across stages (including a boss/elite encounter).
- [ ] Add post-battle reward choices (e.g., new die, upgraded die face, or new power/color option).
- [ ] Handle full run victory, defeat, and new run reset.

### Milestone 4: Polish, Juice & Mobile Packaging
- [ ] Balance tuning pass using centralized config files in `src/data/`.
- [ ] Add mobile feel/juice (animations, sound effects, haptics via `src/mobile/`).
- [ ] Set up Capacitor for Android/iOS builds and test on device/emulator.

## Explicitly Out of Scope for V1
- Accounts, cloud saves, leaderboards, or backend services.
- Ads, IAP, or complex economy/shop systems.
- Multiplayer or heavy custom shaders.