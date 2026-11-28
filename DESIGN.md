# DESIGN.md — Spill Visual Design System: "Cosmic Paint Workshop"

This file is the visual source of truth for everything in `src/ui/` (CSS and components), `index.html`, and any new UI pixel-art sprites in `src/data/sprites.ts`. Gameplay rules live in `RULES.md`; scope and progress live in `PLAN.md` (Milestone 9 is the rollout of this design).

## 1. Theme & Atmosphere

Spill is played at an **alchemist-painter's workbench floating in a cosmic nebula**. Two ideas run through every screen:

- **Physical crafting tools.** Things you touch look like objects: stone and wood trays, an alchemical cauldron, glass potion vials, parchment spell cards, carved stone sockets, and a painter's palette with crystal wells. They have weight: recessed where things sit in them, raised where you press them.
- **Cosmic magic.** Everything sits on deep indigo/space-purple, with subtle nebula clouds and sparse starlight behind it. Frames are **antique bronze and gold pixel-art borders**. Paint is the only saturated thing on screen, and it glows when it is live (draggable, staged, ready to cast).

Rules of thumb:
- **Paint is the hero.** Surfaces stay dark and low-saturation so the paint colors (five base, eight mixed) always read first.
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
| `--white` | `#f4f0e6` | `#f4f0e6` | White paint (Purity). |
| `--black` | `#2b2238` | `#2b2238` | Black paint (Shadow). Always drawn with `--black-rim` so it reads on dark surfaces. |
| `--black-rim` | `#8f86a8` | `#8f86a8` | The light outline of Black paint (drop outline, chip inset ring). |
| `--pink` | `#ff7eb6` | `#ff7eb6` | Pink paint (Heal). |
| `--grey` | `#9a96a8` | `#9a96a8` | Grey paint (Balance). |
| `--crimson` | `#b5173f` | `#b5173f` | Crimson paint (Vampiric). Darker than Red so the two stay apart. |
| `--blight` | `#8e9c1e` | `#8e9c1e` | Blight paint (Plague). Olive, so it stays apart from Green. |
| `--frost` | `#a6ecff` | `#a6ecff` | Frost paint (Chill). Paler than Cyan. |
| `--paint-gold` | (Issue #12) | `#d9a520` | Gold paint (Economy). Deeper and more metallic than `--accent`, warmer than `--orange`. Named `--paint-gold` so it never collides with the frame token `--gold` (§2.2). |
| `--paint-gold-shine` | (Issue #12) | `#fff1a8` | Gold paint's shine: the drop's highlight pixels, the chip's metallic gradient, and the `+Ng` float. |
| `--bounty` | (Issue #12) | `#ffd36b` | Bounty badge (`🎯 N`), Bounty float, and glow. |
| `--curse` | `#b58cff` | `#b58cff` | Curse badge, float, and glow. |
| `--silence` | `#c9c3d8` | `#c9c3d8` | Silence badge, float, and glow. |
| `--chill` | `#a6ecff` | `#a6ecff` | Chill badge, chilled intent, float, and glow. |
| `--heal` | `#7dea9a` | `#7dea9a` | Heal float and glow. |

The six original paint colors get a small boost in brightness and saturation so they still pop against indigo and bronze; hues stay the same so players' color memory carries over. The White/Black paints and their mixes (Milestone 8) were picked for the new palette already and keep their values.

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
| `--px` | `2px` | The UI "pixel": border and bevel thickness. `3px` on big desktop windows is allowed. |

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
- `COLOR_HEX` in `src/ui/fx.ts` must use the same paint values as the CSS color tokens (update both together).
- Black paint's drop uses `--black-rim` as its outline instead of `--bg` (`dropPalette` in `PaintDrop.tsx`).
- Gold paint's drop is metallic: `--paint-gold-shine` as its highlight and a deep bronze shade (`dropPalette`); its chips and dots use a static diagonal gradient (shine → gold → bronze), so there is no animation to turn off for `prefers-reduced-motion`.
- Gold earned mid-fight floats `🪙+Ng` in `--paint-gold-shine`: off the hero for a Gold spell, off the defeated enemy for a Bounty payout. The player card's gold counter counts it up on that beat.
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

**Desktop proportions:** the battle screen is a fixed **50/50** two-column grid (`.run-screen.in-battle`): the arena on the left, the workbench on the right, both running the full window height, and neither changes size with the number of enemies. The top bar (☰, Spill, fight and act) sits **inside the top of the arena**, above the dice rack. Fighters scale with the window (`fighterPixel` in `BattleScreen.tsx`, 4×–14×) at one size for every fight, picked so the hero plus three crowd-sized enemies fit across and a lone enemy fits under the top bar and dice rack; the hero's column is only as wide as its sprite, and the hero and the enemies sit between equal spacers, so they're always centered in the arena and evenly spaced (the spacers shrink first when room is tight). During a fight, **gold** sits in the player's card beside their name and turn, above the HP bar (`.card-meta`), not in the top bar.

- **Backdrop:** a cosmic starry sky. Layer, back to front: `--bg-deep` → soft nebula clouds (`radial-gradient`s of `--nebula-1/2/3` at 15–30% opacity) → sparse star pixels (a repeating background of 1–2px `--star` dots, or a small tiled pixel sprite). An optional slow twinkle (opacity, ≥4s period) is turned off under `prefers-reduced-motion`.
- **Floor:** an ancient stone-tile floor along the bottom third of the arena: rows of `--stone`/`--stone-dark` tiles with 1px `--bg-deep` grout and a few `--stone-light` chips, slightly darker toward the back. The hero and every enemy stand on the floor (their sprite's feet line up with the tile row). Can be CSS gradients or a tiled code-drawn sprite.
- **Fighters:** the hero on the left facing right; **1–3 enemies in a row** on the right (`.enemy-row`). Enemy cards lose their opaque card background in the arena: each enemy is the sprite on the floor plus a small gold-framed plate under or above it holding name, intent, badges, and HP.
- **HP bars:** golden pixel frames (`.px-frame-gold`, stepped), a recessed `--recess` track, a flat `--hp` fill with a 1px lighter top line, and `--hp-low` under 30%. HP text (`12 / 30`) in the pixel font, centered, with a 1px `--ink` text shadow for legibility.
- **Intents** (`.intent-attack`, `-block`, `-poison`, `-burn`): a pixel speech-bubble/banner above the enemy, framed in the intent's color (`--danger`, `--block`, `--poison`, `--burn`) on `--surface`, with the icon and number in the pixel font. They must pop: the brightest thing on the enemy plate after the sprite. A gentle 1-step bob is allowed (off with reduced motion). Multi-hit attacks show `6×2` style text.
- **Status badges** (`.badge-block`, `-poison`, `-burn`, and the enemy-only `-curse`, `-silence`, `-immune`, `-chill`): small square pixel gems with a colored frame, icon, and number. **Burn shows its stack count** (`🔥 2`) and gets brighter/hotter as stacks grow. Badges sit next to the HP bar, wrap onto a second row when there are many, and never cover the sprite.
- **Changed intents:** a Silenced enemy's intent is struck through and dimmed with `🤐` (`.intent-skipped`); a Chilled enemy's attack shows its reduced numbers in `--chill` with `❄` (`.intent-chilled`).
- **Targeting:** the selected enemy has a **gold pixel ring** on the floor under its feet (or around the sprite) with a soft gold glow, and a parchment **"Target" tag** (`.target-tag`) with `--ink` text. Hovering/focusing another living enemy shows a fainter ring. Defeated enemies are dimmed and can't be targeted; their ring and badges are hidden.
- **Feedback** (`fx.css`): floats use the pixel font with a 2px `--ink` outline; damage in `--danger`/white, block in `--block`, poison/burn in their colors. Paint bolts keep the paint color with a glow trail.
- **Battle log and Spellbook buttons** in the arena use the icon-button style (§4.2).

## 6. Workbench Panel (right on desktop, stacked under the arena on phones)

The workbench is one `.px-frame-gold` panel. Sections keep their `section-head` headings in the pixel font with a thin bronze rule under them.

### 6.1 Your dice (`DiceRack.tsx`, phone `.dice-tray`)
- On desktop the dice rack is a strip across the **top of the arena**, above the fighters (grid area `dice`), not in the workbench. Phones keep the tray in the footer.
- A **recessed stone/wood tray** (`.px-recess` with a `--wood` rim) with one **inset socket** per die.
- The rolled face sits big in its socket. The six small faces beside it are **gem-like indicators**: tiny faceted squares in the face color with a 1px highlight; faces that don't match the roll are dimmed (not hidden).
- Overflowed dice (pool full) look greyed and cracked; "away" dice (on the roll stage) leave an empty glowing socket.

### 6.2 Mixing bowl (`MixingBowl` in `workbench.tsx`)
- A **pixel cauldron** sprite (new, in `sprites.ts`) holds the **two liquid slots** (`.bowl-slot-wrap`). Empty slots are dark recessed pools; a filled slot shows the paint as glowing liquid (the paint drop sits in a glowing pool of its color).
- The `=` leads to a **potion vial** (new sprite) as the output. Empty vial: clear glass. `?`: waiting. `✕` (no recipe): a cracked/smoky vial. A valid mix fills the vial with the new color and it **glows and gently pulses** (pulse off with reduced motion); it stays draggable and tappable exactly as today.
- The bowl note stays below in the body font. It never lists the recipes (those live in the Spellbook); when the bowl is empty it points there.

### 6.3 Craftable spells (`SpellCard` in `Spellbook.tsx`, `.attacks`)
- **Dark parchment cards** (`--parchment-dark` fill with a faint paper-grain texture, stepped corners) with an **element-tinted border**: the border takes the color of the spell's main cost color (set as a `--spell-color` custom property on the card).
- **Cost sockets** (`.cost-slots .slot`): **carved stone sockets** (`.px-recess` on `--stone`) with a ring of the needed color (every one of the 13 colors has its `.slot-<color>` class; Black uses `--black-rim`) and a faded drop of that color inside (`.slot-ghost`), so the cost reads at a glance. On a card you can't cast yet, only the name, text, and Cast button dim; the sockets stay clear. When a paint drop fills a socket it **lights up**: the socket rim glows in that color.
- **Cast** is a chunky gold tactile button (§4.2). When every socket is full (`.attack-charged`) the card's border brightens and the Cast button glows. With the Auto-cast setting on there's no Cast button: the spell casts itself as soon as its sockets fill.
- **Area spells** (Splash, Miasma, Spore Cloud, anything with an `area` effect) carry a visible **"hits all" marker**: a small parchment tag with a multi-target icon (e.g. three pips) and the text `ALL`, next to the spell name. The effect line keeps "dmg all".
- **Silence warning** (`.attack-note` in `battle.css`): when the target is immune to Silence, a spell card that Silences shows a one-line note under its effects. A Silence-only spell (Hush) gets `.attack-note-blocked` (`🤐 Target is immune to Silence`, soft red) and its Cast button is disabled; a spell with other effects (Eclipse) gets a muted `Target is immune: no Silence` and can still be cast.
- `⚗ N mixes` (`.attack-mix-tag`) is a small cauldron-icon tag; locked/dim spells look faded parchment with dark sockets and no glow.

### 6.4 Color pool (`.pool` in `BattleScreen.tsx`)
- A **cosmic painter's palette**: a dark palette shape (or a gold-framed board) with a 5×2 grid of **recessed crystal wells** (`.px-recess` with a faceted, faintly violet crystal rim).
- Each color is a glowing paint drop sitting in a well. Draggable drops glow on hover/focus; the lifted chip (tap-to-place) glows gold and lifts 2px; hinted chips (from a craftable spell) pulse their glow.
- Empty wells stay visible so the pool's capacity is readable.
- The drag ghost (`.drag-ghost`) is the drop with a strong glow and no well.

### 6.5 Footer
- End turn is the largest `.btn-primary` in the panel, gold with a deep bevel. During playback it is flat and disabled.

### 6.6 Chroma Aura (upgraded `+` spells, Milestone 9)
An upgraded spell must read as empowered at a glance, in the Workbench, Spellbook, Reward and Shop previews, and tooltips. It uses CSS only: no shaders, no images.
- **Border:** a 2px border whose color shifts through the cosmic paint hues: magenta `#ff6ad5`, cyan `#6be6ff`, gold `#f2c94c`, emerald `#5ff0a0`. Built with a pseudo-element whose `background` is a linear gradient of those hues, and moved with `background-position` in a `@keyframes chroma` loop of about 6s (ease-in-out, infinite).
- **Outer glow:** a `box-shadow` of 0 0 12px the current hue, cycling with the border. The card's own pixel frame stays on top.
- **Badge:** a `+` suffix on the spell title, in the pixel font, with a shimmer: a diagonal highlight sweeping across the badge once every 3s.
- **Numbers:** upgraded stat numbers on the card, in tooltips and in the Reward/Shop preview use `--gold` with a faint prismatic text-shadow; base numbers stay as they are, so the change is visible.
- **Casting:** a cast of an upgraded spell sends its paint bolt with a prismatic tint (the same gradient) instead of the flat color, and its floats use the gradient fill.
- **Reduced motion:** with `prefers-reduced-motion`, the loops stop and the aura keeps a static gradient, so the `+` is still visible.
- Token names: `--chroma-magenta`, `--chroma-cyan`, `--chroma-gold`, `--chroma-emerald`, plus `--chroma-gradient` (the four hues as a loop), defined on `:root` in `global.css`; dark mode defines the same values.
- Classes (`global.css`, `fx.css`): `.chroma-aura` (border and glow, on spell cards and the `+` row of an upgrade preview), `.plus-badge` (the `+`), `.stat-up` (changed numbers), `.projectile-prismatic` (the bolt), and `.cast-upgraded` on the arena while a `+` spell's action plays (gradient floats). Components: `SpellName`, `EffectLine`, `UpgradePreview` in `src/ui/SpellUpgrade.tsx`.

## 7. Consistency Across Screens

Every screen shares the same backdrop (nebula + stars, without the floor), frames, buttons, and type:

- **Main Menu** (`MainMenu.tsx`, `menu.css`): the title scene on the nebula with the stone floor under the hero and slime; menu buttons are stacked tactile buttons (New run is primary gold). In the Windows app a **Quit** button closes the game, last in the stack as a plain menu button; browsers don't show it.
- **Reward cards** (`RewardScreen.tsx`, `run.css` `.choice`): three `.px-frame-gold` parchment cards; the icon sits in a recessed socket; hover/focus glows gold.
- **Dice Shop** (`ShopScreen.tsx`): shop items are dark parchment rows/cards in bronze frames; prices in the pixel font with a gold coin glyph; Buy is primary; unaffordable items are flat and dim with their reason visible. With every dice slot full, a die's Buy button stays live with a "Swap a die" note and opens the **swap picker**: a confirm dialog showing the new die's faces, then your dice as selectable rows (`.swap-pick`, gold outline when picked), and **Replace · price**.
- **Dice editor** (`DiceEditor.tsx`): faces sit in recessed stone sockets like the dice tray; color picks are glowing drops.
- **Spellbook** (`Spellbook.tsx`): a large parchment-and-bronze sheet using the same spell cards, with every mix recipe listed under them as paint drops (`.recipe-list`). It takes the whole window height (24px margins on desktop); the title, the Unavailable-only toggle, and ✕ stay fixed at the top, and only the body (`.spellbook-body`: spells, mixes, legend) scrolls.
- **Battle Log** (`BattleLog.tsx`): an aged scroll panel (`--parchment-dark`, bronze frame), body-font lines.
- **Settings** (`SettingsScreen.tsx`): grouped `.px-frame` panels; the seed in the pixel font in a recessed field; danger actions use `.btn-danger`. Two-way choices (Display: Windowed / Fullscreen, Spells: Cast button / Auto-cast) are a row of two buttons, the chosen one primary with `aria-pressed`, plus a one-line hint. Local dev builds (`import.meta.env.DEV`) add a last **Developer** group (`.dev-tools`, `DevTools.tsx`): the Essence balance, **+1,000 ✦**, and **Reset progress** (`.btn-menu-danger`); release builds never render it.
- **Victory popup** (the battle's result overlay): under the line about the win, a small gold list (`.gold-breakdown`): Victory gold, Unused paint (drops × gold, only when paint is left), Interest (`18g held → 3 × 1g`, only when there is any), and a ruled **Total** in gold.
- **Run End** (`RunEndScreen.tsx`): a large gold-framed panel, Victory in gold / Defeat in `--danger`, stats in the pixel font. Below the stats, the Essence earned (a small breakdown like the Victory popup's gold list) and the new Essence total.
- **Character Select** (`CharacterSelect.tsx`, Milestone 10): opened by New run, before the first fight (not a main menu button). Three tier groups stacked top to bottom (Starter, Tier 1, Tier 2), each a row of framed character cards. A card shows the hero sprite, the name, the max HP, the starting dice as small `DieFaces` rows, a one-line description, and an unlock button in the Essence cost (`.btn-buy` style, **Unlock · cost**, disabled when the balance is short), a Select button, or a "Selected" tag. Locked cards are dimmed with their cost visible. Tier headings use the pixel font. The Essence balance sits in the header, a sticky primary **Start run as X** button at the bottom, and ← Back returns to the menu. Unlocking asks first in a confirm dialog. Phones stack the cards in one column (sprite left, details right); desktop lays each tier out as a row of up to three cards (sprite on top). Essence is written with the `✦` glyph (`formatEssence`, e.g. `1,250 ✦`) in `--accent`. The main menu shows the Essence balance under the buttons. A seeded run's Run End shows "Seeded run: no Essence" instead of the breakdown. Classes: `.character-card` (`.selected`, `.locked`), `.essence-balance`, `.menu-essence`, `.essence-earned` in `menu.css`.
- **Hero variants:** the selected character's hero sprite replaces the Apprentice in the battle arena and on the main menu's title scene. The five new sprites share the Apprentice's palette structure and size, so they sit on the same floor and frame.
- **Dialogs and overlays** (`ConfirmDialog.tsx`, pause panel, tooltips): gold-framed panels over a `--bg-deep` scrim at ~70% opacity. Tooltips are small bronze-framed panels with body-font text.
- **Top bar** (`run.css` `.topbar`): a dark strip with a bronze bottom rule; stage, HP, and gold in the pixel font. The gold counter (here and on the player card in a fight) is a focusable `Tip` that gives the interest the next win would pay.

## 8. Pixel-Art Sprites

- Sprites stay **code-drawn pixel grids** in `src/data/sprites.ts` (or beside their component, like `DROP_ROWS` in `PaintDrop.tsx`, the game's one 12×12 paint drop, also used on the dice faces), rendered by `PixelSprite`. No image files, no external sprite sheets.
- Every frame in a sheet is a rectangle of the same size (`src/data/sprites.test.ts` checks this); add new sheets to that test.
- New UI sprites for this theme: **cauldron**, **potion vial** (empty / filled / cracked), **target ring**, **area ("hits all") icon**, **coin**, intent/badge icons where emoji read poorly, and optional floor-tile and star tiles.
- Palettes use the values in §2. Outlines use `--bg`'s value. Fill colors that depend on paint (vial liquid, socket glow) are passed in at render time, as `dropPalette` does.
- Scale by whole pixels only. Desktop fighters scale with the window, 4× to 14× (`fighterPixel`, §5); UI sprites pick a fixed whole-pixel scale per breakpoint.

## 9. Motion

- Motion is short and physical: buttons press down, drops lift, the vial pulses, stars twinkle slowly.
- Everything new must respect `prefers-reduced-motion: reduce`: no pulses, bobs, or twinkles; state changes become instant. Follow the existing `@media (prefers-reduced-motion: reduce)` blocks in `battle.css` and `fx.css`, and `useReducedMotion` in `anim.ts` for JS-driven motion.
- No motion blocks input or changes timing of the event playback (`usePlayback.ts`).

## 10. Technical Constraints

- **Where changes go:** `src/ui/` (CSS and components), `src/data/sprites.ts` (new UI sprites), and `index.html` (font loading). No changes to `src/engine/` or gameplay data; the redesign is visual only.
- **Keep all interaction working:** drag-and-drop (`useDrag.ts`, `data-drop` targets), click/tap-to-place, keyboard (Enter to lift/place, Escape to go back, focusable tooltips), and all `aria-*` labels. Decorative sprites and backdrops are `aria-hidden`.
- **Keep the responsive breakpoints:** `useDesktop` (`min-width: 900px`) in `useMediaQuery.ts` and the matching CSS `@media` blocks; desktop fighter sizes come from the window size (`useWindowSize`, `fighterPixel`). The desktop battle screen still fills the window with no scrolling; phones keep the single column.
- **Performance:** backdrops are CSS gradients or small tiled sprites, not large images; no heavy shaders or canvas effects.
- **Tokens first:** new colors are added as tokens in §2 before use. Update this file when a token, utility, or rule changes.
