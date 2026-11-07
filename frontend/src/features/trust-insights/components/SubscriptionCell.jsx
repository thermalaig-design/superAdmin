import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { saveTrustSubscription } from '../services/trustInsightsService';

const STYLES = {
  premium: 'border-amber-300 bg-amber-50 text-amber-800',
  free: 'border-gray-300 bg-gray-50 text-(--c-text-2)',
};

/**
 * A trust's plan as a coloured pill that is also the editor: pick Premium or Free and it is saved straight away
 * (Free = the plan is removed). The list is refreshed afterwards so every view agrees.
 */
function SubscriptionCell({ trust }) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(null); // what was just saved, until the refreshed list arrives
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const current = value ?? trust.subscription ?? 'free';

  const change = async (next) => {
    if (next === current) return;
    const previous = current;
    setValue(next);
    setSaving(true);
    setError('');
    try {
      await saveTrustSubscription(trust.id, next);
      await queryClient.invalidateQueries({ queryKey: ['trust-insights'] });
      setValue(null);
    } catch (err) {
      setValue(previous);
      setError(err?.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="inline-flex flex-col items-start gap-0.5">
      <select
        value={current}
        onChange={(event) => change(event.target.value)}
        disabled={saving}
        aria-label={`Subscription for ${trust.name}`}
        title="Change subscription"
        className={`cursor-pointer rounded-full border py-1 pl-2.5 pr-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-(--c-accent)/40 disabled:cursor-wait disabled:opacity-60 ${STYLES[current]}`}
      >
        <option value="premium">★ Premium</option>
        <option value="free">Free</option>
      </select>
      {error && <span className="text-[0.68rem] text-red-600" role="alert">{error}</span>}
    </div>
  );
}

export default SubscriptionCell;
