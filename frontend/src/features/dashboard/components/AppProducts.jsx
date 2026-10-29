import { useMemo, useState } from 'react';

import { number } from '../utils/tableHelpers';
import { useAppProducts } from '../hooks/useAppProducts';

const PAGE = 24;
const STATUS = {
  active: { label: 'Active', className: 'bg-emerald-50 text-emerald-700' },
  inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-600' },
  draft: { label: 'Draft', className: 'bg-amber-50 text-amber-700' },
};
const BILLING = { one_time: 'one time', monthly: 'per month', yearly: 'per year', quarterly: 'per quarter' };
const rupees = (value) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/** The picture of a product; a grey box with "No image" when it has none or it does not load. */
function Picture({ src, name, extra }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-t-xl bg-(--c-band)">
      {src && !broken ? (
        <img src={src} alt={name} loading="lazy" onError={() => setBroken(true)} className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full items-center justify-center text-xs text-(--c-muted)">No image</span>
      )}
      {extra > 0 && <span className="absolute bottom-1.5 right-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[0.65rem] font-semibold text-white">+{extra} more</span>}
    </div>
  );
}

function ProductCard({ product }) {
  const status = STATUS[product.status] ?? { label: product.status ?? '—', className: 'bg-gray-100 text-gray-600' };
  const priced = product.price != null && product.price > 0;
  return (
    <li className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_1px_3px_rgba(20,33,61,0.06)]">
      <Picture src={product.image} name={product.name} extra={product.imageCount - 1} />
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="line-clamp-2 text-sm font-semibold leading-snug" title={product.name}>{product.name}</p>
        <p className="truncate text-xs text-(--c-muted)">{product.category ?? 'No category'}</p>
        <div className="mt-auto pt-2">
          {priced ? (
            <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
              <b className="text-base font-semibold tabular-nums">{rupees(product.price)}</b>
              {product.mrp && <span className="text-xs text-(--c-muted) line-through tabular-nums">{rupees(product.mrp)}</span>}
              {product.discountPct > 0 && <span className="text-xs font-semibold text-emerald-700">{product.discountPct}% off</span>}
            </p>
          ) : (
            <p className="text-sm text-(--c-muted)">Price not set</p>
          )}
          {priced && product.billing && BILLING[product.billing] && <p className="text-xs text-(--c-muted)">{BILLING[product.billing]}</p>}
          <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[0.68rem] font-semibold ${status.className}`}>{status.label}</span>
        </div>
      </div>
    </li>
  );
}

/**
 * Every product of one app as cards: picture, name, category, price (with MRP and discount when there is one) and whether it is live.
 * Searchable by name or category, and can be narrowed to Active / Inactive / Draft; 24 at a time.
 */
function AppProducts({ trustId, appName }) {
  const { data, loading, error } = useAppProducts(trustId);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [shown, setShown] = useState(PAGE);

  const products = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (data?.products ?? []).filter(
      (product) => (status === 'all' || product.status === status) && (!needle || product.name.toLowerCase().includes(needle) || (product.category ?? '').toLowerCase().includes(needle))
    );
  }, [data, search, status]);

  if (error) return <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>;
  if (loading || !data) return <div className="h-40 animate-pulse rounded-xl bg-white" />;

  const counts = { all: data.total, active: 0, inactive: 0, draft: 0 };
  data.products.forEach((product) => {
    if (counts[product.status] != null) counts[product.status] += 1;
  });

  return (
    <div>
      <p className="mb-3 text-sm font-semibold">
        {appName} <span className="font-normal text-(--c-muted)">· {number(data.total)} {data.total === 1 ? 'product' : 'products'}</span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setShown(PAGE);
          }}
          placeholder="Search a product or category"
          className="h-9 w-full rounded-full border border-gray-300 bg-white px-4 text-sm sm:w-64"
          aria-label="Search a product or category"
        />
        {['all', 'active', 'inactive', 'draft'].map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setStatus(key);
              setShown(PAGE);
            }}
            aria-pressed={status === key}
            className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold transition ${status === key ? 'border-transparent bg-(--c-link) text-white' : 'border-gray-300 bg-white text-(--c-text-2) hover:bg-gray-50'}`}
          >
            {key === 'all' ? 'All' : STATUS[key].label} {number(counts[key])}
          </button>
        ))}
      </div>

      {products.length === 0 ? (
        <p className="mt-4 text-sm text-(--c-muted)">{data.total === 0 ? 'This app has no products.' : 'No product matches.'}</p>
      ) : (
        <>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {products.slice(0, shown).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </ul>
          {shown < products.length && (
            <button type="button" onClick={() => setShown((count) => count + PAGE)} className="mt-3 cursor-pointer rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-(--c-text-2) hover:bg-gray-50">
              Show more products ({number(products.length - shown)} left)
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default AppProducts;
