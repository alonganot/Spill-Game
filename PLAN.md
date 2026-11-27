# PLAN.md — Spill Development Roadmap

## Current Focus
**Milestone 7 done (V1 Wrap-up); Milestone 8 (Expanded Color Palette: White, Pink & Black) is next, then Milestone 9 (Cosmic Paint Workshop UI overhaul, `DESIGN.md`).** V1 is a PC game: it fills a desktop screen, stays playable on a phone-sized window, and ships as a Windows app (Electron, `npm run dist:win` builds `release/Spill-Setup-<version>.exe`); mobile app builds are out of V1. A full 15-fight run (3 acts, multi-enemy fights from fight 4) with a main menu, seeded runs, rewards, a dice shop, pixel-art sprites, and beat-by-beat combat playback is playable via `npm run dev` (`src/ui/RunScreen.tsx`, driven by `useRun` and `src/engine/run.ts`).

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

### Milestone 7: V1 Wrap-up ✅
- [x] Multi-enemy fights (engine): `BattleConfig.enemies` / `BattleState.enemies`, each enemy with its own intents; spells take a target, area spells hit every living enemy; new enemy intents (multi-hit attacks, poison and burn on the player); victory once every enemy is down.
- [x] Run flow: a free reward and then a shop after every fight. Saves moved to `spill.run.v2`.
- [x] Battle screen with 1–3 enemies: a row of enemy cards, click/tap/Enter to target, per-enemy playback, floats, bolts, log lines, and tooltips.
- [x] Content: 7 new enemies with their own sprites (Drip, Mold Puff, Cinder Imp, Gnat Swarm, Varnish Shell, Smear Knight, Grand Smudge); 15 stages in 3 acts (`src/data/run.ts`, act 3 via `toughened`); area spells Splash and Miasma.
- [x] Balance pass: leaner economy for 15 stops. The greedy bot (`src/engine/testBot.ts`: targets the weakest enemy, prefers area spells, mixes, blocks) wins about 11% of 200 seeded runs, with losses spread over fights 9–15 (`src/engine/balance.sim.test.ts`, run with `npm run test:balance`; it asserts a 5–35% band).
- [x] Windows desktop app with Electron (`electron/`, outside `src/`): the Vite build in a "Spill" window with the hero as the app icon (`electron/icon.png`, drawn by `npm run icon`), a 960×640 minimum size (the desktop layout needs 900px), opened maximized, no menu bar, one instance at a time. The build is served from `app://spill/`, a stable origin, so the run save in localStorage (`spill.run.v2`) survives restarts. `npm run electron:dev` runs it against the Vite dev server; `npm run dist:win` builds a versioned NSIS installer (electron-builder) into `release/`. The package version is 1.0.0.
- [x] Final bug sweep and docs update: tests, typecheck, and build pass; played on desktop, a phone-sized window, and in Electron. Fixed: after a reload, Continue showed the battle's dice as "not rolled yet" (the save replay now recovers the fight's latest roll, `replayRun` in `src/ui/runSave.ts`, with tests); on a short window (or with many dice) the PC side panel cut off its top and bottom with no way to scroll (it now scrolls when it doesn't fit).

### Post-V1: In-game updates (Windows app) ✅
- [x] The installed game checks GitHub Releases (`alonganot/Spill-Game`) on launch with `electron-updater`. A newer version shows a notice on the main menu ("Update available: vX"); clicking **Update** downloads it with progress, installs silently, and restarts the game. A failed download offers Retry; a failed check (offline) shows nothing. The save is kept. Browser play is unaffected.
- [x] Electron side: `electron/main.cjs` (updater, IPC) and `electron/preload.cjs` (the `window.spillDesktop` bridge). Game side, no Electron imports: `src/desktop/updates.ts` (types and bridge lookup), `useAppUpdate`, `UpdateNotice` in `MainMenu`, `describeUpdate` in `src/ui/format.ts`.
- [x] Automatic releases: every push to `main` runs `.github/workflows/release.yml`, which picks patch/minor/major from the change (`scripts/release-version.mjs`, rules in `CLAUDE.md`), tests, tags `vX.Y.Z`, and publishes the installer to GitHub Releases. The main menu shows the game's version in the bottom-left corner.
- [x] Settings → Display: Windowed / Fullscreen. The Windows app switches its window, remembers the choice for the next launch (`display.json` in the app data), and F11 toggles it; a browser uses the Fullscreen API for the page (hidden where unsupported). `src/desktop/display.ts`, `useFullScreen`. `SPILL_UPDATE_URL` points an installed game at a local folder of builds for testing. Version 1.0.1 is the first release; players on 1.0.0 install it by hand once.

### Milestone 8: Expanded Color Palette — White, Pink & Black
Add two base colors (White: purity, Black: shadow/curse), five new mixes (Pink, Grey, Crimson, Blight, Frost), in-combat Heal and Cleanse, three enemy statuses (Curse, Silence with 1-turn immunity, Chill), 12 new spells, and three themed shop dice. Rules and timing are in `RULES.md` §2–§4. Starter dice stay Red/Blue/Green. Each task ships on its own and the game stays playable after it.

New spells (`src/data/attacks.ts`; numbers are starting values for the balance pass):

| Spell | Cost | Effect |
|---|---|---|
| Purify | White | Cleanse all Poison and Burn, Block 3 |
| Aegis | White ×2 | Block 12, or 16 if the player has no Poison or Burn |
| Radiant Burst | White + Red | 8 damage to all enemies, cleanse 1 Poison and 1 Burn stack |
| Mend | Pink | Heal 5 |
| Rejuvenate | Pink + Green | Heal 4, Block 6 |
| Blood Bloom | Pink + Red | 10 damage, Heal 4 |
| Hex | Black | Curse the target |
| Hush | Black + Blue | Silence the target |
| Soul Siphon | Crimson | 7 damage, Heal 3 |
| Eclipse | Grey | Silence the target, Block 8 |
| Plague Burst | Blight | 2 Poison on the target, then double its Poison |
| Frostbite | Frost | 5 damage, Chill the target |

New shop dice (starting faces and prices, tuned in Task 4): **Cleric** (White ×3, Red ×2, Blue), **Occult** (Black ×3, Green ×2, Red), **Monochrome** (White ×3, Black ×3).

- [x] **Task 1, Data & Types** (`src/engine/types.ts`, `src/data/colors.ts`, `attacks.ts`, `balance.ts`, `dice.ts`): `white`/`black` in `BaseColor` and `BASE_COLORS`, `pink`/`grey`/`crimson`/`blight`/`frost` in `SecondaryColor`; the 5 new recipes as `PALETTE_RECIPES`; new `Effect` types `heal`, `cleanse` (optional `stacks` per status), `curse`, `silence`, `chill`, `multiplyPoison`, and `block.cleanAmount` for Aegis; `curseBonus: 3`, `chillMultiplier: 0.5` in `STATUS_CONFIG`; the 12 spells as `PALETTE_ATTACKS`; Cleric/Occult/Monochrome in `DICE` and `PALETTE_SHOP_DICE`; `REPAINT_COLORS` (still Red/Blue/Green) drives the repaint picker. Defined but **not wired into play**: `applyEffect` treats the new effects as no-ops, and the game plays exactly as before. Placeholder paints for the 7 colors in `COLOR_HEX`, `COLOR_LABEL`, and the drop/die sprite sheets; spell texts for the new effects in `src/ui/format.ts`. Data-shape tests in `src/data/colors.test.ts`.
- [x] **Task 2, Headless Combat Engine** (`src/engine/attacks.ts`, `battle.ts`, `statuses.ts`, `types.ts`, `src/data/`): the new content is in play: all 8 recipes in `MIX_RECIPES`, the 12 spells in `STARTING_ATTACKS` (23 in all), the Cleric/Occult/Monochrome dice in `SHOP_DICE`, and repaint (shop and reward) offers all 5 base colors. Heal (capped at max HP) and Cleanse go to the player; Aegis's `cleanAmount` applies when the player has no Poison or Burn; Plague Burst multiplies Poison. Enemy flags `cursed`, `silenced`, `silenceImmune`, `chilled` live on `EnemyState` (the player's `Statuses` is unchanged) and start false every fight: Curse adds `curseBonus` to each hit and each Poison/Burn tick (`resolveStatuses` takes a `bonus`), then clears after the status step; a Silenced enemy skips its action (its Block still expires, its intent still advances) and turns immune until it really acts; Chill scales each attack hit (`attackHitDamage`) and clears after the next real action. New events: `healed`, `cleansed`, `silenceResisted`, `enemySkipped`, and `statusApplied` with `curse`/`silence`/`chill`; the battle log, playback beats, and timeline handle them (visuals in Task 3). Tests in `src/engine/palette.test.ts`; repaint to White/Black in `run.test.ts`. Saves moved to `spill.run.v3` (v2 saves are dropped), so this ships as a **major** release. The balance simulation still lands in its 5–35% band with the bot unchanged.
- [x] **Task 3, UI & Visuals** (`src/ui/`, `DESIGN.md`): final paints for the 7 new colors as CSS tokens (`--white` … `--frost`) and in `COLOR_HEX`, with chip/dot classes; Black paint gets a light rim (`--black-rim`) on drops and chips so it reads on the dark background. Enemy badges for Curse (`🌑 +3`), Silenced, Immune, and Chill, with tooltips (`curseTip`, `silenceTip`, `silenceImmuneTip`, `chillTip`); badges wrap. A Silenced enemy's intent is struck through with `🤐`; a Chilled attack shows its halved numbers with `❄` (`intentPlan` in `BattleScreen.tsx`, `intentTip` takes a mark). Floats and sprite glows for heal (`+5`), cleanse (`✨−3`), Curse, Silence, Chill, a resisted Silence (`Immune`), and a skipped turn; spells that only touch the player (Block, Heal, Cleanse) send no paint bolt. Playback carries the enemy flags beat by beat (`Conditions` on `Vitals` in `timeline.ts`). The mix recipes moved from the bowl note into a "Mixes" list at the bottom of the Spellbook (paint drops plus text); the empty bowl's note points there. Spellbook, workbench, and the repaint picker show the new spells, mixes, and colors. Tests in `fx.test.ts`, `tooltips.test.ts`, `timeline.test.ts`.
- [ ] **Task 4, Bot & Balance** (`src/engine/testBot.ts`, `src/data/`): teach the greedy bot to Heal when hurt, Cleanse when Poison/Burn would hurt, Silence or Chill the enemy with the biggest incoming hit, and Curse before a big hit; let it buy the new dice. Tune spell numbers, dice prices, and enemy stats so `npm run test:balance` stays in its 5–35% win band, and note the new win rate here.

### Milestone 9: Cosmic Paint Workshop UI Overhaul
Restyle the whole game to the "Cosmic Paint Workshop" theme in `DESIGN.md`: a pixel-art painter's workbench in a cosmic nebula. Visual only, so no engine or gameplay-data changes. Drag-and-drop, tap-to-place, keyboard support, aria labels, `prefers-reduced-motion`, and the `useDesktop` (900px) / `useLargeDesktop` breakpoints all keep working. Each task ships on its own and the game stays playable after it.
- [ ] **Task 1, Foundation** (`index.html`, `src/ui/global.css`, shared button styles in `battle.css`/`run.css`/`menu.css`): load `Pixelify Sans` from Google Fonts; add `--font-pixel`/`--font-body`; remap the existing color tokens and add the new ones (DESIGN.md §2), keeping `COLOR_HEX` in `fx.ts` and the drop outline in `PaintDrop.tsx` in sync; add the `.px-frame`, `.px-frame-gold`, `.px-recess`, and `.px-raised` utilities; restyle `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-mix`, `.btn-danger`, `.btn.attack-cast`, and the icon buttons as tactile beveled blocks with gold focus rings; drop soft `border-radius` from cards and panels.
- [ ] **Task 2, Battle Arena** (`Fighters.tsx`, the `components.tsx` `HpBar`/`Badges`, arena rules in `battle.css`, `fx.css` floats, new sprites in `src/data/sprites.ts`): nebula-and-stars backdrop, stone-tile floor under the hero and the 1–3 enemy row, enemies as sprites on the floor with gold-framed name/intent/HP plates, gold pixel-framed HP bars, louder intent banners (attack, block, poison, burn, multi-hit), gem-style status badges with the Burn stack count, a gold floor ring plus the "Target" tag for the selected enemy, and pixel-font floats.
- [ ] **Task 3, Workbench** (`workbench.tsx`, `DiceRack.tsx`, `PaintDrop.tsx`, `SpellCard` in `Spellbook.tsx`, the pool and footer in `BattleScreen.tsx`, workbench rules in `battle.css`, new sprites in `src/data/sprites.ts`): the recessed stone dice tray with sockets and gem face indicators (desktop rack and phone `.dice-tray`); the cauldron with two glowing liquid slots feeding a potion vial (empty, cracked on no recipe, filled and glowing on a mix); dark parchment spell cards with element-tinted borders, carved stone cost sockets that light up when filled, chunky Cast buttons, and a "hits all" marker on area spells (Splash, Miasma); the color pool as a palette of recessed crystal wells holding glowing drops; End turn as the main gold button.
- [ ] **Task 4, Secondary screens and modals** (`MainMenu.tsx`, `RewardScreen.tsx`, `ShopScreen.tsx`, `DiceEditor.tsx`, `Spellbook.tsx` sheet, `BattleLog.tsx`, `SettingsScreen.tsx`, `RunEndScreen.tsx`, `ConfirmDialog.tsx`, `Tooltip.tsx`, the run top bar and pause panel, `menu.css`, `run.css`): the shared backdrop, frames, buttons, and type on every screen; reward cards as gold-framed parchment, shop items as parchment rows with coin prices, the Spellbook and battle log as parchment/scroll sheets, Settings in framed groups, the main menu's update notice (`UpdateNotice.tsx`) as a small gold-framed plate and the version line (`.app-version`) in the pixel font, Run End as a large gold panel, and dialogs/tooltips as framed panels over a dark scrim.

## Explicitly Out of Scope for V1
- Accounts, cloud saves, leaderboards, or backend services.
- Ads, IAP, or complex economy systems (the simple gold dice shop in Milestone 3 is in scope).
- Multiplayer or heavy custom shaders.
- Sound effects and music.
- Mobile app builds (Capacitor, Android/iOS). The web build stays mobile-friendly.