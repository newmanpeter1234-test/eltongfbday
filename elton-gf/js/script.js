/* Main script - Anziya cinematic */
gsap.registerPlugin(ScrollTrigger);

let lenis;
let audioCtx, masterGain, isMusicOn=false, bgOscillators=[];

document.addEventListener('DOMContentLoaded', ()=>{
  initLoader();
  ParticleSystem.init();
  InfinityCanvas.init();
  buildPhotos();
  buildTimeline();
  setupGifts();
  setupVideos();
  setupMusic();
  setupLenis();
  setupScrollAnimations();
});

function initLoader(){
  const bar = document.getElementById('loaderProgress');
  const pct = document.getElementById('loaderPercent');
  const loader = document.getElementById('loader');
  let p=0;
  const imgs = document.images;
  let loaded=0; const totalImgs = imgs.length || 1;
  // fake progress + image loading
  const tick = setInterval(()=>{
    p = Math.min(96, p + Math.random()*8);
    bar.style.width = p+'%';
    pct.textContent = Math.round(p)+'%';
    if(p>=96) clearInterval(tick);
  }, 90);

  Promise.all(Array.from(imgs).map(img=>{
    if(img.complete) return Promise.resolve();
    return new Promise(res=>{ img.onload=res; img.onerror=res; setTimeout(res, 2000); });
  })).then(()=>{
    clearInterval(tick);
    bar.style.width='100%'; pct.textContent='100%';
    setTimeout(()=>{
      loader.classList.add('out');
      document.body.classList.add('locked');
      revealGiftEntry();
    }, 420);
  });
  // fallback
  setTimeout(()=>{
    if(!loader.classList.contains('out')){
      bar.style.width='100%'; pct.textContent='100%';
      loader.classList.add('out');
      document.body.classList.add('locked');
      revealGiftEntry();
    }
  }, 3200);
}

function revealGiftEntry(){
  gsap.fromTo('#actGift .eyebrow', {y:12,opacity:0},{y:0,opacity:1,duration:.8, ease:'power3.out', delay:.1});
  gsap.fromTo('#giftWrap', {y:22,opacity:0,scale:.96},{y:0,opacity:1,scale:1,duration:1, ease:'power3.out', delay:.25});
  gsap.fromTo('.gift-sub', {opacity:0},{opacity:1,duration:.8,delay:.6});
}

function setupGifts(){
  const gift = document.getElementById('giftBox');
  const gift2 = document.getElementById('giftSmall');
  let opened=false;
  let finaleOpened=false;

  function openFirst(){
    if(opened) return;
    opened=true;
    gift.classList.add('open');
    // haptics
    if(navigator.vibrate) navigator.vibrate(60);
    // burst
    const rect = gift.getBoundingClientRect();
    const cx = rect.left+rect.width/2, cy = rect.top+rect.height/2;
    ParticleSystem.burst(cx, cy, 120);
    spawnDomBurst(cx,cy);
    // sound whoosh via WebAudio
    playChime();
    if(!isMusicOn) toggleMusic(true);

    // animate light beam pulse
    gsap.fromTo(gift.querySelector('.light-beam'), {scaleY:.2, opacity:0},{scaleY:1, opacity:1, duration:.7, ease:'power3.out'});

    // unlock story after delay
    gsap.delayedCall(0.9, ()=>{
      document.body.classList.remove('locked');
      document.getElementById('story').classList.add('unlocked');
      // trigger lenis update and scroll to reveal
      setTimeout(()=>{
        const rev = document.getElementById('reveal');
        // smooth scroll to reveal
        if(lenis) lenis.scrollTo(rev, {duration:1.2, easing: t=> 1-Math.pow(1-t,3)});
        else rev.scrollIntoView({behavior:'smooth'});
        ScrollTrigger.refresh();
        // start video autoplay check
        handleVideoAutoplay();
      }, 120);
    });
  }
  gift.addEventListener('click', openFirst);
  gift.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); openFirst(); } });

  // small gift finale
  function openFinale(){
    if(finaleOpened) return;
    finaleOpened=true;
    gift2.classList.add('open');
    gsap.to(gift2, {scale:1.06, duration:.28, yoyo:true, repeat:1, ease:'power2.out'});
    // haptics
    if(navigator.vibrate) navigator.vibrate([40,30,60]);
    // infinity
    const rect2 = gift2.getBoundingClientRect();
    ParticleSystem.burst(rect2.left+rect2.width/2, rect2.top+rect2.height/2, 90);
    spawnDomBurst(rect2.left+rect2.width/2, rect2.top+rect2.height/2);
    playChime(true);
    // trigger infinity canvas
    InfinityCanvas.start();
    // after forming, dissolve is automatic in canvas timeline
    gsap.delayedCall(2.6, ()=>{ try{ InfinityCanvas.dissolve(); }catch(e){} });
    // stagger reveal finale content
    gsap.delayedCall(2.9, revealFinaleContent);
  }
  gift2.addEventListener('click', openFinale);
  gift2.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' ') openFinale(); });

  // Also allow tap on wrapper
  document.getElementById('giftSmallWrap').addEventListener('click', (e)=>{
    if(e.target.closest('#giftSmall')) openFinale();
  });

  document.getElementById('replayBtn').addEventListener('click', ()=>{
    window.scrollTo({top:0, behavior:'smooth'});
    setTimeout(()=>location.reload(), 600);
  });
}

function revealFinaleContent(){
  const wrap = document.querySelector('.finale-photo-wrap');
  gsap.to(wrap, {opacity:1, y:0, scale:1, duration:.9, ease:'power3.out'});
  gsap.to('.finale-title', {opacity:1, y:0, duration:.8, delay:.25, ease:'power3.out'});
  gsap.utils.toArray('.finale-lines p').forEach((p,i)=>{
    gsap.to(p, {opacity:1, y:0, duration:.7, delay: .35 + i*0.18, ease:'power3.out'});
  });
  gsap.to('#replayBtn', {opacity:1, y:0, duration:.7, delay:1.4, ease:'power3.out'});
  gsap.to('.finale-foot', {opacity:1, duration:.6, delay:1.5});
  spawnStardust();
}

function spawnDomBurst(cx,cy){
  const burst = document.getElementById('giftBurst');
  for(let i=0;i<22;i++){
    const d=document.createElement('span');
    d.style.position='absolute';
    d.style.left=cx+'px'; d.style.top=cy+'px';
    d.style.width='6px'; d.style.height='6px';
    d.style.background='radial-gradient(circle, #fff6d6, #f0d08a)';
    d.style.borderRadius='50%';
    d.style.pointerEvents='none';
    d.style.boxShadow='0 0 8px #f0d08a';
    burst.appendChild(d);
    const ang = (i/22)*Math.PI*2 + Math.random()*0.5;
    const dist = 90 + Math.random()*160;
    gsap.to(d, {x: Math.cos(ang)*dist, y: Math.sin(ang)*dist - 20, opacity:0, scale:0, duration: .9 + Math.random()*.4, ease:'power3.out', onComplete:()=>d.remove()});
  }
  // central flash
  const flash=document.createElement('div');
  flash.style.position='absolute'; flash.style.left=cx+'px'; flash.style.top=cy+'px';
  flash.style.width='12px'; flash.style.height='12px'; flash.style.background='radial-gradient(circle, #fff, transparent 70%)';
  flash.style.transform='translate(-50%,-50%)'; flash.style.borderRadius='50%'; flash.style.filter='blur(6px)';
  burst.appendChild(flash);
  gsap.to(flash, {scale:18, opacity:0, duration:.7, ease:'power2.out', onComplete:()=>flash.remove()});
}

function spawnStardust(){
  const box=document.getElementById('stardust');
  for(let i=0;i<34;i++){
    const s=document.createElement('i');
    s.style.position='absolute';
    s.style.left=Math.random()*100+'%'; s.style.top=Math.random()*100+'%';
    s.style.width=(1+Math.random()*2)+'px'; s.style.height=s.style.width;
    s.style.background='#f0d08a'; s.style.borderRadius='50%'; s.style.opacity='0';
    s.style.boxShadow='0 0 6px #f0d08a';
    box.appendChild(s);
    gsap.to(s, {opacity: Math.random()*.7+.2, duration: .6, delay: Math.random()*1.2});
    gsap.to(s, {y: -12 - Math.random()*18, duration: 4+Math.random()*4, repeat:-1, yoyo:true, ease:'sine.inOut', delay:Math.random()*1});
  }
}

function buildPhotos(){
  const stack=document.getElementById('photoStack');
  CONFIG.photos.forEach((ph, idx)=>{
    const row=document.createElement('div');
    row.className='photo-row'+(idx%2===1? ' reverse':'');
    row.innerHTML=`
      <div class="photo-media">
        <img src="${ph.src}" alt="${ph.title}" loading="lazy">
        <div class="media-frame"></div>
        <div class="media-curtain ${idx%2===0?'':'right'}"></div>
      </div>
      <div class="photo-text">
        <p class="photo-num">${ph.num} — ${String(idx+1).padStart(2,'0')}</p>
        <h3>${ph.title}</h3>
        <p>${ph.caption}</p>
        <span class="caption-accent">November 8 • Anziya</span>
      </div>
    `;
    stack.appendChild(row);
  });
}

function buildTimeline(){
  const wrap=document.getElementById('tlItems');
  CONFIG.timeline.forEach((t,i)=>{
    const isLeft = i%2===0;
    const el=document.createElement('div');
    el.className='tl-item '+(isLeft?'left':'right');
    el.innerHTML=`
      <div class="${isLeft?'tl-card':'spacer'}">${isLeft?`<p class="tl-date">${t.date}</p><h4>${t.title}</h4><p>${t.text}</p>`:''}</div>
      <div class="dot"></div>
      <div class="${!isLeft?'tl-card':'spacer'}">${!isLeft?`<p class="tl-date">${t.date}</p><h4>${t.title}</h4><p>${t.text}</p>`:''}</div>
    `;
    wrap.appendChild(el);
  });
}

function setupLenis(){
  lenis = new Lenis({
    duration:1.15,
    easing: t=> Math.min(1, 1 - Math.pow(2, -10*t)),
    smoothWheel:true,
    smoothTouch:false,
    gestureOrientation:'vertical',
  });
  function raf(time){
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(time=> lenis.raf(time*1000));
  gsap.ticker.lagSmoothing(0);
}

function setupScrollAnimations(){
  // reveal photo curtains
  gsap.utils.toArray('.photo-row').forEach((row,i)=>{
    const curtain=row.querySelector('.media-curtain');
    const img=row.querySelector('img');
    const text=row.querySelector('.photo-text');
    gsap.to(curtain, {
      scaleX:0,
      duration:.9,
      ease:'power4.inOut',
      scrollTrigger:{trigger:row, start:'top 82%', once:true}
    });
    gsap.fromTo(img, {scale:1.08}, {scale:1, duration:1.3, ease:'power2.out', scrollTrigger:{trigger:row, start:'top 82%', once:true}});
    gsap.fromTo(text, {y:16, opacity:0},{y:0, opacity:1, duration:.8, ease:'power3.out', scrollTrigger:{trigger:row, start:'top 78%', once:true}, delay:.18});
    // chapter progress
    ScrollTrigger.create({
      trigger:row,
      start:'top center',
      end:'bottom center',
      onEnter:()=> updateChProgress(i),
      onEnterBack:()=> updateChProgress(i),
    });
  });

  gsap.utils.toArray('.reveal-on-scroll').forEach(el=>{
    gsap.to(el, {opacity:1, y:0, duration:.9, ease:'power3.out', scrollTrigger:{trigger:el, start:'top 84%', once:true}});
  });

  // timeline items
  gsap.utils.toArray('.tl-item').forEach((el, i)=>{
    gsap.fromTo(el, {opacity:0, y:18},{opacity:1, y:0, duration:.7, ease:'power3.out', scrollTrigger:{trigger:el, start:'top 86%', once:true}, delay: i*0.04});
    // dot pulse
    ScrollTrigger.create({
      trigger:el, start:'top 70%',
      onEnter:()=> gsap.fromTo(el.querySelector('.dot'), {scale:.7},{scale:1, duration:.5, ease:'back.out(2)'})
    });
  });

  // pause lines
  gsap.to('.pause-line.l1', {opacity:1, y:0, duration:.8, ease:'power3.out', scrollTrigger:{trigger:'#pause', start:'top 72%', once:true}});
  gsap.to('.pause-line.l2', {opacity:1, y:0, duration:.8, ease:'power3.out', scrollTrigger:{trigger:'#pause', start:'top 60%', once:true}, delay:.18});

  // reveal section parallax
  gsap.to('.reveal-photo-fader', {yPercent:-12, ease:'none', scrollTrigger:{trigger:'#reveal', start:'top top', end:'bottom top', scrub:true}});

  // overall scroll progress
  ScrollTrigger.create({
    trigger:'#story',
    start:'top top',
    end:'bottom bottom',
    scrub:true,
    onUpdate: self=>{
      document.querySelector('#scrollProgress span').style.width = (self.progress*100)+'%';
    }
  });

  // title name shine
  gsap.fromTo('.title-name', {opacity:0, y:18, filter:'blur(6px)'},{opacity:1, y:0, filter:'blur(0px)', duration:1.1, ease:'power3.out', scrollTrigger:{trigger:'#reveal', start:'top 78%', once:true}});
}

function updateChProgress(idx){
  const total=CONFIG.photos.length;
  const pct=((idx+1)/total*100);
  document.getElementById('chProgress').style.width=pct+'%';
  document.querySelector('#chapterNav .ch-num').textContent=String(idx+1).padStart(2,'0');
}

function setupVideos(){
  const tiles=document.querySelectorAll('.vm-tile');
  tiles.forEach(tile=>{
    const v=tile.querySelector('video');
    const bar=tile.querySelector('.vm-bar span');
    // set different start time + playback rate to create variety
    const idx=[...tiles].indexOf(tile);
    v.addEventListener('loadedmetadata', ()=>{
      try{ v.currentTime = (idx*1.7) % (v.duration||4); }catch(e){}
    });
    v.playbackRate = 0.9 + (idx%3)*0.12;
    // autoplay handling via IO
    const io=new IntersectionObserver(entries=>{
      entries.forEach(ent=>{
        if(ent.isIntersecting){
          // stagger play
          setTimeout(()=>{ v.play().catch(()=>{}); }, idx*80);
        } else {
          v.pause();
        }
      });
    }, {threshold:.35});
    io.observe(tile);

    // progress
    v.addEventListener('timeupdate', ()=>{
      if(v.duration) bar.style.width = (v.currentTime/v.duration*100)+'%';
    });
    tile.addEventListener('click', ()=>{
      if(v.paused){ v.play().catch(()=>{}); tile.classList.remove('paused'); }
      else { v.pause(); tile.classList.add('paused'); }
    });
    // ensure muted autoplay
    v.muted=true; v.playsInline=true;
  });
}
function handleVideoAutoplay(){
  document.querySelectorAll('.vm-tile video').forEach(v=>{ v.play().catch(()=>{}); });
}

// ===== MUSIC (generative pad) =====
function setupMusic(){
  const btn=document.getElementById('musicBtn');
  const audioEl=document.getElementById('bgAudio');
  // try to use real file if exists, else fallback to synth
  audioEl.src='assets/videos/memory01.mp4'; // reuse video audio as ambient? but we set muted elsewhere
  // Instead we will generate pad; use audio element as fallback mute toggle UI
  btn.addEventListener('click', ()=> toggleMusic());
  // Also attempt autoplay after first interaction is handled in openFirst
}

function ensureAudioCtx(){
  if(audioCtx) return audioCtx;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value=0;
  masterGain.connect(audioCtx.destination);
  return audioCtx;
}
function playPad(){
  ensureAudioCtx();
  if(audioCtx.state==='suspended') audioCtx.resume();
  // create soft pad chord: Cmaj7-ish warm
  const freqs=[130.81, 164.81, 196.00, 246.94]; // C3 E3 G3 B3
  const now=audioCtx.currentTime;
  freqs.forEach((f,i)=>{
    const osc=audioCtx.createOscillator();
    const gain=audioCtx.createGain();
    const filt=audioCtx.createBiquadFilter();
    filt.type='lowpass'; filt.frequency.value= 900 + i*120;
    filt.Q.value=0.7;
    osc.type='sine';
    osc.frequency.value=f;
    // slight detune for chorus
    osc.detune.value= (Math.random()-.5)*6;
    gain.gain.setValueAt(0,0);
    gain.gain.linearRampToValueAt(now+2.2, 0.045/(i+1));
    osc.connect(filt); filt.connect(gain); gain.connect(masterGain);
    osc.start();
    bgOscillators.push({osc,gain,filt});
    // gentle LFO on gain
    const lfo=audioCtx.createOscillator(); const lfoG=audioCtx.createGain();
    lfo.frequency.value=0.07 + Math.random()*0.05;
    lfoG.gain.value=0.012;
    lfo.connect(lfoG); lfoG.connect(gain.gain);
    lfo.start();
    bgOscillators.push({osc:lfo});
  });
  // master fade in
  masterGain.gain.cancelScheduledValues(now);
  masterGain.gain.setValueAtTime(masterGain.gain.value, now);
  masterGain.gain.linearRampToValueAtTime(0.42, now+2.5);
}
function stopPad(){
  if(!masterGain) return;
  const now=audioCtx.currentTime;
  masterGain.gain.cancelScheduledValues(now);
  masterGain.gain.linearRampToValueAtTime(0, now+1.2);
  setTimeout(()=>{
    bgOscillators.forEach(o=>{ try{o.osc.stop(); o.osc.disconnect();}catch(e){} });
    bgOscillators=[];
  }, 1400);
}
function toggleMusic(forceOn){
  const btn=document.getElementById('musicBtn');
  const willOn = forceOn!==undefined ? forceOn : !isMusicOn;
  if(willOn===isMusicOn) return;
  isMusicOn=willOn;
  btn.classList.toggle('muted', !isMusicOn);
  document.querySelector('#musicBtn .music-txt').textContent = isMusicOn ? 'Sound on' : 'Sound off';
  if(isMusicOn) playPad();
  else stopPad();
}
function playChime(high){
  ensureAudioCtx();
  if(audioCtx.state==='suspended') audioCtx.resume();
  const now=audioCtx.currentTime;
  [0,4,7].forEach((semi,i)=>{
    const o=audioCtx.createOscillator();
    const g=audioCtx.createGain();
    o.type='sine';
    o.frequency.value= 440 * Math.pow(2, ( (high?12:0)+semi)/12);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.22, now+0.02+i*0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, now+1.6+i*0.2);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(now+i*0.08); o.stop(now+2);
  });
}
