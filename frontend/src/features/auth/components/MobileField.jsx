import FormField from './FormField';
import { ChevronIcon, IndiaFlag } from './icons';

function MobileField({ value, onChange }) {
  return (
    <FormField id="mobile" label="Mobile Number">
      <div className="flex items-center gap-2 border-r border-gray-200 px-4 text-[0.95rem] font-medium">
        <IndiaFlag />
        +91
        <ChevronIcon />
      </div>
      <input
        id="mobile"
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        autoFocus
        placeholder="Enter 10-digit mobile number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-full min-w-0 flex-1 rounded-r-xl bg-transparent px-4 outline-none placeholder:text-gray-400"
      />
    </FormField>
  );
}

export default MobileField;
