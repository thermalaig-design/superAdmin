function BackgroundBubbles() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div className="absolute -top-44 right-[-6%] h-[26rem] w-[26rem] rounded-full bg-gradient-to-br from-[#fde6d6] to-[#fbc9a6]/80" />
      <div className="absolute left-[-9%] top-[40%] hidden h-[26rem] w-[26rem] rounded-full bg-[#fbd9bf]/70 lg:block" />
      <div className="absolute bottom-[-18%] left-[-8%] h-[28rem] w-[28rem] rounded-full bg-gradient-to-tr from-[#7a4a8c] via-[#b4527a] to-[#e9a0a8]/80" />
      <div className="absolute bottom-[-24%] left-[26%] hidden h-[30rem] w-[30rem] rounded-full bg-[#fbe3d3]/80 lg:block" />
      <div className="absolute right-[26%] top-[12%] hidden h-52 w-52 rounded-full bg-[#fbd9bf]/40 lg:block" />

      {/* Reserved space on the right, kept as a dot grid */}
      <div
        className="absolute bottom-[10%] right-[4.5%] hidden h-24 w-24 opacity-60 lg:block"
        style={{
          backgroundImage: 'radial-gradient(#f0b99a 1.5px, transparent 1.5px)',
          backgroundSize: '16px 16px',
        }}
      />
    </div>
  );
}

export default BackgroundBubbles;
