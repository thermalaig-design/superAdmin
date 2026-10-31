/** Fields of the two trust detail popups. `kind` is also the API path segment (`/:trustId/<kind>-details`). */
export const DETAIL_FORMS = {
  bank: {
    title: 'Bank Details',
    emptyText: 'No bank details added for this trust yet.',
    deleteText: 'Delete these bank details? This cannot be undone.',
    fields: [
      { key: 'beneficiary_name', label: 'Beneficiary Name' },
      { key: 'bank_name', label: 'Bank Name' },
      { key: 'account_no', label: 'Account Number' },
      { key: 'ifsc_code', label: 'IFSC Code' },
      { key: 'swift_code', label: 'SWIFT Code' },
      { key: 'branch', label: 'Branch', wide: true },
      { key: 'upi_id', label: 'UPI ID' },
      { key: 'name', label: 'Contact Name', required: true },
      { key: 'mobile', label: 'Mobile', type: 'tel', required: true },
      { key: 'email_id', label: 'Email', type: 'email' },
      { key: 'qr', label: 'QR Image Link', wide: true, image: true },
    ],
  },
  company: {
    title: 'Company Details',
    emptyText: 'No company details added for this trust yet.',
    deleteText: 'Clear all company details of this trust? The trust itself stays.',
    fields: [
      { key: 'legal_name', label: 'Legal Name', wide: true },
      { key: 'gst_number', label: 'GST Number' },
      { key: 'pan_number', label: 'PAN Number' },
      { key: 'mobile', label: 'Mobile', type: 'tel' },
      { key: 'email_id', label: 'Email', type: 'email' },
      { key: 'website', label: 'Website', wide: true },
      { key: 'keyword', label: 'App Type' },
      { key: 'expected_members', label: 'Expected Members', type: 'number' },
      { key: 'remark', label: 'Remark', wide: true },
    ],
  },
};
