import { Link } from 'react-router-dom';

import CountUp from '../../../components/CountUp';
import { card, ghostButton, primaryButton } from '../utils/ui';

// Bits of paper that burst out of the medal: positions come from the index, so every render looks the same.
const COLORS = ['#22c3ae', '#8b5cf6', '#f2784b', '#fbbf24', '#6366f1', '#12803a'];
const CONFETTI = Array.from({ length: 28 }, (_, i) => {
  const angle = (i / 28) * Math.PI * 2 + (i % 3) * 0.2;
  const reach = 90 + ((i * 37) % 70);
  return {
    '--x': `${Math.round(Math.cos(angle) * reach)}px`,
    '--y': `${Math.round(Math.sin(angle) * reach - 20)}px`,
    '--r': `${(i * 83) % 540}deg`,
    '--c': COLORS[i % COLORS.length],
    animationDelay: `${0.7 + (i % 5) * 0.04}s`,
  };
});

const Line = ({ value, label, tone, delay }) => (
  <div className="mi-rise flex items-baseline gap-3" style={{ '--d': `${delay}ms` }}>
    <span className={`min-w-12 text-right text-3xl font-bold tabular-nums ${tone}`}>
      <CountUp value={value} />
    </span>
    <span className="text-(--c-text-2)">{label}</span>
  </div>
);

/** Step 3: what happened. `result` = { created, added, updated, failedLinks }. */
function DoneStep({ result, trustName, onRetry, onAnother, busy, error }) {
  const failed = result.failedLinks.length;
  return (
    <div className="mi-stage space-y-5">
      <section className={`${card} relative overflow-hidden py-10 text-center`}>
        {!failed && CONFETTI.map((style, index) => <span key={index} className="mi-confetti" style={style} aria-hidden="true" />)}
        <div className="mi-medal" data-warn={failed > 0} aria-hidden="true">
          {failed ? '!' : '✓'}
        </div>
        <h2 className="mt-5 text-2xl font-bold">{failed ? 'Import finished with some problems' : 'Import complete'}</h2>
        <p className="mt-1 text-(--c-text-3)">{trustName}</p>

        <div className="mx-auto mt-6 inline-flex flex-col gap-3 text-left">
          <Line value={result.added} label="members added to this trust" tone="text-(--c-good)" delay={500} />
          <Line value={result.created} label="of them are brand new people" tone="text-(--c-link)" delay={620} />
          <Line value={result.updated} label="existing members updated (role, membership number)" tone="text-(--c-c4)" delay={740} />
          {failed > 0 && <Line value={failed} label="could not be added" tone="text-(--c-bad-text)" delay={860} />}
        </div>
      </section>

      {failed > 0 && (
        <section className={card} style={{ '--d': '300ms' }}>
          <h3 className="font-semibold text-(--c-bad-text)">{failed} members could not be added</h3>
          <p className="mt-1 text-sm text-(--c-text-3)">Nothing was duplicated. Trying again only retries the ones that are missing.</p>
          <ul className="mt-3 max-h-48 overflow-auto text-sm">
            {result.failedLinks.map((f) => (
              <li key={f.rowNumber} className="border-b border-(--c-border) py-1.5 last:border-0">
                Row {f.rowNumber} · {f.name} ({f.mobile}) <span className="text-(--c-muted)">— {f.reason}</span>
              </li>
            ))}
          </ul>
          {error && <p className="mt-3 text-sm text-(--c-bad-text)">{error}</p>}
          <button type="button" className={`${primaryButton} mt-4`} onClick={onRetry} disabled={busy}>
            {busy ? 'Trying again…' : 'Try again'}
          </button>
        </section>
      )}

      <div className="mi-rise flex flex-wrap justify-center gap-3" style={{ '--d': '900ms' }}>
        <button type="button" className={ghostButton} onClick={onAnother}>
          Import another file
        </button>
        <Link to="/organization-insights" className={primaryButton}>
          Back to Organization Insights
        </Link>
      </div>
    </div>
  );
}

export default DoneStep;
