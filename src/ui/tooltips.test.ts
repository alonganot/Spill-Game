import { describe, expect, it } from 'vitest';
import { defaultBattleConfig } from '../data/battles';
import { MIX_RECIPES } from '../data/colors';
import { upgradeAttack, type AttackDefinition, type StatusConfig } from '../engine';
import {
  blockTip,
  burnTip,
  chillTip,
  curseTip,
  dieTip,
  effectSentence,
  intentTip,
  poisonTip,
  silenceImmuneTip,
  silenceTip,
  spellTip,
} from './format';

const status: StatusConfig = { burnDamage: 4, poisonDecay: 1, curseBonus: 3, chillMultiplier: 0.5 };
const enemy = { kind: 'enemy', name: 'Ink Blob' } as const;
const player = { kind: 'player' } as const;

describe('status tooltips', () => {
  it('explains poison with its real numbers', () => {
    expect(poisonTip(3, enemy, status)).toBe(
      'Poison 3: Ink Blob takes 3 damage at the end of each turn, then it loses 1 stack. Ignores Block.',
    );
    expect(poisonTip(2, player, { ...status, poisonDecay: 2 })).toContain('You take 2 damage');
    expect(poisonTip(2, player, { ...status, poisonDecay: 2 })).toContain('loses 2 stacks');
  });

  it('explains burn with the configured damage', () => {
    expect(burnTip(1, enemy, { ...status, burnDamage: 6 })).toBe(
      'Burn 1: Ink Blob takes 6 damage at the end of the turn, then it goes out. Ignores Block. Burning again adds a stack.',
    );
    expect(burnTip(3, enemy, { ...status, burnDamage: 6 })).toContain('takes 18 damage (6 per stack)');
  });

  it('says how long block lasts for each side', () => {
    expect(blockTip(4, player)).toContain('until your next turn starts');
    expect(blockTip(5, enemy)).toContain('until Ink Blob acts again');
  });

  it('describes the enemy intent', () => {
    expect(intentTip({ type: 'attack', amount: 6 }, 'Ink Blob', status)).toBe(
      'When you end your turn, Ink Blob attacks for 6. Your Block absorbs it first.',
    );
    expect(intentTip({ type: 'attack', amount: 3, hits: 2 }, 'Ink Blob', status)).toContain('attacks 2 times for 3 each (6 total)');
    expect(intentTip({ type: 'block', amount: 5 }, 'Ink Blob', status)).toContain('gains 5 Block');
    expect(intentTip({ type: 'poison', stacks: 3 }, 'Ink Blob', status)).toContain('poisons you for 3');
    expect(intentTip({ type: 'burn' }, 'Ink Blob', { ...status, burnDamage: 6 })).toContain('6 damage');
  });
});

describe('spell tooltips', () => {
  const steam: AttackDefinition = {
    id: 'steam',
    name: 'Steam Burst',
    cost: { purple: 1 },
    effects: [
      { type: 'damage', amount: 7 },
      { type: 'block', amount: 3 },
    ],
  };

  it('lists effects and cost, and says what to do next', () => {
    expect(spellTip(steam, 'ready', status)).toBe(
      'Steam Burst: Deals 7 damage. Gives you 3 Block. Costs Purple. You have the colors: drag them onto its slots, then Cast.',
    );
    expect(spellTip(steam, 'craftable', status, [MIX_RECIPES[0]!])).toContain('Mix first: Red + Blue → Purple.');
    expect(spellTip(steam, 'locked', status)).toContain("You don't have these colors yet.");
  });

  it('repeats a color once per unit of cost', () => {
    const inferno: AttackDefinition = { id: 'inferno', name: 'Inferno', cost: { red: 2 }, effects: [{ type: 'burn' }] };
    expect(spellTip(inferno, 'ready', status)).toContain('Costs Red + Red.');
  });

  it('covers every spell in the game', () => {
    for (const attack of defaultBattleConfig().attacks) {
      const text = spellTip(attack, 'ready', status);
      expect(text.startsWith(`${attack.name}: `)).toBe(true);
      for (const effect of attack.effects) expect(text).toContain(effectSentence(effect, status));
    }
  });
});

describe('die tooltip', () => {
  it('names the die and its faces', () => {
    expect(dieTip('Standard', ['red', 'red', 'blue', 'blue', 'green', 'green'])).toBe(
      'Standard die: Red, Red, Blue, Blue, Green, Green.',
    );
  });
});

describe('White, Pink, and Black tooltips', () => {
  it('enemy condition badges explain themselves with real numbers', () => {
    expect(curseTip('Ink Blob', status)).toContain('takes 3 more from every hit');
    expect(silenceTip('Ink Blob')).toContain('skips its next action');
    expect(silenceImmuneTip('Ink Blob')).toContain('Silence has no effect');
    expect(chillTip('Ink Blob', status)).toContain('50% damage per hit');
  });

  it('marks a skipped or chilled intent', () => {
    expect(intentTip({ type: 'attack', amount: 6 }, 'Ink Blob', status, 'skipped')).toBe(
      'Ink Blob is Silenced: it skips Attack 6 when you end your turn.',
    );
    expect(intentTip({ type: 'attack', amount: 3 }, 'Ink Blob', status, 'chilled')).toContain('attacks for 3');
    expect(intentTip({ type: 'attack', amount: 3 }, 'Ink Blob', status, 'chilled')).toContain('Chilled: 50% damage per hit');
  });

  it('describes the new spell effects', () => {
    expect(effectSentence({ type: 'heal', amount: 5 }, status)).toBe('Heals you for 5 (up to your max HP)');
    expect(effectSentence({ type: 'cleanse' }, status)).toBe('Removes all your Poison and Burn');
    expect(effectSentence({ type: 'block', amount: 12, cleanAmount: 16 }, status)).toContain('or 16 if you have no Poison or Burn');
    expect(effectSentence({ type: 'curse' }, status)).toContain('+3 damage');
    expect(effectSentence({ type: 'multiplyPoison', factor: 2 }, status)).toContain('Poison by 2');
  });
});

describe('upgraded spell tooltips', () => {
  it('names the + form, its new numbers, and what it was', () => {
    const inferno = defaultBattleConfig().attacks.find((a) => a.id === 'inferno')!;
    const tip = spellTip(upgradeAttack(inferno), 'ready', status);
    expect(tip).toMatch(/^Inferno\+: Deals 8 damage/);
    expect(tip).toContain('+2 Burn');
    expect(tip).not.toContain('+1 Burn');
    expect(tip).toContain('Upgraded from 6 dmg · burn.');
    expect(spellTip(inferno, 'ready', status)).not.toContain('Upgraded');
  });

  it('explains that Hush+ leaves no immunity', () => {
    expect(effectSentence({ type: 'silence', noImmunity: true }, status)).toContain('can be Silenced again right away');
  });
});
