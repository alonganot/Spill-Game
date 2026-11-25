# PLAN.md — Spill Development Roadmap

## Current Focus
**Milestone 3 done; Milestone 4 next (Graphics & Juice).** A full 5-fight run with rewards and a dice shop is playable via `npm run dev` (`src/ui/RunScreen.tsx`, driven by `useRun` and `src/engine/run.ts`). Balance tuning is deferred to Milestone 7.

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

### Milestone 4: Graphics & Juice
- [x] Pixel-art enemy sprites drawn in code: pixel grids in `src/data/sprites.ts`, rendered crisply as SVG (`src/ui/PixelSprite.tsx`), one per enemy (Puddle Slime, Thorn Sprite, Rust Golem, Ink Blob, The Blot), plus a small hero sprite (idle/cast/hit poses).
- [x] Step-by-step event playback: each action's events play as timed beats (HP/block/pool step per beat), input locked meanwhile, tap to skip (`src/ui/timeline.ts`, `src/ui/usePlayback.ts`).
- [ ] Simple sprite animation: idle bob, hit flash/shake when damaged, attack lunge on the enemy's turn, defeat fade.
- [x] Dice roll animation: a pixel dice tray (`src/ui/PixelDie.tsx`) beside End turn; dice tumble through their own faces and land on the rolled face, new pool chips pop in as each die lands, and overflow dice grey out. Hover or tap a die to see all its faces.
- [x] Craftable-spell hints: spells the pool could pay after mixing are marked (⚗ N mixes); hovering one highlights the chips to mix, tapping it selects them for the Mix button (`findMixPlan` in `src/engine/mixing.ts`).
- [ ] Combat feedback: floating damage/block numbers, status tick visuals (poison/burn), and a mix "splash" when two colors combine.
- [ ] All animations stay UI-only (`src/ui/`), driven by engine events; the engine is unchanged.

### Milestone 5: Menus & Screen Flow
- [ ] Main menu: title, New run, Continue (only while a run is in progress this session), Settings.
- [ ] Settings: enter or show the run seed, restart the run, abandon the run (with confirm).
- [ ] In-run pause/menu button that reaches Settings and returns to the run.
- [ ] Screen-flow state in the UI layer, with a back action that works everywhere.

### Milestone 6: Capacitor & Mobile
- [ ] Add Capacitor and generate the Android project. Generate the iOS project too, but it can only be built on a Mac.
- [ ] `src/mobile/` adapters: app lifecycle (pause/resume, Android back button → menu/back) and optional haptics on hits/taps, behind a small interface with web no-op fallbacks.
- [ ] Safe-area and status-bar handling; portrait lock.
- [ ] Web build stays playable (`npm run dev` / `npm run build`); test on an Android emulator or device.

### Milestone 7: V1 Wrap-up
- [ ] Balance tuning pass in `src/data/`, checked with the run simulation test. A simple greedy bot currently wins about 193 of 200 seeded runs (all its losses are at the boss), so the run is too easy for skilled play; aim for a meaningfully harder elite and boss.
- [ ] Store-ready build: app icon, splash screen, app id and versioning, signed Android release build (AAB), and notes for building iOS on a Mac.
- [ ] Final bug sweep and docs update.

## Explicitly Out of Scope for V1
- Accounts, cloud saves, leaderboards, or backend services.
- Ads, IAP, or complex economy systems (the simple gold dice shop in Milestone 3 is in scope).
- Multiplayer or heavy custom shaders.
- Sound effects and music.