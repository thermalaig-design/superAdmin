import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { login } from '../services/authService';
import MobileField from './MobileField';
import SecretCodeField from './SecretCodeField';
import { ArrowIcon, ShieldIcon } from './icons';

const MOBILE_LENGTH = 10;
const CODE_LENGTH = 6;

const digitsOnly = (value, max) => value.replace(/\D/g, '').slice(0, max);

function LoginForm() {
  const navigate = useNavigate();

  const [mobile, setMobile] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (mobile.length !== MOBILE_LENGTH) {
      setError(`Enter a valid ${MOBILE_LENGTH}-digit mobile number`);
      return;
    }
    if (code.length !== CODE_LENGTH) {
      setError(`Enter your ${CODE_LENGTH}-digit secret code`);
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(mobile, code);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid mobile number or secret code');
    } finally {
      setLoading(false);
    }
  };

  const useDifferentAccount = () => {
    setMobile('');
    setCode('');
    setError('');
    document.getElementById('mobile')?.focus();
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-9">
      <MobileField value={mobile} onChange={(v) => setMobile(digitsOnly(v, MOBILE_LENGTH))} />
      <SecretCodeField value={code} onChange={(v) => setCode(digitsOnly(v, CODE_LENGTH))} />

      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 flex h-14 w-full cursor-pointer items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#ee7b3e] via-[#b04a4f] to-[#5b2650] text-lg font-medium text-white shadow-[0_8px_18px_rgba(120,40,70,0.3)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? 'Signing in…' : 'Sign In'}
        {!loading && <ArrowIcon />}
      </button>

   
    </form>
  );
}

export default LoginForm;
