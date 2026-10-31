/** Reading a member file (CSV / XLSX), checking each row, and the sample file people can download. */

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const REQUIRED_COLUMNS = ['Name', 'Mobile', 'Role', 'Membership Number'];
const TEMPLATE_HEADERS = [
  'Name', 'Address Home', 'Company Name', 'Address Office', 'Resident Landline', 'Office Landline',
  'Contact', 'Mobile', 'Email', 'Membership Number', 'Role', 'Remarks',
];

/** A 10 digit Indian mobile number from "+91 98765-43210", "098765 43210" ...; null if it is not one. */
export function normalizePhone(raw) {
  if (!raw) return null;
  let phone = String(raw).trim().replace(/[\s\-().]/g, '').replace(/^\+/, '');
  if (phone.length === 12 && phone.startsWith('91')) phone = phone.slice(2);
  if (phone.length === 11 && phone.startsWith('0')) phone = phone.slice(1);
  return /^[6-9]\d{9}$/.test(phone) ? phone : null;
}

/** The first usable mobile in a cell that holds several ("98765 43210 / 91234 56789"). */
function firstPhone(raw) {
  if (!raw) return null;
  const parts = String(raw).split(/[\s,;/]+/).filter(Boolean);
  for (const part of parts) {
    const phone = normalizePhone(part);
    if (phone) return phone;
  }
  return normalizePhone(parts.join(''));
}

/** What is wrong with a row, in words a person can act on. */
export function problemsOf(row) {
  const problems = [];
  if (!row.name.trim()) problems.push('Name is empty');
  if (!row.rawPhone.trim()) problems.push('Mobile is missing');
  else if (!normalizePhone(row.rawPhone)) problems.push('Mobile is not a valid 10 digit number');
  if (!row.role.trim()) problems.push('Role is missing');
  if (!row.membershipNumber.trim()) problems.push('Membership Number is missing');
  return problems;
}

/** Re-computes the clean mobile and the problems after a row changed. */
export const checked = (row) => ({ ...row, phone: normalizePhone(row.rawPhone), problems: problemsOf(row) });

const keyOf = (header) => String(header).toLowerCase().replace(/[^a-z0-9]/g, '');
const ALIASES = {
  name: ['name'],
  rawPhone: ['mobile', 'phone', 'mobilenumber'],
  email: ['email', 'emailid'],
  role: ['role'],
  membershipNumber: ['membershipnumber', 'membershipno', 'membership'],
  addressHome: ['addresshome'],
  companyName: ['companyname'],
  addressOffice: ['addressoffice'],
  residentLandline: ['residentlandline'],
  officeLandline: ['officelandline'],
  contact: ['contact'],
  remarks: ['remarks', 'remark', 'companydescription'],
};

function toRow(raw, rowNumber) {
  const cells = {};
  Object.entries(raw).forEach(([header, value]) => {
    const key = keyOf(header);
    if (!(key in cells)) cells[key] = value === null || value === undefined ? '' : String(value).trim();
  });
  const get = (field) => ALIASES[field].map((alias) => cells[alias]).find((value) => value) ?? '';

  const rawPhone = get('rawPhone');
  const row = { rowNumber };
  Object.keys(ALIASES).forEach((field) => (row[field] = get(field)));
  row.rawPhone = firstPhone(rawPhone) ?? rawPhone; // keep the original text when nothing usable is found, so it can be fixed
  return checked(row);
}

/** Reads the file and returns one checked row per non-empty line. Row numbers match the line in the sheet. */
export async function readMemberFile(file) {
  let records;
  if (/\.csv$/i.test(file.name)) {
    const { default: Papa } = await import('papaparse');
    records = await new Promise((resolve, reject) =>
      Papa.parse(file, { header: true, skipEmptyLines: true, complete: (r) => resolve(r.data), error: reject })
    );
  } else {
    const XLSX = await import('xlsx');
    const book = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    records = XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { defval: '' });
  }
  return records
    .map((record, index) => ({ record, rowNumber: index + 2 }))
    .filter(({ record }) => Object.values(record).some((value) => String(value ?? '').trim() !== ''))
    .map(({ record, rowNumber }) => toRow(record, rowNumber));
}

/** The fields the server needs for a row. */
export const forServer = (row) => ({
  rowNumber: row.rowNumber,
  name: row.name.trim(),
  phone: row.phone,
  email: row.email,
  role: row.role.trim(),
  membershipNumber: row.membershipNumber.trim(),
  addressHome: row.addressHome,
  companyName: row.companyName,
  addressOffice: row.addressOffice,
  residentLandline: row.residentLandline,
  officeLandline: row.officeLandline,
  contact: row.contact,
  remarks: row.remarks,
});

export const nameKey = (row) => `${row.name.trim().toLowerCase()}||${row.phone}`;

function saveFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function downloadTemplate() {
  const XLSX = await import('xlsx');
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS]), 'Members');
  XLSX.writeFile(book, 'members_upload_format.xlsx');
}

export async function downloadProblemRows(rows) {
  const { default: Papa } = await import('papaparse');
  const csv = Papa.unparse(
    rows.map((row) => ({
      'Row No.': row.rowNumber,
      Name: row.name,
      Mobile: row.rawPhone,
      Role: row.role,
      'Membership Number': row.membershipNumber,
      Problems: row.problems.join(' | '),
    }))
  );
  saveFile(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), 'rows_to_fix.csv');
}
