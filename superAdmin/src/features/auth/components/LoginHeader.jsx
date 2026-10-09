import BrandMark from './BrandMark';

function LoginHeader() {
  return (
    <header className="relative z-10 flex items-center justify-between px-6 pt-8 sm:px-10 lg:px-[5.7%]">
      <div className="flex items-center gap-4">
        <BrandMark className="h-14 w-12 text-[#c98a4b]" />
        <p className="text-lg font-medium leading-tight">
          Thermal Engineers and
          <br />
          Insulators Private Limited (TEI)
        </p>
      </div>
      <div className="hidden items-center gap-3 text-[0.65rem] font-medium uppercase tracking-[0.4em] text-[#3a3f55] sm:flex lg:pr-[1%]">
        Super Admin
        <span className="h-0.5 w-10 bg-[#e8793f]" />
      </div>
    </header>
  );
}

export default LoginHeader;
