function HeroBubble() {
  return (
    <div className="pointer-events-none absolute left-[3%] top-[11%] hidden aspect-square w-[30%] lg:block" aria-hidden="true">
      <div className="h-full w-full rounded-full  bg-gradient-to-br from-[#fde6d6] to-[#fbc9a6]/80" />

      {/* <div className="absolute left-[2%] top-[14%] flex aspect-square w-[40%] flex-col items-center justify-center rounded-full border border-white/60 bg-white/55 p-4 text-center shadow-lg backdrop-blur-md">
        <p className="text-lg font-medium leading-tight">
          Trusted
          <br />
          Operations.
        </p>
        <div className="my-3 h-0.5 w-9 bg-[#e8793f]" />
        <p className="text-sm leading-snug">
          For a stronger
          <br />
          tomorrow.
        </p>
      </div>
       */}

      <div className="absolute bottom-[10%] left-[24%] flex gap-2">
        <span className="h-2 w-2 rounded-full bg-[#e8793f]" />
        <span className="h-2 w-2 rounded-full bg-white/60" />
        <span className="h-2 w-2 rounded-full bg-white/60" />
      </div>
    </div>
  );
}

export default HeroBubble;
