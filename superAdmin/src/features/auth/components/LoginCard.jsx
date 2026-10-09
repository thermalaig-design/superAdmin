import LoginForm from './LoginForm';

function LoginCard() {
  return (
    <div className="rounded-[2rem] bg-white px-8 py-14 shadow-[0_20px_60px_rgba(80,40,60,0.12)] sm:px-12 lg:px-[6%] lg:py-[11%]">
      <p className="text-[0.65rem] font-medium uppercase tracking-[0.4em] text-[#3a3f55]">
        Super Admin Panel
      </p>
      <div className="mt-3 h-0.5 w-11 bg-[#e8793f]" />

      <h1 className="mt-10 text-5xl font-bold tracking-tight">
        Welcome{' '}
        <span className="bg-gradient-to-r from-[#e8793f] to-[#b84a4a] bg-clip-text text-transparent">
          back
        </span>
      </h1>
      <p className="mt-3 text-lg leading-snug text-[#5b627a]">
        Enter your mobile number and secret code to access the Super Admin panel.
      </p>

      <LoginForm />
    </div>
  );
}

export default LoginCard;
