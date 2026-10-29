/** Logo for Meta, WhatsApp, Google and Website; Organic shows its letter. Draws in the surrounding text colour. */
function SourceIcon({ sourceKey, letter, className = 'h-5 w-5' }) {
  if (sourceKey === 'meta') {
    // Meta's infinity loop
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6.4 16.2c-2 0-3.4-1.8-3.4-4.2s1.4-4.2 3.4-4.2c3.3 0 7.1 8.4 11.2 8.4 2 0 3.4-1.8 3.4-4.2s-1.4-4.2-3.4-4.2c-4.1 0-7.9 8.4-11.2 8.4z" />
      </svg>
    );
  }
  if (sourceKey === 'whatsapp') {
    // speech bubble with a phone handset
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3z" />
        <path d="M9.2 8.2c-.4.4-.6 1.1-.3 1.9.8 2.2 2.8 4.2 5 5 .8.3 1.5.1 1.9-.3l.4-.8-1.9-1-.9.7c-1-.4-2.1-1.4-2.5-2.5l.7-.9-1-1.9z" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (sourceKey === 'google' || sourceKey === 'googleclick') {
    // a "G": an open ring with a bar
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M18.8 7.2A8 8 0 1 0 20 12h-7.5" />
      </svg>
    );
  }
  if (sourceKey === 'website') {
    // a globe
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.6 2.4 4 5.5 4 9s-1.4 6.6-4 9c-2.6-2.4-4-5.5-4-9s1.4-6.6 4-9z" />
      </svg>
    );
  }
  return letter;
}

export default SourceIcon;
