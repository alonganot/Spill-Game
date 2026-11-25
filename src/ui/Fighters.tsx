import { forwardRef, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { HERO_SPRITE, type EnemyFrame, type HeroFrame, type SpriteSheet } from '../data/sprites';
import { useReducedMotion } from './anim';
import type { FloatText, StageFx } from './fx';
import { PixelSprite } from './PixelSprite';

const BLINK_EVERY_MS = 2800;
const BLINK_FOR_MS = 140;

/** Alternates an enemy between its idle and blink frames every few seconds. */
function useBlink(): boolean {
  const [blinking, setBlinking] = useState(false);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) {
      setBlinking(false);
      return;
    }
    let closeTimer: ReturnType<typeof setTimeout> | undefined;
    // A little jitter so the blink doesn't feel mechanical; UI-only randomness.
    const openTimer = setInterval(() => {
      setBlinking(true);
      closeTimer = setTimeout(() => setBlinking(false), BLINK_FOR_MS);
    }, BLINK_EVERY_MS + Math.random() * 800);
    return () => {
      clearInterval(openTimer);
      clearTimeout(closeTimer);
    };
  }, [reduced]);
  return blinking;
}

/** Numbers that rise from a combatant on the current beat. */
function Floats({ floats }: { floats: readonly FloatText[] }) {
  if (floats.length === 0) return null;
  return (
    <div className="floats" aria-hidden="true">
      {floats.map((f, i) => (
        <span key={i} className={`float float-${f.kind}`} style={{ animationDelay: `${i * 110}ms` }}>
          {f.text}
        </span>
      ))}
    </div>
  );
}

interface StageProps {
  fx: StageFx | null;
  floats: readonly FloatText[];
  /** Changes every beat, so an effect replays even if the previous beat had the same one. */
  beatKey: string;
  defeated: boolean;
  /** Sprite size in CSS px; the sprite scales by whole pixels to fit. */
  size: number;
}

export const EnemyStage = forwardRef<HTMLDivElement, StageProps & { sprite: SpriteSheet<EnemyFrame>; name: string }>(
  function EnemyStage({ sprite, name, fx, floats, beatKey, defeated, size }, ref) {
    const blinking = useBlink();
    return (
      <div className="sprite-stage" ref={ref} style={{ width: size, height: size }}>
        {/* The bob and defeat fade sit outside the per-beat key, so a new beat never restarts them. */}
        <div className={defeated ? 'defeated' : 'bob'}>
          <div key={fx ? `fx-${beatKey}` : 'still'} className={`fighter${fx ? ` fx-${fx}` : ''}`}>
            <PixelSprite sprite={sprite} frame={blinking && !defeated ? 'blink' : 'idle'} size={size} label={name} />
          </div>
        </div>
        <Floats key={`floats-${beatKey}`} floats={floats} />
      </div>
    );
  },
);

function heroFrame(fx: StageFx | null): HeroFrame {
  if (fx === 'cast') return 'cast';
  if (fx === 'hit' || fx === 'poison' || fx === 'burn') return 'hit';
  return 'idle';
}

export const HeroStage = forwardRef<HTMLDivElement, StageProps>(function HeroStage(
  { fx, floats, beatKey, defeated, size },
  ref,
) {
  return (
    <div className="hero-stage" ref={ref}>
      <div className={defeated ? 'defeated' : 'bob bob-slow'}>
        <div key={fx ? `fx-${beatKey}` : 'still'} className={`fighter${fx ? ` fx-${fx}` : ''}`}>
          <PixelSprite sprite={HERO_SPRITE} frame={heroFrame(fx)} size={size} label="You" />
        </div>
      </div>
      <Floats key={`floats-${beatKey}`} floats={floats} />
    </div>
  );
});

/** A bolt of paint that flies from the hero to the enemy when a spell is cast. */
export function Projectile({
  from,
  to,
  color,
}: {
  from: RefObject<HTMLElement | null>;
  to: RefObject<HTMLElement | null>;
  color: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const start = from.current?.getBoundingClientRect();
    const end = to.current?.getBoundingClientRect();
    const el = ref.current;
    if (!start || !end || !el) return;
    const sx = start.left + start.width * 0.75;
    const sy = start.top + start.height * 0.25;
    const tx = end.left + end.width / 2;
    const ty = end.top + end.height / 2;
    el.style.left = `${sx}px`;
    el.style.top = `${sy}px`;
    el.style.setProperty('--dx', `${tx - sx}px`);
    el.style.setProperty('--dy', `${ty - sy}px`);
    el.classList.add('flying');
  }, [from, to]);
  return <span ref={ref} className="projectile" style={{ '--fx-color': color } as CSSProperties} aria-hidden="true" />;
}
