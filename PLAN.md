# PLAN.md — Spill Development Roadmap

## Current Focus
**Milestone 7 in progress (V1 Wrap-up).** The longer, harder run with multi-enemy fights is in; the Windows app and the final sweep are next. V1 is a PC game: it should fill a desktop screen and stay playable on a phone-sized window; mobile app builds are out of V1. A full 15-fight run (3 acts, multi-enemy fights from fight 4) with a main menu, seeded runs, rewards, a dice shop, pixel-art sprites, and beat-by-beat combat playback is playable via `npm run dev` (`src/ui/RunScreen.tsx`, driven by `useRun` and `src/engine/run.ts`).

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
- [x] Screen-flow stack in the UI layer (`src/ui/screenFlow.ts`), with one back action (Escape, or the ← Back button). Open layers (Spellbook, battle log, dialogs) close first. The run lives in `App` and its screen stays mounted while hidden, so Continue resumes a battle exactly where it was.

### Milestone 6: Desktop & Responsive ✅
- [x] Desktop battle layout (900px and wider): a wide arena with the hero and enemy facing each other at one pixel scale (10×, or 13× on 1080p and up), a side panel with the color pool and spells, and the dice tray and End turn along the bottom, filling the window with no scrolling. The enemy lunges sideways at the hero; the log opens upward and the Spellbook is a wide panel. Phones keep the single column (`useDesktop` in `src/ui/useMediaQuery.ts`).
- [x] Drag-and-drop workbench (phones and PC): colors are pixel paint drops; drag two into a mixing bowl, then drag the new color out to the pool or straight onto a spell (or tap it to keep it), and drag colors onto a spell's cost slots, then Cast; tap or Enter to lift a color and place it, or tap an empty slot to fill it from the pool. Craftable spells (payable now, or after mixing with ⚗) are listed; the rest stay in the Spellbook. On PC the side panel is the workbench: your dice (rolled face big, all six faces small), the bowl, craftable spells, a 5×2 pool, and End turn (`src/ui/staging.ts`, `useDrag.ts`, `workbench.tsx`, `DiceRack.tsx`, `PaintDrop.tsx`).
- [x] Responsive main menu, reward, shop, dice editor, Settings, and run-end screens on PC: full-width top bar, content centered (rewards as three cards, the shop in two columns, short screens centered vertically), a doubled title scene, and paint-drop dice faces everywhere.
- [x] Tooltips (hover, keyboard focus, or tap on touch screens) for spell names, poison/burn/block badges, the enemy intent, and PC dice, using the battle's real numbers (`Tip` in `src/ui/Tooltip.tsx`, texts in `src/ui/format.ts`).
- [x] Save the run in progress in the browser (`src/ui/runSave.ts`): the seed plus every successful action, written after each action to localStorage key `spill.run.v1` and replayed on load, so Continue survives a reload. Abandoning or finishing a run clears it; a corrupt or outdated save is ignored.

### Milestone 7: V1 Wrap-up
- [x] Multi-enemy fights (engine): `BattleConfig.enemies` / `BattleState.enemies`, each enemy with its own intents; spells take a target, area spells hit every living enemy; new enemy intents (multi-hit attacks, poison and burn on the player); victory once every enemy is down.
- [x] Run flow: a free reward and then a shop after every fight. Saves moved to `spill.run.v2`.
- [x] Battle screen with 1–3 enemies: a row of enemy cards, click/tap/Enter to target, per-enemy playback, floats, bolts, log lines, and tooltips.
- [x] Content: 7 new enemies with their own sprites (Drip, Mold Puff, Cinder Imp, Gnat Swarm, Varnish Shell, Smear Knight, Grand Smudge); 15 stages in 3 acts (`src/data/run.ts`, act 3 via `toughened`); area spells Splash and Miasma.
- [x] Balance pass: leaner economy for 15 stops. The greedy bot (`src/engine/testBot.ts`: targets the weakest enemy, prefers area spells, mixes, blocks) wins about 11% of 200 seeded runs, with losses spread over fights 9–15 (`src/engine/balance.sim.test.ts`, run with `npm run test:balance`; it asserts a 5–35% band).
- [ ] Windows desktop app with Electron: the web build in a window with an app icon, title, and minimum size, plus a versioned installer (electron-builder, NSIS).
- [ ] Final bug sweep and docs update.

## Explicitly Out of Scope for V1
- Accounts, cloud saves, leaderboards, or backend services.
- Ads, IAP, or complex economy systems (the simple gold dice shop in Milestone 3 is in scope).
- Multiplayer or heavy custom shaders.
- Sound effects and music.
- Mobile app builds (Capacitor, Android/iOS). The web build stays mobile-friendly.