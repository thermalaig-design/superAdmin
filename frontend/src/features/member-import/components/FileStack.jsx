/** Three sheets of paper floating in 3D. `active` fans them out (used while a file is dragged over). */
function FileStack({ size = 130, active = false }) {
  const sheets = [
    { x: '-16px', z: '-18px', d: '0s' },
    { x: '0px', z: '0px', d: '0.4s' },
    { x: '16px', z: '18px', d: '0.8s' },
  ];
  return (
    <div className="mi-stack" style={{ '--size': `${size}px` }} data-active={active} aria-hidden="true">
      {sheets.map((sheet, index) => (
        <div key={index} className="mi-sheet" style={{ '--x': sheet.x, '--z': sheet.z, '--d': sheet.d }}>
          <i style={{ width: '70%', marginTop: 12 }} />
          <i style={{ width: '55%' }} />
          <i style={{ width: '62%' }} />
          {index === 2 && <b>XLSX</b>}
        </div>
      ))}
    </div>
  );
}

export default FileStack;
