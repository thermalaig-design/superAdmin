// Numbers are stored as 10 digits, so a pasted "+91 …" or "0…" prefix has to be dropped to match.
function normalizeDigits(text) {
  const digits = text.replace(/\D/g, '');
  if (digits.length > 10 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length > 10 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

/**
 * Filters trusts by trust name, super user name or super user number.
 * Names match case-insensitively anywhere in the text; the number matches on digits only,
 * so "98999 48", "+91 98999 48848" or "09899948848" all find 9899948848.
 */
export function searchTrusts(trusts, query) {
  const text = query.trim().toLowerCase();
  if (!text) return trusts;

  // Only treat the query as a phone number when it looks like one, so "shop 24" doesn't match numbers.
  const digits = /^[\d\s+\-().]+$/.test(text) ? normalizeDigits(text) : '';

  return trusts.filter(
    (trust) =>
      trust.name?.toLowerCase().includes(text) ||
      trust.superUserName?.toLowerCase().includes(text) ||
      (digits !== '' && String(trust.superUserNumber ?? '').includes(digits))
  );
}
