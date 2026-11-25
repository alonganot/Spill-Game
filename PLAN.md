# PLAN.md — Spill Development Roadmap

## Current Focus
**Milestone 3 done; Milestone 4 next (Polish, Juice & Mobile Packaging).** A full 5-fight run with rewards and a dice shop is playable via `npm run dev` (`src/ui/RunScreen.tsx`, driven by `useRun` and `src/engine/run.ts`).
Balance notes for M4: a simple greedy bot wins about 193 of 200 seeded runs (all its losses are at the boss), so the run is too easy for skilled play, though a manual playthrough finished the boss on 1 HP. With 5–6 dice the shop screen will need scrolling on small phones.

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

### Milestone 3: Roguelite Run Loop ✅
- [x] Support multi-encounter progression across 5 stages (normal fights, an elite, and a boss), with HP carrying over between fights.
- [x] Earn gold from won fights; after non-shop fights, pick 1 of 3 free rewards (gold, heal, free face repaint).
- [x] Add a simple dice shop at set stops: repaint a die face, heal, +1 dice cap (max 6), and 2 random themed dice for sale.
- [x] Start runs with 2 Standard dice and a dice cap of 3.
- [x] Handle full run victory, defeat, and new run reset.

### Milestone 4: Polish, Juice & Mobile Packaging
- [ ] Balance tuning pass using centralized config files in `src/data/`.
- [ ] Add mobile feel/juice (animations, sound effects, haptics via `src/mobile/`).
- [ ] Set up Capacitor for Android/iOS builds and test on device/emulator.

## Explicitly Out of Scope for V1
- Accounts, cloud saves, leaderboards, or backend services.
- Ads, IAP, or complex economy systems (the simple gold dice shop in Milestone 3 is in scope).
- Multiplayer or heavy custom shaders.