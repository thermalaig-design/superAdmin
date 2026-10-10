import BackgroundBubbles from '../components/BackgroundBubbles';
import HeroBubble from '../components/HeroBubble';
import LoginCard from '../components/LoginCard';
import LoginFooter from '../components/LoginFooter';
import LoginHeader from '../components/LoginHeader';

function LoginPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#fbf6f3] font-sans text-[#14213d]">
      <BackgroundBubbles />
      <HeroBubble />
      <LoginHeader />

      <main className="relative z-10 mx-auto w-full max-w-[560px] px-4 pb-24 pt-10 lg:absolute lg:left-[41.7%] lg:top-[15.2%] lg:mx-0 lg:w-[30.2%] lg:max-w-none lg:p-0">
        <LoginCard />
      </main>

      <LoginFooter />
    </div>
  );
}

export default LoginPage;
