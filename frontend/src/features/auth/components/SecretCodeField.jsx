import { useState } from 'react';

import FormField from './FormField';
import { EyeIcon, LockIcon } from './icons';

function SecretCodeField({ value, onChange }) {
  const [visible, setVisible] = useState(false);

  return (
    <FormField id="code" label="Secret Code">
      <span className="pl-4 text-gray-500">
        <LockIcon />
      </span>
      <input
        id="code"
        type={visible ? 'text' : 'password'}
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="Enter 6-digit secret code"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-full min-w-0 flex-1 bg-transparent px-4 outline-none placeholder:text-gray-400"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide secret code' : 'Show secret code'}
        className="cursor-pointer pr-4 text-gray-600"
      >
        <EyeIcon off={!visible} />
      </button>
    </FormField>
  );
}

export default SecretCodeField;
