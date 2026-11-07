import { Outlet } from 'react-router-dom';

import DiwaliFestival from './DiwaliFestival';

/** Wraps every route so the fireworks layer is there on all pages, login included. */
function DiwaliRoot() {
  return (
    <>
      <Outlet />
      <DiwaliFestival />
    </>
  );
}

export default DiwaliRoot;
