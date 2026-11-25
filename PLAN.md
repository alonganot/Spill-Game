# PLAN.md — Spill Development Roadmap

## Current Focus
**Milestone 5 done; Milestone 6 next (Capacitor & Mobile).** A full 5-fight run with rewards, a dice shop, pixel-art sprites, and beat-by-beat combat playback is playable via `npm run dev` (`src/ui/RunScreen.tsx`, driven by `useRun` and `src/engine/run.ts`). Balance tuning is deferred to Milestone 7.

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

### Milestone 4: Graphics & Juice ✅
- [x] Pixel-art enemy sprites drawn in code: pixel grids in `src/data/sprites.ts`, rendered crisply as SVG (`src/ui/PixelSprite.tsx`), one per enemy (Puddle Slime, Thorn Sprite, Rust Golem, Ink Blob, The Blot), plus a small hero sprite (idle/cast/hit poses).
- [x] Step-by-step event playback: each action's events play as timed beats (HP/block/pool step per beat), input locked meanwhile, tap to skip (`src/ui/timeline.ts`, `src/ui/usePlayback.ts`).
- [x] Simple sprite animation: idle bob and enemy blinks, hit flash/shake when damaged, attack lunge on the enemy's turn, hero cast pose with a paint bolt to the enemy, defeat fade (`src/ui/Fighters.tsx`).
- [x] Dice roll animation: a pixel dice tray (`src/ui/PixelDie.tsx`) beside End turn; dice tumble through their own faces and land on the rolled face, new pool chips pop in as each die lands, and overflow dice grey out. Hover or tap a die to see all its faces.
- [x] Spellbook and craftable-spell hints: the battle screen lists only ready spells; a 📖 Spellbook sheet lists every spell (with an "Unavailable only" toggle). Spells payable after mixing are marked (⚗ N mixes); hovering one highlights the chips to mix, tapping it selects them for the Mix button (`src/ui/Spellbook.tsx`, `findMixPlan` in `src/engine/mixing.ts`).
- [x] Battle log behind a "📜 Battle log" button (hover or tap) with the whole fight's history, so the layout never shifts (`src/ui/BattleLog.tsx`).
- [x] Combat feedback: floating damage/block numbers, status tick visuals (poison/burn), a block glow, and a mix "splash" when two colors combine (`src/ui/fx.ts`, `src/ui/fx.css`).
- [x] All animations stay UI-only (`src/ui/`), driven by engine events. The only engine addition is the pure `findMixPlan` helper; combat rules are unchanged.

### Milestone 5: Menus & Screen Flow ✅
- [x] Main menu: a pixel title scene (`TITLE_SPRITE` logo, the hero facing a slime), New run (asks before abandoning a run in progress), Continue (only while a run is in progress this session), Settings (`src/ui/MainMenu.tsx`).
- [x] Settings (`src/ui/SettingsScreen.tsx`): the run's seed with a Seeded/Random tag and Copy; Restart run (same seed, fight 1) and Abandon run, each with a confirm; start a seeded run from a typed seed (1–9 digits, `parseSeed` in `src/ui/seed.ts`). The run-end screen also shows the seed, with Replay seed and Main menu.
- [x] In-run ☰ button opens a pause panel over the run (Resume, Main menu); it works mid-animation.
- [x] Screen-flow stack in the UI layer (`src/ui/screenFlow.ts`), with one back action (Escape now, the Android back button in M6). Open layers (Spellbook, battle log, dialogs) close first. The run lives in `App` and its screen stays mounted while hidden, so Continue resumes a battle exactly where it was.

### Milestone 6: Capacitor & Mobile
- [ ] Add Capacitor and generate the Android project. Generate the iOS project too, but it can only be built on a Mac.
- [ ] Save the run in progress on the device (seed plus action list, replayed on load) so Continue survives a reload or app kill.
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