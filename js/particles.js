/* Particle systems: floating dust + spark bursts + infinity */
const ParticleSystem = (() => {
  let canvas, ctx, w, h, raf, particles = [], mouse = {x: -9999, y:-9999};
  let time = 0;
  let mode = 'dust'; // dust | burst | infinity
  let infinityT = 0;

  function init(){
    canvas = document.getElementById('particles');
    if(!canvas) return;
    ctx = canvas.getContext('2d', {alpha:true});
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', e=>{ mouse.x=e.clientX; mouse.y=e.clientY; });
    window.addEventListener('touchmove', e=>{
      if(e.touches[0]){ mouse.x=e.touches[0].clientX; mouse.y=e.touches[0].clientY; }
    },{passive:true});
    createDust(110);
    loop();
  }

  function resize(){
    const dpr = Math.min(2, window.devicePixelRatio||1);
    w = canvas.width = window.innerWidth * dpr;
    h = canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth+'px';
    canvas.style.height = window.innerHeight+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
    w = window.innerWidth; h = window.innerHeight;
  }

  function createDust(n){
    particles = [];
    for(let i=0;i<n;i++){
      particles.push({
        x: Math.random()*w,
        y: Math.random()*h,
        vx: (Math.random()-.5)*0.18,
        vy: (Math.random()-.5)*0.35 - 0.15, // drift up
        r: Math.random()*1.25 + 0.35,
        a: Math.random()*0.5 + 0.22,
        tw: Math.random()*Math.PI*2,
        col: Math.random()>.7 ? 'gold' : Math.random()>.5 ? 'warm' : 'violet'
      });
    }
  }

  function burst(cx, cy, count=90){
    for(let i=0;i<count;i++){
      const ang = Math.random()*Math.PI*2;
      const sp = Math.random()*8 + 2;
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(ang)*sp*0.38,
        vy: Math.sin(ang)*sp*0.38 - Math.random()*1.5,
        r: Math.random()*1.6+0.6,
        a: 1,
        life: 1,
        decay: 0.014 + Math.random()*0.012,
        grav: 0.035 + Math.random()*0.02,
        burst: true,
        col:'gold'
      });
    }
  }

  function toInfinityFormation(){
    // convert random particles to infinity path followers
    // Infinity parametric: x = scale * cos(t) / (1+ sin^2), y = scale * cos(t)sin(t)/(1+sin^2)
    const cx = w/2, cy = h/2 - 40;
    const scale = Math.min(w,h)*0.22;
    const n = 220;
    particles = [];
    for(let i=0;i<n;i++){
      const t = (i/n)*Math.PI*2;
      // target point on infinity
      const denom = 1 + Math.pow(Math.sin(t),2);
      const tx = cx + scale * Math.cos(t) / denom;
      const tyStart = cy + scale * Math.cos(t)*Math.sin(t) / denom;
      // start from random edge
      const ang = Math.random()*Math.PI*2;
      const rad = Math.max(w,h)*0.7;
      particles.push({
        x: cx + Math.cos(ang)*rad*(0.6+Math.random()*0.4),
        y: cy + Math.sin(ang)*rad*(0.6+Math.random()*0.4),
        tx, ty: tyStart, t,
        vx:0, vy:0,
        r: Math.random()*1.6+0.5,
        a: 0.9,
        infinity:true,
        delay: Math.random()*0.6
      });
    }
    mode='infinity';
    infinityT=0;
  }

  function backToDust(){
    mode='dust';
    createDust(110);
  }

  function loop(){
    time+=0.016;
    ctx.clearRect(0,0,w,h);

    if(mode==='dust'){
      drawDust();
    } else if(mode==='infinity'){
      drawInfinity();
    }
    // also handle burst particles mixed in dust after gift open
    // they are drawn in drawDust branch via life

    raf = requestAnimationFrame(loop);
  }

  function drawDust(){
    for(let i=particles.length-1;i>=0;i--){
      const p = particles[i];
      if(p.burst){
        p.x += p.vx; p.y += p.vy;
        p.vy += p.grav;
        p.vx *= 0.995;
        p.life -= p.decay;
        p.a = Math.max(0, p.life);
        if(p.life<=0){ particles.splice(i,1); continue; }
        // glow
        ctx.beginPath();
        ctx.arc(p.x,p.y,p.r*2.2,0,Math.PI*2);
        ctx.fillStyle = `rgba(240,208,138,${p.a*0.14})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(255,240,180,${p.a})`;
        ctx.fill();
        continue;
      }
      // normal dust
      p.x += p.vx + Math.sin(time*0.6 + p.tw)*0.12;
      p.y += p.vy;
      p.tw += 0.008;
      // mouse sway
      const dx = mouse.x - p.x, dy = mouse.y - p.y;
      const dist = Math.hypot(dx,dy);
      if(dist<140){
        p.x -= dx*0.0025;
        p.y -= dy*0.0025;
      }
      // wrap
      if(p.y < -12) { p.y = h+12; p.x = Math.random()*w; }
      if(p.y > h+12) p.y = -12;
      if(p.x < -12) p.x = w+12;
      if(p.x > w+12) p.x = -12;

      const twinkle = 0.75 + Math.sin(time*1.8 + p.tw*2)*0.25;
      let col = '255,240,180';
      if(p.col==='violet') col='170,150,220';
      if(p.col==='warm') col='240,208,138';
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.r* twinkle,0,Math.PI*2);
      ctx.fillStyle=`rgba(${col},${p.a*twinkle})`;
      ctx.fill();
      // subtle halo for larger ones
      if(p.r>1){
        ctx.beginPath();
        ctx.arc(p.x,p.y,p.r*2.4,0,Math.PI*2);
        ctx.fillStyle=`rgba(${col},${p.a*0.07})`;
        ctx.fill();
      }
    }
  }

  function drawInfinity(){
    infinityT += 0.008;
    const prog = Math.min(1, infinityT*0.55); // 0..1
    const cx = w/2, cy = h*0.46;
    // draw connections faintly when close to formation?
    particles.forEach(p=>{
      if(p.delay>0){ p.delay-=0.016; return; }
      // ease to target
      const ease = 0.035 + prog*0.04;
      p.x += (p.tx - p.x)*ease;
      p.y += (p.ty - p.y)*ease;
      // gentle orbiting once settled
      if(prog>0.9){
        const ox = Math.sin(time*0.7 + p.t*3)*0.4;
        const oy = Math.cos(time*0.7 + p.t*3)*0.4;
        p.x+=ox; p.y+=oy;
      }
      const d = Math.hypot(p.x-p.tx, p.y-p.ty);
      const a = Math.max(0.2, 1 - d*0.02);
      // glow
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.r*2,0,Math.PI*2);
      ctx.fillStyle=`rgba(240,208,138,${a*0.18})`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(255,246,214,${a})`;
      ctx.fill();
    });
    // center soft glow while forming
    const glowA = prog*0.22;
    const g = ctx.createRadialGradient(cx,cy,0,cx,cy, Math.min(w,h)*0.35);
    g.addColorStop(0, `rgba(240,208,138,${glowA})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle=g;
    ctx.beginPath(); ctx.arc(cx,cy, Math.min(w,h)*0.35,0,Math.PI*2); ctx.fill();

    if(prog>=1){
      // draw infinity path stroke faintly for guidance (then hide)
      ctx.strokeStyle='rgba(240,208,138,.0)';
    }
  }

  return {init, burst, toInfinityFormation, backToDust, get mode(){return mode}};
})();

// Infinity canvas separate for finale reveal (particle swirl forming ∞ then dissolve)
const InfinityCanvas = (() => {
  let c, ctx, raf, state='idle'; // idle | forming | holding | dissolve | done
  let parts=[], t=0, dissolveT=0;

  function init(){
    c = document.getElementById('infinityCanvas');
    if(!c) return;
    ctx = c.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    loop();
  }
  function resize(){
    const dpr = Math.min(2, devicePixelRatio||1);
    const rect = c.getBoundingClientRect();
    c.width = rect.width*dpr;
    c.height = rect.height*dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  function start(){
    const rect = c.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    const cx = w/2, cy = h*0.42;
    const scale = Math.min(w,h)*0.24;
    parts=[];
    // create particles around outside then converge
    const N=260;
    for(let i=0;i<N;i++){
      const tt = (i/N)*Math.PI*2;
      const denom = 1 + Math.pow(Math.sin(tt),2);
      const tx = cx + scale*Math.cos(tt)/denom;
      const ty = cy + scale*Math.cos(tt)*Math.sin(tt)/denom;
      const ang = Math.random()*Math.PI*2;
      const rad = Math.max(w,h)*0.6;
      parts.push({
        x: cx + Math.cos(ang)*rad*(0.7+Math.random()*0.3),
        y: cy + Math.sin(ang)*rad*(0.7+Math.random()*0.3),
        tx, ty, tt,
        r: Math.random()*1.5+0.6,
        a: 1,
        delay: Math.random()*0.7,
        speed: 0.045 + Math.random()*0.02
      });
    }
    state='forming';
    t=0; dissolveT=0;
    c.style.opacity='1';
  }
  function dissolve(){
    if(state==='forming' || state==='holding') state='dissolve';
  }
  function reset(){
    state='idle'; parts=[]; t=0;
    c.style.opacity='0';
    if(raf) cancelAnimationFrame(raf);
    loop();
  }
  function loop(){
    raf = requestAnimationFrame(loop);
    if(!c || state==='idle') { ctx.clearRect(0,0,c.width,c.height); return; }
    const rect = c.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    ctx.clearRect(0,0,w,h);

    if(state==='forming'){
      t+=0.016;
      let allClose=true;
      parts.forEach(p=>{
        if(p.delay>0){ p.delay-=0.016; allClose=false; return; }
        p.x += (p.tx - p.x)*p.speed* (1 + t*0.12);
        p.y += (p.ty - p.y)*p.speed* (1 + t*0.12);
        const d = Math.hypot(p.x-p.tx, p.y-p.ty);
        if(d>2) allClose=false;
        // draw
        const a = Math.min(1, 1 - d*0.02 + 0.25);
        ctx.beginPath();
        ctx.arc(p.x,p.y,p.r*2.1,0,Math.PI*2);
        ctx.fillStyle=`rgba(240,208,138,${a*0.16})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(255,246,214,${a})`;
        ctx.fill();
        // shimmer
        p.tx += Math.sin(t*1.2 + p.tt)*0.18;
        p.ty += Math.cos(t*1.2 + p.tt)*0.18;
      });
      // center glow
      const glow = ctx.createRadialGradient(w/2,h*0.42,0,w/2,h*0.42, Math.min(w,h)*0.32);
      glow.addColorStop(0,'rgba(240,208,138,.18)');
      glow.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=glow;
      ctx.beginPath(); ctx.arc(w/2,h*0.42, Math.min(w,h)*0.32,0,Math.PI*2); ctx.fill();

      if(allClose && t>2.2){
        state='holding';
        setTimeout(()=>{ if(state==='holding') state='dissolve'; }, 1200);
      }
    } else if(state==='dissolve'){
      dissolveT+=0.016;
      const prog = Math.min(1, dissolveT*0.9);
      parts.forEach(p=>{
        // explode outward slightly and fade
        const ang = Math.atan2(p.y - h*0.42, p.x - w/2);
        p.x += Math.cos(ang)* (1.2 + prog*3);
        p.y += Math.sin(ang)* (1.2 + prog*3) + prog*0.6;
        p.a = 1 - prog;
        if(p.a<=0) return;
        ctx.beginPath();
        ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(255,240,180,${p.a*0.9})`;
        ctx.fill();
      });
      // big bloom
      ctx.fillStyle=`rgba(255,240,180,${0.16*(1-prog)})`;
      ctx.beginPath(); ctx.arc(w/2,h*0.42, 20+ prog*120,0,Math.PI*2); ctx.fill();
      if(prog>=1){ state='done'; c.style.opacity='0'; }
    }
  }

  return {init, start, dissolve, reset};
})();
