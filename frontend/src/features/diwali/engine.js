// Fireworks engine: rockets climb with a spark tail, then burst into rotating 3D shapes (perspective-projected),
// with a coloured screen flash and a shockwave ring on every burst. Plain canvas, no libraries.

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const FOCAL = 650;
const MAX_PARTICLES = 1800;

// ---- burst shapes: each returns 3D directions --------------------------------------------------------------------
function sphere(n) {
  const out = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const t = golden * i;
    out.push([Math.cos(t) * r, y, Math.sin(t) * r]);
  }
  return out;
}
const ring = (n) => Array.from({ length: n }, (_, i) => [Math.cos((i / n) * TAU), Math.sin((i / n) * TAU), 0]);

const SHAPES = {
  sphere: () => sphere(110).map((d) => ({ d, s: 1 })),
  peony: () => [...sphere(90).map((d) => ({ d, s: 1 })), ...sphere(50).map((d) => ({ d, s: 0.55 }))],
  ring: () => [...ring(70).map((d) => ({ d, s: 1 })), ...ring(40).map((d) => ({ d, s: 0.6 }))],
  saturn: () => [
    ...sphere(60).map((d) => ({ d, s: 0.55 })),
    ...ring(80).map((d) => ({ d: [d[0] * 1.5, d[2] * 0.1, d[1] * 1.5], s: 1 })),
  ],
  heart: () =>
    Array.from({ length: 90 }, (_, i) => {
      const t = (i / 90) * TAU;
      const x = 16 * Math.sin(t) ** 3;
      const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      return { d: [x / 17, y / 17, rand(-0.12, 0.12)], s: 1 };
    }),
  star: () => {
    const out = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU - Math.PI / 2;
      const r = i % 2 === 0 ? 1 : 0.42;
      const a2 = ((i + 1) / 10) * TAU - Math.PI / 2;
      const r2 = (i + 1) % 2 === 0 ? 1 : 0.42;
      for (let k = 0; k < 9; k++) {
        const f = k / 9;
        out.push({
          d: [Math.cos(a) * r * (1 - f) + Math.cos(a2) * r2 * f, Math.sin(a) * r * (1 - f) + Math.sin(a2) * r2 * f, rand(-0.1, 0.1)],
          s: 1,
        });
      }
    }
    return out;
  },
  spiral: () =>
    Array.from({ length: 120 }, (_, i) => {
      const t = i / 120;
      const a = t * TAU * 3;
      return { d: [Math.cos(a) * t, (t - 0.5) * 1.8, Math.sin(a) * t], s: 1 };
    }),
  willow: () => sphere(100).map((d) => ({ d, s: 0.85 })),
  crackle: () => sphere(80).map((d) => ({ d, s: 1 })),
};

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
}

export class FireworksEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.rockets = [];
    this.bursts = [];
    this.sparks = [];
    this.flashes = [];
    this.rings = [];
    this.theme = null;
    this.running = false;
    this.last = 0;
    this.timers = new Set();
    this.resize = this.resize.bind(this);
    this.frame = this.frame.bind(this);
    this.resize();
    window.addEventListener('resize', this.resize);
  }

  setTheme(theme) {
    this.theme = theme;
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.floor(this.w * dpr);
    this.canvas.height = Math.floor(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(this.frame);
  }

  stop() {
    this.running = false;
    this.timers.forEach(clearTimeout);
    this.timers.clear();
    this.rockets = [];
    this.bursts = [];
    this.sparks = [];
    this.flashes = [];
    this.rings = [];
    this.ctx.clearRect(0, 0, this.w, this.h);
  }

  destroy() {
    this.stop();
    window.removeEventListener('resize', this.resize);
  }

  later(ms, fn) {
    const id = setTimeout(() => {
      this.timers.delete(id);
      if (this.running) fn();
    }, ms);
    this.timers.add(id);
  }

  /** A volley of rockets one after another (used when a page opens). */
  salvo(count = 6) {
    for (let i = 0; i < count; i++) this.later(i * rand(160, 330), () => this.launch(rand(0.12, 0.88) * this.w));
  }

  /** One rocket from the bottom edge, aimed at (targetX, targetY) when given. */
  launch(x = rand(0.1, 0.9) * this.w, targetX, targetY) {
    if (!this.theme) return;
    const tx = targetX ?? x + rand(-90, 90);
    const ty = targetY ?? rand(0.1, 0.46) * this.h;
    const dist = Math.hypot(tx - x, this.h - ty);
    this.rockets.push({
      x,
      y: this.h + 8,
      sx: x,
      tx,
      ty,
      t: 0,
      dur: Math.max(0.7, dist / rand(620, 820)),
      wob: rand(0, TAU),
      angle: -Math.PI / 2,
      style: pick(this.theme.styles),
      palette: pick(this.theme.palettes),
    });
  }

  // ---- simulation -------------------------------------------------------------------------------------------
  explode(rocket) {
    const { x, y, style, palette } = rocket;
    const scale = Math.min(this.w, this.h) / 800;
    const R = rand(130, 190) * Math.max(0.75, scale);
    const burst = {
      x,
      y,
      R,
      age: 0,
      style,
      palette,
      ry: rand(0, TAU),
      rx: rand(-0.7, 0.7),
      spin: rand(-1.1, 1.1),
      gravity: style === 'willow' ? 150 : 70,
      drag: style === 'willow' ? 2.6 : 4.4,
      life: style === 'willow' ? 3.6 : style === 'crackle' ? 2.4 : 2.2,
      parts: SHAPES[style]().map(({ d, s }) => ({
        d,
        s: s * rand(0.92, 1.08),
        color: pick(palette),
        size: rand(1.6, 2.8),
        tw: Math.random() < 0.35 ? rand(8, 18) : 0,
        trail: [],
      })),
    };
    if (this.bursts.reduce((n, b) => n + b.parts.length, 0) < MAX_PARTICLES) this.bursts.push(burst);
    this.flashes.push({ x, y, color: palette[0], age: 0, life: 0.45, r: R * 2.6 });
    this.rings.push({ x, y, color: palette[1] ?? palette[0], age: 0, life: 0.7, r: R * 1.25 });
    for (let i = 0; i < 14; i++) {
      const a = rand(0, TAU);
      const sp = rand(40, 190);
      this.sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, age: 0, life: rand(0.35, 0.7), color: '#fff6d8', size: rand(1.2, 2.2), g: 80 });
    }
  }

  update(dt) {
    for (const r of this.rockets) {
      r.t += dt / r.dur;
      const k = Math.min(r.t, 1);
      const e = 1 - (1 - k) ** 2.2; // fast off the ground, slowing near the top
      const px = r.x;
      const py = r.y;
      r.x = r.sx + (r.tx - r.sx) * e + Math.sin(k * 14 + r.wob) * 5 * (1 - k);
      r.y = this.h + 8 + (r.ty - (this.h + 8)) * e;
      r.angle = Math.atan2(r.y - py, r.x - px);
      for (let i = 0; i < 3; i++) {
        this.sparks.push({
          x: r.x,
          y: r.y,
          vx: rand(-22, 22),
          vy: rand(20, 80),
          age: 0,
          life: rand(0.3, 0.65),
          color: pick(['#ffd180', '#ff9100', '#fff3c4']),
          size: rand(0.9, 1.9),
          g: 60,
        });
      }
      if (r.t >= 1) {
        r.dead = true;
        this.explode(r);
      }
    }
    this.rockets = this.rockets.filter((r) => !r.dead);

    for (const b of this.bursts) {
      b.age += dt;
      for (const p of b.parts) {
        const pos = this.project(b, p);
        p.trail.push(pos);
        if (p.trail.length > 7) p.trail.shift();
        // crackle: late in life, embers pop into a few tiny glitters
        if (b.style === 'crackle' && !p.popped && b.age > b.life * 0.55 && Math.random() < 0.04) {
          p.popped = true;
          for (let i = 0; i < 4; i++) {
            const a = rand(0, TAU);
            const sp = rand(30, 90);
            this.sparks.push({ x: pos.x, y: pos.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, age: 0, life: rand(0.25, 0.5), color: '#ffffff', size: 1.3, g: 40 });
          }
        }
      }
    }
    this.bursts = this.bursts.filter((b) => b.age < b.life);

    for (const s of this.sparks) {
      s.age += dt;
      s.vy += s.g * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
    }
    this.sparks = this.sparks.filter((s) => s.age < s.life);
    for (const f of this.flashes) f.age += dt;
    this.flashes = this.flashes.filter((f) => f.age < f.life);
    for (const r of this.rings) r.age += dt;
    this.rings = this.rings.filter((r) => r.age < r.life);
  }

  /** Screen position of one particle: expand outward, rotate in 3D, drop under gravity, apply perspective. */
  project(b, p) {
    const reach = 1 - Math.exp(-b.drag * b.age);
    const rad = b.R * p.s * reach;
    const [x, y, z] = p.d;
    const ry = b.ry + b.spin * b.age;
    const cy = Math.cos(ry);
    const sy = Math.sin(ry);
    const x1 = x * cy + z * sy;
    const z1 = -x * sy + z * cy;
    const cx = Math.cos(b.rx);
    const sx = Math.sin(b.rx);
    const y1 = y * cx - z1 * sx;
    const z2 = y * sx + z1 * cx;
    const depth = FOCAL / (FOCAL + z2 * rad);
    return {
      x: b.x + x1 * rad * depth,
      y: b.y + y1 * rad * depth + b.gravity * b.age * b.age * 0.5,
      depth,
    };
  }

  // ---- drawing ----------------------------------------------------------------------------------------------
  frame(now) {
    if (!this.running) return;
    const dt = Math.min((now - this.last) / 1000, 0.05);
    this.last = now;
    this.update(dt);
    this.draw();
    requestAnimationFrame(this.frame);
  }

  draw() {
    const { ctx } = this;
    const dark = document.documentElement.dataset.theme === 'dark';
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.lineCap = 'round';
    ctx.globalCompositeOperation = 'source-over';

    // coloured screen flash behind everything
    for (const f of this.flashes) {
      const k = 1 - f.age / f.life;
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
      g.addColorStop(0, hexA(f.color, (dark ? 0.5 : 0.34) * k));
      g.addColorStop(0.45, hexA(f.color, (dark ? 0.18 : 0.12) * k));
      g.addColorStop(1, hexA(f.color, 0));
      ctx.fillStyle = g;
      ctx.fillRect(f.x - f.r, f.y - f.r, f.r * 2, f.r * 2);
    }

    // additive glow only shows on a dark page; on the light theme normal blending keeps the colours visible
    ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over';

    for (const r of this.rings) {
      const k = r.age / r.life;
      ctx.strokeStyle = hexA(r.color, (1 - k) * 0.7);
      ctx.lineWidth = 3 * (1 - k) + 0.5;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r * (1 - (1 - k) ** 3), 0, TAU);
      ctx.stroke();
    }

    for (const s of this.sparks) {
      const a = 1 - s.age / s.life;
      ctx.fillStyle = hexA(dark ? s.color : darken(s.color), a);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size * (0.4 + a * 0.6), 0, TAU);
      ctx.fill();
    }

    for (const b of this.bursts) {
      const u = b.age / b.life;
      const fade = u < 0.6 ? 1 : Math.max(0, 1 - (u - 0.6) / 0.4);
      for (const p of b.parts) {
        const tw = p.tw ? 0.55 + 0.45 * Math.sin(b.age * p.tw + p.size * 9) : 1;
        const alpha = fade * tw;
        const t = p.trail;
        const head = t[t.length - 1];
        if (alpha <= 0.02 || !head) continue;
        const color = dark ? p.color : darken(p.color);
        ctx.strokeStyle = hexA(color, alpha * 0.55);
        ctx.lineWidth = p.size * head.depth * 0.9;
        ctx.beginPath();
        ctx.moveTo(t[0].x, t[0].y);
        for (let i = 1; i < t.length; i++) ctx.lineTo(t[i].x, t[i].y);
        ctx.stroke();
        const r = p.size * head.depth * (b.style === 'willow' ? 1.1 : 1.35);
        ctx.fillStyle = hexA(color, alpha);
        ctx.beginPath();
        ctx.arc(head.x, head.y, r, 0, TAU);
        ctx.fill();
        ctx.fillStyle = hexA(p.color, alpha * (dark ? 0.25 : 0.14)); // soft glow
        ctx.beginPath();
        ctx.arc(head.x, head.y, r * 3, 0, TAU);
        ctx.fill();
      }
    }

    ctx.globalCompositeOperation = 'source-over';
    for (const r of this.rockets) {
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.rotate(r.angle);
      ctx.fillStyle = '#b71c1c';
      ctx.fillRect(-12, -2.4, 12, 4.8);
      ctx.fillStyle = '#ffd54f';
      ctx.fillRect(-8, -2.4, 2.5, 4.8);
      ctx.fillStyle = '#ff6f00';
      ctx.beginPath();
      ctx.moveTo(0, -2.4);
      ctx.lineTo(6, 0);
      ctx.lineTo(0, 2.4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      const g = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, 14);
      g.addColorStop(0, 'rgba(255,240,180,0.95)');
      g.addColorStop(1, 'rgba(255,140,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(r.x, r.y, 14, 0, TAU);
      ctx.fill();
    }
  }
}

// Very light colours (white, pale yellow) vanish on the light theme, so they are pulled towards a deeper tone there.
function darken(hex) {
  const n = parseInt(hex.slice(1), 16);
  const f = 0.78;
  const c = (v) => Math.round(v * f);
  const r = c((n >> 16) & 255);
  const g = c((n >> 8) & 255);
  const b = c(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
