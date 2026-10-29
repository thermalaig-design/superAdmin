import { Link, useLocation, useNavigate } from 'react-router-dom';

/**
 * "← Back" for detail pages. When the user got here from another page of the app it goes back to that exact page
 * (the browser's back, so its table settings and cached data return with it), and the label names it if the
 * link that brought the user here said so: <Link state={{ backLabel: 'Trust Insights' }} />.
 * A page opened directly has nothing to go back to, so it goes to `to` and shows `label`.
 */
function BackLink({ to, label, button = false, buttonText = "Back", compact = false }) {
  const location = useLocation();
  const navigate = useNavigate();

  // `location.key` is 'default' only for the first page of a visit.
  const hasHistory = location.key !== 'default';
  const text = hasHistory ? (location.state?.backLabel ? `Back to ${location.state.backLabel}` : 'Back') : label;

  const goBack = (event) => {
    if (!hasHistory) return;
    event.preventDefault();
    navigate(-1);
  };

  return (
    <Link
      to={to}
      onClick={goBack}
      title={text}
      data-compact={compact}
      className={
        button
          ? 'group inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-xl bg-gradient-to-r from-(--c-grad-from) via-(--c-grad-via) to-(--c-grad-to) pl-2 pr-3.5 max-sm:data-[compact=true]:px-2 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(15,120,110,0.35)] transition hover:brightness-110 hover:shadow-[0_4px_12px_rgba(15,120,110,0.4)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--c-accent)'
          : 'text-sm font-medium text-(--c-link) hover:underline'
      }
    >
      {button ? (
        <>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/25 transition-transform group-hover:-translate-x-0.5" aria-hidden="true">
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 4 6 10l6 6" />
            </svg>
          </span>
          <span className={compact ? 'hidden sm:inline' : undefined}>{buttonText}</span>
        </>
      ) : (
        <>← {text}</>
      )}
    </Link>
  );
}

export default BackLink;
