import { useEffect, useRef, useState } from 'react';
import { copySeed } from './seed';

const COPIED_MS = 1500;

/** "Seed 12345" with a Seeded/Random tag and a Copy button. */
export function SeedLine({ seed, seeded }: { seed: number; seeded: boolean }) {
  const [copied, setCopied] = useState<'yes' | 'failed' | null>(null);
  const valueRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (copied === null) return;
    const timer = setTimeout(() => setCopied(null), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    if (await copySeed(seed)) {
      setCopied('yes');
      return;
    }
    // The clipboard is blocked: select the number so it can be copied by hand.
    const el = valueRef.current;
    const selection = window.getSelection();
    if (el && selection) {
      const range = document.createRange();
      range.selectNodeContents(el);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    setCopied('failed');
  }

  return (
    <div className="seed-line">
      <span className="muted">Seed</span>
      <code className="seed-value" ref={valueRef}>
        {seed}
      </code>
      <span className={`seed-tag${seeded ? ' seed-tag-seeded' : ''}`}>{seeded ? 'Seeded' : 'Random'}</span>
      <button type="button" className="seed-copy" onClick={copy} aria-label={`Copy seed ${seed}`}>
        {copied === 'yes' ? 'Copied ✓' : copied === 'failed' ? 'Selected' : 'Copy'}
      </button>
      <span className="sr-only" aria-live="polite">
        {copied === 'yes' ? 'Seed copied' : copied === 'failed' ? 'Seed selected, copy it by hand' : ''}
      </span>
    </div>
  );
}
