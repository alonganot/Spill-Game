# DESIGN.md — Spill Visual Design System: "Cosmic Paint Workshop"

This file is the visual source of truth for everything in `src/ui/` (CSS and components), `index.html`, and any new UI pixel-art sprites in `src/data/sprites.ts`. Gameplay rules live in `RULES.md`; scope and progress live in `PLAN.md` (Milestone 8 is the rollout of this design).

## 1. Theme & Atmosphere

Spill is played at an **alchemist-painter's workbench floating in a cosmic nebula**. Two ideas run through every screen:

- **Physical crafting tools.** Things you touch look like objects: stone and wood trays, an alchemical cauldron, glass potion vials, parchment spell cards, carved stone sockets, and a painter's palette with crystal wells. They have weight: recessed where things sit in them, raised where you press them.
- **Cosmic magic.** Everything sits on deep indigo/space-purple, with subtle nebula clouds and sparse starlight behind it. Frames are **antique bronze and gold pixel-art borders**. Paint is the only saturated thing on screen, and it glows when it is live (draggable, staged, ready to cast).

Rules of thumb:
- **Paint is the hero.** Surfaces stay dark and low-saturation so the six paint colors always read first.
- **Glow means "you can act on this".** A glow marks something draggable, a filled socket, a ready Cast, or the current target. Idle, locked, or disabled things don't glow.
- **Pixel-crisp, never blurry.** Hard edges, stepped corners, whole-pixel sizes. No soft drop shadows on cards, no gradients that look airbrushed (nebula backdrops may use soft gradients, but at low contrast and behind everything).
- **Calm backdrop, loud foreground.** Backdrops (sky, nebula, floor) never animate faster than a slow twinkle and never compete with fighters, floats, or intents.

## 2. Color Palette (CSS variables)

All colors are CSS custom properties on `:root` in `src/ui/global.css`. Components use tokens, never raw hex values (pixel sprite palettes are the exception, see §2.4).

### 2.1 Existing tokens, remapped

| Token | Old value | New value | Use |
|---|---|---|---|
| `--bg` | `#14121a` | `#0f0d1a` | Page background, deepest space indigo. |
| `--surface` | `#1f1c27` | `#16132a` | Panels, cards, the workbench. |
| `--surface-2` | `#2a2635` | `#1c1830` | Raised elements inside panels, empty bars, chips' backing. |
| `--border` | `#393446` | `#8c6d46` | Default frame: antique bronze. |
| `--text` | `#f2eef8` | `#f3e6c8` | Body and heading text: warm parchment. |
| `--muted` | `#9a93ab` | `#a89a80` | Secondary text, hints, captions: faded ink. |
| `--accent` | `#f2c94c` | `#c89d54` | Bright gold: selection, focus, primary buttons, the target ring. |
| `--hp` | `#4cc38a` | `#5ccf7e` | HP fill. |
| `--hp-low` | `#e5484d` | `#e8484a` | HP fill at low HP. |
| `--red` | `#e5484d` | `#ef4b4b` | Red paint (Fire). |
| `--blue` | `#3e7bfa` | `#3f86ff` | Blue paint (Water). |
| `--green` | `#3fb950` | `#45c95a` | Green paint (Nature/Poison). |
| `--purple` | `#9b5de5` | `#a663f0` | Purple paint. |
| `--cyan` | `#22c3d6` | `#2ed3e6` | Cyan paint. |
| `--orange` | `#f08a24` | `#ff9229` | Orange paint. |

The paint colors get a small boost in brightness and saturation so they still pop against indigo and bronze; hues stay the same so players' color memory carries over.

### 2.2 New tokens

| Token | Value | Use |
|---|---|---|
| `--bg-deep` | `#0a0814` | Far nebula edge, vignettes, the darkest recesses. |
| `--surface-3` | `#241f3d` | Hover/active state of surfaces; the lit face of raised stone. |
| `--recess` | `#0b0915` | Inside of trays, sockets, and wells (with an inset shadow). |
| `--stone` | `#3a3550` | Stone tray and socket faces. |
| `--stone-dark` | `#25213a` | Stone shadows and floor-tile grout. |
| `--stone-light` | `#544d70` | Stone highlights, the top bevel of stone. |
| `--wood` | `#4a3324` | Optional wood trim on the dice tray. |
| `--gold` | `#c89d54` | Alias of `--accent` for frames (use `--accent` for state, `--gold` for decoration). |
| `--gold-light` | `#f0cf86` | Top-left highlight pixels of gold frames; glints. |
| `--bronze` | `#8c6d46` | Alias of `--border` for frames. |
| `--bronze-dark` | `#5a4430` | Bottom/right shadow pixels of frames; button bevels. |
| `--parchment` | `#e9d9b4` | Parchment fill (light cards, tags); text on dark parchment uses `--text`. |
| `--parchment-dark` | `#2b2238` | Dark parchment card fill (spell cards). |
| `--ink` | `#1a1426` | Text on light parchment and on gold buttons. |
| `--nebula-1` | `#3b1f5e` | Nebula cloud, violet. |
| `--nebula-2` | `#1f2f5e` | Nebula cloud, blue. |
| `--nebula-3` | `#5e1f4a` | Nebula cloud, magenta (sparingly). |
| `--star` | `#fff6dc` | Star pixels. |
| `--block` | `#7fb2ff` | Block badges, block floats, the block glow (replaces ad-hoc blues). |
| `--poison` | `var(--green)` | Poison badges and intents. |
| `--burn` | `var(--orange)` | Burn badges and intents. |
| `--danger` | `#e8484a` | Attack intents, destructive buttons. |
| `--glow-size` | `6px` | Default glow radius; doubled on hover/drag. |
| `--px` | `2px` | The UI "pixel": border and bevel thickness. `3px` at the large-desktop size is allowed. |

### 2.3 Glows

A glow is a hard-edged pixel halo plus a soft bloom, using the element's own color:

```css
--glow-color: var(--accent);           /* set per element, e.g. var(--red) on a red chip */
box-shadow:
  0 0 0 var(--px) var(--glow-color),
  0 0 var(--glow-size) color-mix(in srgb, var(--glow-color) 55%, transparent);
```

Use glows for: draggable paint drops (on hover/focus), the drag ghost, filled cost sockets, a charged spell card, the bowl's result, the vial, the current target, and the focused element. Paint drops use `filter: drop-shadow(...)` instead of `box-shadow` so the glow follows the drop's pixel outline.

### 2.4 Sprite palettes

Sprite colors live in `src/data/sprites.ts` and `src/ui/PaintDrop.tsx`/`PixelDie.tsx` palettes, not CSS. Keep them aligned with the tokens:
- `COLOR_HEX` in `src/ui/fx.ts` must use the same six paint values as the CSS color tokens (update both together).
- Sprite outlines (`k` in `dropPalette`) use `--bg`'s value (`#0f0d1a`).
- New UI sprites (cauldron, vial, icons, frames) draw from §2.1–2.2 values only.

### 2.5 Contrast

- `--text` on `--surface`/`--parchment-dark` and `--ink` on `--accent`/`--parchment` must meet WCAG AA (4.5:1) for body text.
- `--muted` is for secondary text only and must still reach 4.5:1 on `--surface`.
- Never put text directly on a nebula backdrop without a panel or a text shadow behind it.
- Never rely on color alone: intents and badges keep their icons and numbers; spell slots keep their aria labels.

## 3. Typography

- **Pixel font:** [`Pixelify Sans`](https://fonts.google.com/specimen/Pixelify+Sans) (weights 400–700) from Google Fonts, loaded in `index.html` with `preconnect` and `display=swap`.
- **Tokens** in `global.css`:
  - `--font-pixel: 'Pixelify Sans', ui-monospace, 'Cascadia Mono', Consolas, monospace;`
  - `--font-body: system-ui, -apple-system, 'Segoe UI', sans-serif;`
- **Where the pixel font goes:** headings (`h1`–`h3`, card titles, section heads), all numbers (HP, damage floats, gold, prices, dice counts, badges), intents and badges, tags (`Target`, `⚗ N mixes`, "hits all"), and every button.
- **Where the body font goes:** long running text: tooltips, the battle log, bowl notes, spell effect lines, settings hints, the Spellbook legend. These stay in a clean sans so dense text stays readable.
- **Sharpness:**
  - Use sizes on Pixelify Sans' grid: `12px`, `14px`, `16px`, `20px`, `24px`, `32px`, `48px` (title). Don't use fractional `rem` values for pixel text.
  - `-webkit-font-smoothing: none` is **not** used (it breaks on some displays); rely on whole-pixel sizes instead.
  - Numbers use `font-variant-numeric: tabular-nums` so HP and gold don't jitter.
- **Minimums:** 14px for any pixel-font label, 12px only for tiny badges with an icon; 16px for buttons. Phone-sized windows use the same sizes (no shrinking below the minimums).
- Text is not all-caps by default; short tags (`TARGET`, `ALL`) may be uppercase with `letter-spacing: 0.05em`.

## 4. Borders & Depth

### 4.1 Pixel frames, not rounded cards

- **No soft `border-radius` on cards, panels, buttons, trays, or sockets.** Corners are square or **stepped** (a 1-pixel notch at each corner).
- Exceptions that stay round: paint drops and dice (they're sprites), the HP bar ends if drawn as pixel caps, and the target ring (a pixel circle sprite or stepped ring).
- Stepped corners use `clip-path` with a `--px` notch:

  ```css
  .px-frame {
    clip-path: polygon(
      var(--px) 0, calc(100% - var(--px)) 0, 100% var(--px), 100% calc(100% - var(--px)),
      calc(100% - var(--px)) 100%, var(--px) 100%, 0 calc(100% - var(--px)), 0 var(--px)
    );
  }
  ```

  Because `clip-path` clips outer shadows and outlines, glows and focus rings on clipped elements go on a wrapper or use `inset` shadows / `outline-offset` inside the box.
- **Frame utilities** (Task 1 creates them in `global.css`):
  - `.px-frame` — bronze 2px border, stepped corners, `--surface` fill. Panels, cards, dialogs.
  - `.px-frame-gold` — gold border with a `--gold-light` top-left highlight and `--bronze-dark` bottom-right shadow (two-tone `box-shadow: inset`). Important panels: the arena, the workbench, reward cards, dialogs.
  - `.px-recess` — recessed tray/socket: `--recess` fill, `box-shadow: inset 0 var(--px) 0 var(--bg-deep), inset 0 calc(var(--px) * -1) 0 var(--stone-light)`, plus an inner dark inset. Dice tray, cost sockets, bowl slots, pool wells, empty HP bars.
  - `.px-raised` — raised stone: `--stone` fill, light top bevel, dark bottom bevel.

### 4.2 Tactile buttons

Interactive buttons look like chunky pressable blocks with a **3D bottom-border bevel**:

| State | Look |
|---|---|
| Rest | Fill + a `4px` darker bottom edge (`box-shadow: inset 0 -4px 0 <dark>`) and a `--px` light top edge. |
| Hover / focus-visible | Fill lightens one step; gold focus ring outside the frame (`outline: var(--px) solid var(--accent); outline-offset: 2px`). |
| Active (pressed) | `transform: translateY(2px)`, bottom bevel shrinks to `2px`. |
| Disabled | Flat (no bevel), desaturated, `opacity: 0.45`, `cursor: default`. No glow. |

Variants:
- `.btn-primary` (End turn, Continue, Buy, Pick): gold fill (`--accent`), `--ink` text, `--bronze-dark` bevel.
- `.btn.attack-cast` (Cast): gold, compact (`min-height: 32px`), glows when the spell is charged.
- `.btn-secondary` / `.btn-mix`: `--surface-3` fill, bronze frame, `--parchment` text.
- `.btn-danger` / `.btn-menu-danger`: `--danger` fill, dark red bevel.
- Icon buttons (☰, 📖 Spellbook, 📜 Battle log, ← Back): small stone blocks with the same bevel.
- Touch targets stay at least 44×44px (the current 48px `min-height` for `.btn` stays; Cast keeps a 44px hit area via padding even when drawn smaller).

## 5. Battle Arena (left on desktop, top on phones)

- **Backdrop:** a cosmic starry sky. Layer, back to front: `--bg-deep` → soft nebula clouds (`radial-gradient`s of `--nebula-1/2/3` at 15–30% opacity) → sparse star pixels (a repeating background of 1–2px `--star` dots, or a small tiled pixel sprite). An optional slow twinkle (opacity, ≥4s period) is turned off under `prefers-reduced-motion`.
- **Floor:** an ancient stone-tile floor along the bottom third of the arena: rows of `--stone`/`--stone-dark` tiles with 1px `--bg-deep` grout and a few `--stone-light` chips, slightly darker toward the back. The hero and every enemy stand on the floor (their sprite's feet line up with the tile row). Can be CSS gradients or a tiled code-drawn sprite.
- **Fighters:** the hero on the left facing right; **1–3 enemies in a row** on the right (`.enemy-row`). Enemy cards lose their opaque card background in the arena: each enemy is the sprite on the floor plus a small gold-framed plate under or above it holding name, intent, badges, and HP.
- **HP bars:** golden pixel frames (`.px-frame-gold`, stepped), a recessed `--recess` track, a flat `--hp` fill with a 1px lighter top line, and `--hp-low` under 30%. HP text (`12 / 30`) in the pixel font, centered, with a 1px `--ink` text shadow for legibility.
- **Intents** (`.intent-attack`, `-block`, `-poison`, `-burn`): a pixel speech-bubble/banner above the enemy, framed in the intent's color (`--danger`, `--block`, `--poison`, `--burn`) on `--surface`, with the icon and number in the pixel font. They must pop: the brightest thing on the enemy plate after the sprite. A gentle 1-step bob is allowed (off with reduced motion). Multi-hit attacks show `6×2` style text.
- **Status badges** (`.badge-block`, `-poison`, `-burn`): small square pixel gems with a colored frame, icon, and number. **Burn shows its stack count** (`🔥 2`) and gets brighter/hotter as stacks grow. Badges sit next to the HP bar and never cover the sprite.
- **Targeting:** the selected enemy has a **gold pixel ring** on the floor under its feet (or around the sprite) with a soft gold glow, and a parchment **"Target" tag** (`.target-tag`) with `--ink` text. Hovering/focusing another living enemy shows a fainter ring. Defeated enemies are dimmed and can't be targeted; their ring and badges are hidden.
- **Feedback** (`fx.css`): floats use the pixel font with a 2px `--ink` outline; damage in `--danger`/white, block in `--block`, poison/burn in their colors. Paint bolts keep the paint color with a glow trail.
- **Battle log and Spellbook buttons** in the arena use the icon-button style (§4.2).

## 6. Workbench Panel (right on desktop, stacked under the arena on phones)

The workbench is one `.px-frame-gold` panel. Sections keep their `section-head` headings in the pixel font with a thin bronze rule under them.

### 6.1 Your dice (`DiceRack.tsx`, phone `.dice-tray`)
- A **recessed stone/wood tray** (`.px-recess` with a `--wood` rim) with one **inset socket** per die.
- The rolled face sits big in its socket. The six small faces beside it are **gem-like indicators**: tiny faceted squares in the face color with a 1px highlight; faces that don't match the roll are dimmed (not hidden).
- Overflowed dice (pool full) look greyed and cracked; "away" dice (on the roll stage) leave an empty glowing socket.

### 6.2 Mixing bowl (`MixingBowl` in `workbench.tsx`)
- A **pixel cauldron** sprite (new, in `sprites.ts`) holds the **two liquid slots** (`.bowl-slot-wrap`). Empty slots are dark recessed pools; a filled slot shows the paint as glowing liquid (the paint drop sits in a glowing pool of its color).
- The `=` leads to a **potion vial** (new sprite) as the output. Empty vial: clear glass. `?`: waiting. `✕` (no recipe): a cracked/smoky vial. A valid mix fills the vial with the new color and it **glows and gently pulses** (pulse off with reduced motion); it stays draggable and tappable exactly as today.
- The bowl note stays below in the body font.

### 6.3 Craftable spells (`SpellCard` in `Spellbook.tsx`, `.attacks`)
- **Dark parchment cards** (`--parchment-dark` fill with a faint paper-grain texture, stepped corners) with an **element-tinted border**: the border takes the color of the spell's main cost color (set as a `--spell-color` custom property on the card).
- **Cost sockets** (`.cost-slots .slot`): **carved stone sockets** (`.px-recess` on `--stone`) with a faint ring of the needed color. When a paint drop fills a socket it **lights up**: the socket rim glows in that color.
- **Cast** is a chunky gold tactile button (§4.2). When every socket is full (`.attack-charged`) the card's border brightens and the Cast button glows.
- **Area spells** (Splash, Miasma, anything with an `area` effect) carry a visible **"hits all" marker**: a small parchment tag with a multi-target icon (e.g. three pips) and the text `ALL`, next to the spell name. The effect line keeps "dmg all".
- `⚗ N mixes` (`.attack-mix-tag`) is a small cauldron-icon tag; locked/dim spells look faded parchment with dark sockets and no glow.

### 6.4 Color pool (`.pool` in `BattleScreen.tsx`)
- A **cosmic painter's palette**: a dark palette shape (or a gold-framed board) with a 5×2 grid of **recessed crystal wells** (`.px-recess` with a faceted, faintly violet crystal rim).
- Each color is a glowing paint drop sitting in a well. Draggable drops glow on hover/focus; the lifted chip (tap-to-place) glows gold and lifts 2px; hinted chips (from a craftable spell) pulse their glow.
- Empty wells stay visible so the pool's capacity is readable.
- The drag ghost (`.drag-ghost`) is the drop with a strong glow and no well.

### 6.5 Footer
- End turn is the largest `.btn-primary` in the panel, gold with a deep bevel. During playback it is flat and disabled.

## 7. Consistency Across Screens

Every screen shares the same backdrop (nebula + stars, without the floor), frames, buttons, and type:

- **Main Menu** (`MainMenu.tsx`, `menu.css`): the title scene on the nebula with the stone floor under the hero and slime; menu buttons are stacked tactile buttons (New run is primary gold).
- **Reward cards** (`RewardScreen.tsx`, `run.css` `.choice`): three `.px-frame-gold` parchment cards; the icon sits in a recessed socket; hover/focus glows gold.
- **Dice Shop** (`ShopScreen.tsx`): shop items are dark parchment rows/cards in bronze frames; prices in the pixel font with a gold coin glyph; Buy is primary; unaffordable items are flat and dim with their reason visible.
- **Dice editor** (`DiceEditor.tsx`): faces sit in recessed stone sockets like the dice tray; color picks are glowing drops.
- **Spellbook** (`Spellbook.tsx`): a large parchment-and-bronze sheet over the workbench, using the same spell cards.
- **Battle Log** (`BattleLog.tsx`): an aged scroll panel (`--parchment-dark`, bronze frame), body-font lines.
- **Settings** (`SettingsScreen.tsx`): grouped `.px-frame` panels; the seed in the pixel font in a recessed field; danger actions use `.btn-danger`.
- **Run End** (`RunEndScreen.tsx`): a large gold-framed panel, Victory in gold / Defeat in `--danger`, stats in the pixel font.
- **Dialogs and overlays** (`ConfirmDialog.tsx`, pause panel, tooltips): gold-framed panels over a `--bg-deep` scrim at ~70% opacity. Tooltips are small bronze-framed panels with body-font text.
- **Top bar** (`run.css` `.topbar`): a dark strip with a bronze bottom rule; stage, HP, and gold in the pixel font.

## 8. Pixel-Art Sprites

- Sprites stay **code-drawn pixel grids** in `src/data/sprites.ts` (or beside their component, like `DROP_ROWS` in `PaintDrop.tsx`), rendered by `PixelSprite`. No image files, no external sprite sheets.
- Every frame in a sheet is a rectangle of the same size (`src/data/sprites.test.ts` checks this); add new sheets to that test.
- New UI sprites for this theme: **cauldron**, **potion vial** (empty / filled / cracked), **target ring**, **area ("hits all") icon**, **coin**, intent/badge icons where emoji read poorly, and optional floor-tile and star tiles.
- Palettes use the values in §2. Outlines use `--bg`'s value. Fill colors that depend on paint (vial liquid, socket glow) are passed in at render time, as `dropPalette` does.
- Scale by whole pixels only. Desktop fighters stay at 10× (13× on large desktop); UI sprites pick a fixed whole-pixel scale per breakpoint.

## 9. Motion

- Motion is short and physical: buttons press down, drops lift, the vial pulses, stars twinkle slowly.
- Everything new must respect `prefers-reduced-motion: reduce`: no pulses, bobs, or twinkles; state changes become instant. Follow the existing `@media (prefers-reduced-motion: reduce)` blocks in `battle.css` and `fx.css`, and `useReducedMotion` in `anim.ts` for JS-driven motion.
- No motion blocks input or changes timing of the event playback (`usePlayback.ts`).

## 10. Technical Constraints

- **Where changes go:** `src/ui/` (CSS and components), `src/data/sprites.ts` (new UI sprites), and `index.html` (font loading). No changes to `src/engine/` or gameplay data; the redesign is visual only.
- **Keep all interaction working:** drag-and-drop (`useDrag.ts`, `data-drop` targets), click/tap-to-place, keyboard (Enter to lift/place, Escape to go back, focusable tooltips), and all `aria-*` labels. Decorative sprites and backdrops are `aria-hidden`.
- **Keep the responsive breakpoints:** `useDesktop` (`min-width: 900px`) and `useLargeDesktop` (`min-width: 1500px` and `min-height: 960px`) in `useMediaQuery.ts`, and the matching CSS `@media` blocks. The desktop battle screen still fills the window with no scrolling; phones keep the single column.
- **Performance:** backdrops are CSS gradients or small tiled sprites, not large images; no heavy shaders or canvas effects.
- **Tokens first:** new colors are added as tokens in §2 before use. Update this file when a token, utility, or rule changes.
