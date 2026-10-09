function BrandMark({ className = '' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="currentColor" aria-hidden="true">
      <path d="M32 4 6 17v5h52v-5L32 4Zm0 6.5L47 18H17l15-7.5Z" />
      <rect x="10" y="26" width="6" height="26" />
      <rect x="21" y="26" width="6" height="26" />
      <rect x="37" y="26" width="6" height="26" />
      <rect x="48" y="26" width="6" height="26" />
      <rect x="6" y="54" width="52" height="4" />
    </svg>
  );
}

export default BrandMark;
