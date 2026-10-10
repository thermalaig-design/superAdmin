import logo from '../assets/setu-logo.jpg';

/** The SETU logo. The artwork has its own black background, so it is shown as a rounded tile. */
function Logo({ className = 'h-14 w-14' }) {
  return (
    <img
      src={logo}
      alt="SETU – where AI connections create power"
      className={`shrink-0 rounded-xl object-cover shadow-[0_6px_16px_rgba(20,33,61,0.18)] ${className}`}
    />
  );
}

export default Logo;
