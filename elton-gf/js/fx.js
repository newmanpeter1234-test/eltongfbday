/* ============================================================
   FX — finale fireworks + confetti engine
   (completely different from any floating-dust particle field:
   rockets launch, burst into multi-colour sparks with gravity
   and sparkle trails, plus paper confetti flutters down) */
const FX = (() => {
  let canvas, ctx, running = false, raf = null;
  let W = 0, H = 0, dpr = 1;
  const rockets = [], sparks = [], confetti = [];
  const PAL = ['#ff5a3c', '#ffb48a', '#e6447c', '#7c3aed', '#ffd9de', '#fff6ea'];

  function ensure(){
    if(canvas) return;
    canvas = document.getElementById('fwCanvas');
    if(!canvas) return;
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }
  function resize(){
    if(!canvas) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = canvas.getBoundingClientRect();
    W = r.width || window.innerWidth;
    H = r.height || window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function launch(x, y, hueIdx){
    const sx = W * (0.2 + Math.random() * 0.6);
    const sy = H + 12;
    rockets.push({
      x: sx, y: sy,
      tx: x !== undefined ? x : W * (0.15 + Math.random() * 0.7),
      ty: y !== undefined ? y : H * (0.12 + Math.random() * 0.42),
      v: 0, // eased param
      color: PAL[hueIdx !== undefined ? hueIdx % PAL.length : Math.floor(Math.random() * PAL.length)],
      delay: 0,
    });
  }

  function burst(x, y, color, big){
    const n = big ? 90 : 60;
    const power = big ? 5.2 : 4.2;
    for(let i = 0; i < n; i++){
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.22;
      const sp = (0.35 + Math.random() * 0.65) * power;
      sparks.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 1,
        decay: 0.011 + Math.random() * 0.012,
        color: Math.random() > 0.72 ? '#fff6ea' : color,
        r: 1 + Math.random() * 1.6,
        tw: Math.random() * Math.PI * 2,
      });
    }
    // inner ring pop
    for(let i = 0; i < 22; i++){
      const a = Math.random() * Math.PI * 2;
      const sp = Math.random() * 1.6;
      sparks.push({
        x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 1, decay: 0.02, color:'#ffffff', r: 1.2, tw: 0,
      });
    }
  }

  function dropConfetti(count){
    for(let i = 0; i < count; i++){
      confetti.push({
        x: Math.random() * W,
        y: -20 - Math.random() * H * 0.5,
        w: 5 + Math.random() * 7,
        h: 8 + Math.random() * 9,
        vy: 1 + Math.random() * 1.6,
        sway: Math.random() * Math.PI * 2,
        swaySp: 0.02 + Math.random() * 0.03,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.14,
        color: PAL[Math.floor(Math.random() * PAL.length)],
        life: 1,
      });
    }
  }

  function frame(){
    if(!running) return;
    raf = requestAnimationFrame(frame);
    ctx.clearRect(0, 0, W, H);

    // rockets — eased climb with sparkle trail
    for(let i = rockets.length - 1; i >= 0; i--){
      const r = rockets[i];
      if(r.delay > 0){ r.delay -= 16; continue; }
      r.v += 0.021;
      const px = r.x, py = r.y;
      r.x += (r.tx - r.x) * r.v;
      r.y += (r.ty - r.y) * r.v;
      // trail
      ctx.strokeStyle = r.color;
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(r.x, r.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
      if(Math.hypot(r.tx - r.x, r.ty - r.y) < 14 || r.v >= 1){
        burst(r.x, r.y, r.color, Math.random() > 0.5);
        rockets.splice(i, 1);
      }
    }

    // sparks
    ctx.globalCompositeOperation = 'lighter';
    for(let i = sparks.length - 1; i >= 0; i--){
      const s = sparks[i];
      s.x += s.vx; s.y += s.vy;
      s.vy += 0.028;             // gravity
      s.vx *= 0.985; s.vy *= 0.985;
      s.life -= s.decay;
      s.tw += 0.3;
      if(s.life <= 0){ sparks.splice(i, 1); continue; }
      const twinkle = 0.65 + Math.sin(s.tw) * 0.35;
      ctx.globalAlpha = Math.max(0, s.life * twinkle);
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
      // glow
      ctx.globalAlpha = Math.max(0, s.life * 0.25);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // confetti — flutter
    for(let i = confetti.length - 1; i >= 0; i--){
      const c = confetti[i];
      c.y += c.vy;
      c.sway += c.swaySp;
      c.x += Math.sin(c.sway) * 1.1;
      c.rot += c.vr;
      if(c.y > H + 30){ confetti.splice(i, 1); continue; }
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.fillStyle = c.color;
      ctx.globalAlpha = 0.9;
      ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function start(){
    ensure();
    resize();
    if(running) return;
    running = true;
    frame();
    // choreography: staggered launches for ~4.5s
    const seq = [0, 240, 420, 700, 950, 1250, 1600, 1950, 2350, 2800, 3300, 3900];
    seq.forEach((d, i) => setTimeout(() => { if(running) launch(undefined, undefined, i % PAL.length); }, d));
    setTimeout(() => { if(running) dropConfetti(70); }, 900);
    setTimeout(() => { if(running) dropConfetti(50); }, 2400);
  }

  function stop(){
    running = false;
    if(raf) cancelAnimationFrame(raf);
    rockets.length = 0; sparks.length = 0; confetti.length = 0;
    if(ctx) ctx.clearRect(0, 0, W, H);
  }

  return { start, stop };
})();
