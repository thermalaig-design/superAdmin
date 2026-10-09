const fieldBox =
  'flex h-14 items-center rounded-xl border border-gray-300 bg-white transition focus-within:border-[#e8793f] focus-within:ring-2 focus-within:ring-[#e8793f]/25';

function FormField({ id, label, children }) {
  return (
    <div className="mt-6 first:mt-0">
      <label htmlFor={id} className="mb-2 block text-[0.95rem] font-semibold">
        {label}
      </label>
      <div className={fieldBox}>{children}</div>
    </div>
  );
}

export default FormField;
