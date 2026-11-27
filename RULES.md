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
  - Damage, Poison, and Burn hit the **target** enemy; Block goes to the player.
  - **Targeting:** the player picks which living enemy a spell is aimed at (by default, the first living one). Aiming at a defeated or missing enemy is invalid.
  - **Area spells** (e.g. Splash, Miasma) apply their Damage, Poison, or Burn to **every living enemy** instead.
  - Attacks can be triggered any number of times per turn while colors remain.
  - Poison stacks add up. Burn doesn't stack: applying it again while burning has no extra effect.
  - Enemies are checked for defeat right after each attack. A defeated enemy stays in its place at 0 HP and does nothing more.
- Invalid actions (unknown attack, missing colors, no recipe, invalid target, battle already over) change nothing.

## 3. Turn Structure & Resolution Order
1. **Start of Player Turn:** The player's Block from the previous turn expires (resets to `0`). Roll dice and add resulting colors to the Color Pool (respecting `MAX_POOL_SIZE`).
2. **Player Action Phase:** The player may perform any valid sequence of mixes and attack triggers using available colors in the Color Pool, then end the turn.
3. **End of Turn / Status & Enemy Phase:**
   - Resolve status effects (each living enemy in order, then the player; Poison before Burn):
     - **Poison:** Deals damage equal to current stack count, then decreases stacks by `1` (removed when reaching `0`).
     - **Burn:** Deals fixed configured damage, then is immediately **removed** (cleared).
     - Status damage **ignores Block** and goes straight to HP.
   - Each living enemy acts in order, left to right, on its own intent:
     - **Attack:** deals damage `hits` times (default once). Each hit reduces **Block** first, then **HP**; hits stop once the player is down.
     - **Block:** the enemy gains Block.
     - **Poison:** adds Poison stacks to the player.
     - **Burn:** sets the player on fire.
     - Each enemy's intents run in their listed order and loop. Every enemy's next intent is shown to the player.
     - An enemy's own Block resets right before it acts, so Block it gains lasts through the player's next turn.
   - Check victory/defeat conditions after each resolution step. The battle is won the moment **every** enemy is defeated. If the player is defeated, no new turn starts.

## 4. Run Loop
- A run is **15 fights in 3 acts of 5**. Fights 1–3 have one enemy; from fight 4 on, every fight has 2–3. Elites are fights 3, 8, and 13; act bosses (with minions) are fights 5, 10, and 15. Act 3 reuses earlier enemies, tougher.
- **After every fight but the last:** a free **Reward** pick, then a **Shop**, then the next fight. Beating the final boss wins the run; losing any fight ends it.
- **HP carries over** between fights. Block, statuses, and the Color Pool reset at the start of each fight.
- Each won fight pays **gold** (elites and bosses pay more). Unspent gold carries over.
- **Dice:** a run starts with 2 Standard dice and a **dice cap** of 3. Dice faces are base colors only.
- **Reward stops:** pick 1 of 3 offers drawn from Gold, Heal (can't go above max HP), and Free repaint. Elite and boss rewards are bigger.
- **Shop stops** (leave whenever you like):
  - **Repaint a face:** set any face of any owned die to Red, Blue, or Green. Repeatable; the price rises after each purchase.
  - **Heal:** restore a fixed amount of HP for gold (not allowed at full HP).
  - **+1 dice cap:** price rises after each purchase; the cap can't go above 6.
  - **Dice for sale:** 2 random themed dice per visit; each can be bought once and needs a free slot under the cap.
- Prices, rewards, and gold amounts live in `src/data/economy.ts`.

## 5. Balancing & Configuration Rule
- Numerical values (damage, block, status values, pool limits, dice faces) live in `src/data/` configs rather than hardcoded inside `src/engine/`.
- When gameplay rules change, update `RULES.md` alongside `src/data/` and `src/engine/` unit tests.