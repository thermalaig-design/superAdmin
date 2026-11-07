import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

import { FireworksEngine } from './engine';
import { THEMES, themeKeyFor } from './themes';
import { useDiwali } from './useDiwali';

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * The festival layer, mounted once above every page (login included). On each page change it switches to that page's
 * look (colours + burst shapes), sets the --dw-* colour variables that the bulbs and glows use, and fires a salvo of
 * rockets; afterwards a rocket goes up every few seconds. It never takes clicks (pointer-events: none).
 */
function DiwaliFestival() {
  const { pathname } = useLocation();
  const [on] = useDiwali();
  const canvasRef = useRef(null);
  const engineRef = useRef(null);

  // Colours and the on/off flag are plain attributes on <html>, so CSS can use them anywhere.
  useEffect(() => {
    const root = document.documentElement;
    if (!on) {
      delete root.dataset.diwali;
      return undefined;
    }
    const key = themeKeyFor(pathname);
    root.dataset.diwali = key;
    THEMES[key].lights.forEach((color, i) => root.style.setProperty(`--dw-${i + 1}`, color));
    return () => {
      delete root.dataset.diwali;
    };
  }, [on, pathname]);

  // The fireworks engine lives as long as festival mode is on.
  useEffect(() => {
    if (!on || reducedMotion() || !canvasRef.current) return undefined;
    const engine = new FireworksEngine(canvasRef.current);
    engineRef.current = engine;
    engine.setTheme(THEMES[themeKeyFor(window.location.pathname)]);
    engine.start();

    let ambient;
    const startAmbient = () => {
      clearInterval(ambient);
      ambient = setInterval(() => {
        if (!document.hidden) engine.launch();
      }, 3200);
    };
    startAmbient();
    const onVisibility = () => (document.hidden ? clearInterval(ambient) : startAmbient());
    const onLaunch = () => engine.salvo(3);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('diwali:launch', onLaunch);

    return () => {
      clearInterval(ambient);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('diwali:launch', onLaunch);
      engine.destroy();
      engineRef.current = null;
    };
  }, [on]);

  // Every page opens with its own volley.
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setTheme(THEMES[themeKeyFor(pathname)]);
    engine.salvo(pathname === '/' ? 8 : 5);
  }, [on, pathname]);

  if (!on) return null;
  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[60] h-full w-full" />;
}

export default DiwaliFestival;
