import { useState } from 'react';
import type { RepaintTarget, RewardOption, RunState } from '../engine';
import { DiceEditor } from './DiceEditor';

interface RewardScreenProps {
  run: RunState;
  onChoose: (index: number, repaint?: RepaintTarget) => void;
}

function describe(option: RewardOption, run: RunState): { icon: string; title: string; detail: string } {
  switch (option.type) {
    case 'gold':
      return { icon: '🪙', title: `+${option.amount} gold`, detail: 'Spend it at the next shop.' };
    case 'heal': {
      const healed = Math.min(option.amount, run.maxHp - run.hp);
      return {
        icon: '❤',
        title: `Heal ${option.amount} HP`,
        detail: healed === 0 ? 'You are at full HP.' : `HP ${run.hp} → ${run.hp + healed}`,
      };
    }
    case 'repaint':
      return { icon: '🎨', title: 'Free repaint', detail: 'Change one face on one of your dice.' };
  }
}

export function RewardScreen({ run, onChoose }: RewardScreenProps) {
  const [repainting, setRepainting] = useState<number | null>(null);

  if (repainting !== null) {
    return (
      <section className="panel">
        <div className="section-head">
          <h2>Free repaint</h2>
          <button type="button" className="link" onClick={() => setRepainting(null)}>
            ← Back
          </button>
        </div>
        <DiceEditor dice={run.dice} confirmLabel="Repaint for free" onRepaint={(target) => onChoose(repainting, target)} />
      </section>
    );
  }

  return (
    <section className="panel">
      <h2>Fight won! Choose a reward</h2>
      <div className="choices">
        {run.rewardOffers.map((option, index) => {
          const { icon, title, detail } = describe(option, run);
          return (
            <button
              key={index}
              type="button"
              className="choice"
              onClick={() => (option.type === 'repaint' ? setRepainting(index) : onChoose(index))}
            >
              <span className="choice-icon" aria-hidden="true">
                {icon}
              </span>
              <span>
                <span className="choice-title">{title}</span>
                <span className="choice-detail">{detail}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
