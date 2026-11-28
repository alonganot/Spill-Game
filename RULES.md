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
  - `White` — Purity: cleansing, holy protection
  - `Black` — Shadow / Curse: silencing enemies, making them take more damage
- Starter dice stay Red/Blue/Green. White and Black arrive through themed shop dice and Repaint (§4).
- **Mixing:** Consumes specified input colors from the Color Pool and adds one resulting secondary color to the Color Pool:
  - `Red + Blue -> Purple`
  - `Blue + Green -> Cyan`
  - `Red + Green -> Orange`
  - `Red + White -> Pink` — Heal
  - `White + Black -> Grey` — Balance: heavy defense and neutralizing
  - `Red + Black -> Crimson` — Vampiric: damage plus heal
  - `Green + Black -> Blight` — Plague: amplifies Poison
  - `Blue + White -> Frost` — Chill: weakens enemy attacks
- Mixing order doesn't matter (`Blue + Red` = `Red + Blue`). Pairs with no recipe (e.g. `Red + Red`, `Blue + Black`, `Green + White`, or anything with a secondary color) are invalid.
- **Triggering Attacks / Abilities:** Consumes required colors or combinations from the Color Pool to apply effects such as direct damage, block/shield, status effects, or multi-color/stack combos.
  - Damage, Poison, Burn, Curse, Silence, and Chill hit the **target** enemy. Block, Heal, and Cleanse go to the player.
  - **Targeting:** the player picks which living enemy a spell is aimed at (by default, the first living one). Aiming at a defeated or missing enemy is invalid.
  - **Area spells** (e.g. Splash, Miasma, Spore Cloud, Radiant Burst) apply their enemy effects to **every living enemy** instead.
  - A spell's effects resolve in their listed order (so a Block that depends on the player's statuses sees any Cleanse listed before it).
  - Attacks can be triggered any number of times per turn while colors remain.
  - Poison stacks add up. **Burn stacks add up too:** each application adds 1 Burn stack.
  - Enemies are checked for defeat right after each attack. A defeated enemy stays in its place at 0 HP and does nothing more.
- **Heal:** restores player HP, capped at max HP. Healing at full HP does nothing (the spell still resolves its other effects).
- **Cleanse:** removes Poison and Burn stacks from the player — all of them, or up to a set number of each (e.g. Radiant Burst removes 1 Poison and 1 Burn stack).
- Invalid actions (unknown attack, missing colors, no recipe, invalid target, battle already over) change nothing.

### Enemy statuses (from White/Black spells)
Enemies can carry Poison and Burn (above) plus these. All values (`curseBonus`, `chillMultiplier`, durations) live in `STATUS_CONFIG` in `src/data/`. None of them stack; applying one again just keeps it on.
- **Curse:** every instance of damage the enemy takes gets `+curseBonus` (default `3`): each spell damage effect (area included) and each Poison or Burn tick. The bonus is added before Block absorbs damage. Curse **clears at the end of the status step** of the turn it was applied (§3, step 3), so it lasts the rest of the player's turn plus that turn's status ticks.
- **Silence:** the enemy **skips its next action** (no attack, block, or status on the player). The skipped intent counts as used, so its intent cycle moves on. Silence then clears and the enemy gains **Silence Immunity**, which lasts until the end of its next action, so it always acts on the turn after a silence. Hush+ (Milestone 9) silences without granting this immunity. Silence aimed at an immune enemy does nothing: a spell whose only effect is Silence (Hush, Hush+) **can't be cast** on an immune target (its card says "Target is immune to Silence"), while a spell with other effects (Eclipse) can, and only its Silence is resisted. An enemy can therefore be silenced at most every other turn.
- **Chill:** the enemy's next action, if it is an Attack, deals `chillMultiplier` (default `0.5`) damage per hit, rounded down. Chill clears after the enemy's next action, whatever that action is. A silenced enemy keeps its Chill until the action it actually takes.

### Spell upgrades (`+`) (Milestone 9)
- A spell with an `upgrade` config in `src/data/attacks.ts` can be upgraded once per run to its `+` form (e.g. Inferno -> Inferno+). Spells without an `upgrade` config can never be upgraded (after Milestone 9, that is none of the 24 starting spells).
- An upgrade changes the spell's numbers or effects, never its color cost, so a dice setup that already cast the spell still works.
- Upgraded stats are roughly +30% to +50% on the numeric value. Area spells are the exception: they cost two colors and hit every enemy, so their upgrades roughly double (up to +100%). Where it fits, an upgrade adds a stack instead (e.g. a second Burn effect: Burn 1 -> 2 stacks).
- Upgrades last for the rest of the run: `upgradedSpells` in `RunState` lists them, and every later fight resolves them with the `+` effects.
- The upgraded spell is shown as `Name+` everywhere the spell appears (workbench, Spellbook, previews, tooltips, the battle log).
- Upgrades are offered at Reward stops and Shop stops (§4). Every choice drawn from the run RNG is part of the action log, so saves replay exactly.
- The `+` forms (`upgrade` in `src/data/attacks.ts`) add a second Burn to Inferno+ and Wildfire+, Chill to Prism+, make Hex+ curse every enemy, and make Hush+ silence without granting Silence Immunity (so the enemy can be silenced again right after its skipped action).

## 3. Turn Structure & Resolution Order
1. **Start of Player Turn:** The player's Block from the previous turn expires (resets to `0`). Roll dice and add resulting colors to the Color Pool (respecting `MAX_POOL_SIZE`).
2. **Player Action Phase:** The player may perform any valid sequence of mixes and attack triggers using available colors in the Color Pool, then end the turn. Heal, Cleanse, Curse, Silence, and Chill take effect immediately when their spell is cast.
3. **End of Turn / Status & Enemy Phase:**
   - Resolve status effects (each living enemy in order, then the player; Poison before Burn):
     - **Poison:** Deals damage equal to current stack count, then decreases stacks by `1` (removed when reaching `0`).
     - **Burn:** Deals the configured burn damage **per stack** (e.g. 2 stacks × 4 = 8), then every stack is **removed** (cleared).
     - A **Cursed** enemy takes `+curseBonus` on each of these ticks (once for its Poison tick, once for its Burn tick).
     - Status damage **ignores Block** and goes straight to HP.
   - **Curse clears** from every enemy once the status step is done.
   - Each living enemy acts in order, left to right, on its own intent:
     - An enemy's own Block resets right before it acts (Silenced or not), so Block it gains lasts through the player's next turn.
     - **Silenced:** the enemy skips this action; Silence clears and Silence Immunity starts. Otherwise it acts:
     - **Attack:** deals damage `hits` times (default once), each hit reduced by **Chill** if the enemy is chilled. Each hit reduces **Block** first, then **HP**; hits stop once the player is down.
     - **Block:** the enemy gains Block.
     - **Poison:** adds Poison stacks to the player.
     - **Burn:** adds 1 Burn stack to the player.
     - After an enemy really acts (not Silenced), its **Chill** and **Silence Immunity** clear.
     - Each enemy's intents run in their listed order and loop. Every enemy's next intent is shown to the player, marked when it will be skipped (Silenced) or weakened (Chilled).
   - Check victory/defeat conditions after each resolution step. The battle is won the moment **every** enemy is defeated. If the player is defeated, no new turn starts.

## 4. Run Loop
- A run is **15 fights in 3 acts of 5**. Fights 1–3 have one enemy; from fight 4 on, every fight has 2–3. Elites are fights 3, 8, and 13; act bosses (with minions) are fights 5, 10, and 15. Act 3 reuses earlier enemies, tougher.
- **After every fight but the last:** a free **Reward** pick, then a **Shop**, then the next fight. Beating the final boss wins the run; losing any fight ends it.
- **HP carries over** between fights (including HP healed during a fight). Block, all statuses (player and enemy), and the Color Pool reset at the start of each fight.
- Each won fight pays **gold** (elites and bosses pay more), plus a **leftover paint bonus**: 1 gold for every color still in the Color Pool when the fight is won. Unspent gold carries over.
- **Gold interest:** every won fight (the final boss included) also pays **+1 gold for every 5 gold held**, rounded down, up to **+5** (reached at 25 gold). It is counted on the gold held when the fight is won, before that fight's own gold is added (e.g. winning with 18 gold held pays +3). `INTEREST_GOLD_STEP` and `MAX_INTEREST_GOLD` in `src/data/economy.ts`.
- The Victory popup shows the base gold, the leftover paint bonus, the interest (when there is any), and the total. Hovering or tapping the gold counter (top bar, or the player card in a fight) tells you the interest your next win would pay.
- **Dice:** a run starts with the dice and max HP of the character it was started with (see Characters below). Every character starts with a **dice cap** of 3. Dice faces are base colors only (Red, Blue, Green, White, Black).
- **Reward stops:** pick 1 of 3 offers: Gold, Heal (can't go above max HP), and one more that the run RNG picks between Free repaint (to any base color, White and Black included) and **Free Spell Upgrade**, at even odds (`upgradeRewardChance`). Free Spell Upgrade is left out once no spell can be upgraded. A Free Spell Upgrade offer names its spell up front (e.g. `Upgrade Inferno -> Inferno+`) with a preview of the `+` form (its new numbers highlighted). Elite and boss rewards are bigger.
- **Shop stops** (leave whenever you like):
  - **Repaint a face:** set any face of any owned die to Red, Blue, Green, White, or Black. Repeatable; the price rises after each purchase.
  - **Heal:** restore a fixed amount of HP for gold (not allowed at full HP).
  - **+1 dice cap:** price rises after each purchase; the cap can't go above 6.
  - **Spell upgrades:** three options while an upgradable spell is left, each with its own price (see §2). Each can be bought **once per visit**:
    1. **Spotlight Upgrade** (cheapest, 25g): one spell, picked by the run RNG on arrival at the shop (after the reward, so never the spell just upgraded), at a discount.
    2. **Draft Upgrade** (35g): you pay first, then the RNG draws up to 3 upgradable spells, and you **must** pick one: the pick can't be cancelled, comes back after a reload, and you can't leave the shop until you pick.
    3. **Targeted Upgrade** (60g, +10g for each spell upgrade bought in a shop earlier in the run; a free reward upgrade doesn't count): pick any upgradable spell.
- **Dice for sale:** 2 random themed dice per visit; each can be bought once. With a free slot under the cap, it's added to your dice; you can instead **replace** one of your dice with it (the new die takes the old one's place), and with every slot full, replacing is the only way to buy. The pool includes White/Black dice (e.g. Cleric: White/Red/Blue, Occult: Black/Green/Red, Monochrome: White/Black).
- Prices, rewards, and gold amounts live in `src/data/economy.ts`.

### Characters & Essence (Milestone 10)
- **Characters:** the run starts with the chosen character's dice and max HP. Every character starts with a dice cap of 3. The default is Apprentice.

| Character | Tier | Cost | Starting dice | Max HP |
|---|---|---|---|---|
| Apprentice | Starter (free) | — | Standard ×2 (Red ×2, Blue ×2, Green ×2) | 40 |
| Warrior | 1 | 500 Essence | Ember ×2 (Red ×4, Blue, Green) | 40 |
| Tank | 1 | 500 Essence | Lagoon (Blue ×3, Green ×3) + Standard | 42 |
| Venom | 1 | 500 Essence | Moss (Green ×4, Red, Blue) + Tide (Blue ×4, Red, Green) | 40 |
| Demon | 2 | 2,000 Essence | Standard + Shade (Black ×4, Red, Green) | 40 |
| Healer | 2 | 2,000 Essence | Standard + Halo (White ×4, Red, Blue) | 28 |

- Shade and Halo are starting dice only; the shop doesn't sell them.

- **Choosing and unlocking:** New run opens the Character Select screen (after the abandon confirmation, if a run is in progress). There you pick a character to start with, or spend Essence to unlock one. Continue skips it and resumes the saved run with its own character. Unlocks are permanent and can be bought in any order.
- **Essence** is a permanent currency, kept apart from run saves (in `spill.meta.v1`). It is earned once, when a run is won or lost (abandoning or restarting a run pays nothing):
  - Remaining gold ÷ 5, rounded down.
  - +3 per fight won.
  - +30 for winning the run.
  - Example: a win with 60 gold left pays 12 + 45 + 30 = 87 Essence. A loss in fight 8 with 20 gold left pays 4 + 21 = 25 Essence.
- **Seeded runs** (started from a seed typed in Settings) pay no Essence, so a shared seed can't be farmed for it. Replaying or restarting a random run's own seed still pays.
- The run saves its character, so a saved run replays with the same starting dice and HP. A run saved before this milestone is treated as the Apprentice.

## 5. Balancing & Configuration Rule
- Numerical values (damage, block, heal, status values, pool limits, dice faces) live in `src/data/` configs rather than hardcoded inside `src/engine/`.
- When gameplay rules change, update `RULES.md` alongside `src/data/` and `src/engine/` unit tests.
