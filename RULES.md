# RULES.md — Spill Core Combat & Turn Rules

## 1. Color Pool & Carry-Over
- Rolling dice at the start of a turn adds rolled colors to the active **Color Pool**.
- Unspent colors in the Color Pool **carry over** to subsequent turns (up to `MAX_POOL_SIZE` configured in `src/data/`).
- Whenever a color is consumed—either to **mix** a new color or to **trigger** an attack/ability—it is immediately **removed** from the Color Pool.
- If a roll would overflow the pool, colors are added in dice order until the pool is full; the rest are **discarded** (reported in the `rolled` event).

## 2. Base Colors, Mixing & Triggering Attacks
- **Base Dice Colors:**
  - `Red` — Fire
  - `Blue` — Water
  - `Green` — Nature / Poison
- **Mixing:** Consumes specified input colors from the Color Pool and adds one resulting secondary color to the Color Pool:
  - `Red + Blue -> Purple`
  - `Blue + Green -> Cyan`
  - `Red + Green -> Orange`
- Mixing order doesn't matter (`Blue + Red` = `Red + Blue`). Pairs with no recipe (e.g. `Red + Red`, or anything with a secondary color) are invalid.
- **Triggering Attacks / Abilities:** Consumes required colors or combinations from the Color Pool to apply effects such as direct damage, block/shield, status effects, or multi-color/stack combos.
  - Damage, Poison, and Burn target the enemy; Block goes to the player.
  - Attacks can be triggered any number of times per turn while colors remain.
  - Poison stacks add up. Burn doesn't stack: applying it again while burning has no extra effect.
  - The enemy is checked for defeat right after each attack.
- Invalid actions (unknown attack, missing colors, no recipe, battle already over) change nothing.

## 3. Turn Structure & Resolution Order
1. **Start of Player Turn:** The player's Block from the previous turn expires (resets to `0`). Roll dice and add resulting colors to the Color Pool (respecting `MAX_POOL_SIZE`).
2. **Player Action Phase:** The player may perform any valid sequence of mixes and attack triggers using available colors in the Color Pool, then end the turn.
3. **End of Turn / Status & Enemy Phase:**
   - Resolve status effects (enemy first, then player; Poison before Burn):
     - **Poison:** Deals damage equal to current stack count, then decreases stacks by `1` (removed when reaching `0`).
     - **Burn:** Deals fixed configured damage, then is immediately **removed** (cleared).
     - Status damage **ignores Block** and goes straight to HP.
   - Resolve enemy intent/action (damage reduces **Block/Shield** first, then **HP**).
     - Enemy intents run in their listed order and loop. The next one is shown to the player.
     - The enemy's own Block resets right before it acts, so Block it gains lasts through the player's next turn.
   - Check victory/defeat conditions after each resolution step. If the enemy is defeated, the battle ends at once (it doesn't act). If the player is defeated, no new turn starts.

## 4. Balancing & Configuration Rule
- Numerical values (damage, block, status values, pool limits, dice faces) live in `src/data/` configs rather than hardcoded inside `src/engine/`.
- When gameplay rules change, update `RULES.md` alongside `src/data/` and `src/engine/` unit tests.