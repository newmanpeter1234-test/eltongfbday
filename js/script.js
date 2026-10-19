/* ============================================================
   ANZIYA — THE STORY OF US · main script
   gate slider → iris wipe → hero kinetics → pinned first-meet →
   swipe strip → video stage → horizontal timeline → word-fill
   letter → make-a-wish fireworks finale
   ============================================================ */
gsap.registerPlugin(ScrollTrigger);

let lenis;
let audioCtx, masterGain, musicGain, isMusicOn = false, musicTimer = null, musicStep = 0;

function safePlay(v){
  try{
    const p = v.play();
    if(p && typeof p.catch === 'function') p.catch(() => {});
  }catch(e){}
}

document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('locked');
  buildStrip();
  buildTimeline();
  splitLetter();
  initLoader();
  initGate();
  initSound();
  setupLenis();
  setupHero();
  setupMeet();
  setupStripInteractions();
  setupReel();
  setupTimelineScroll();
  setupLetterFill();
  setupFinale();
  setupTopline();
  setupPolaroids();
});

/* ================= LOADER ================= */
function initLoader(){
  const loader = document.getElementById('loader');
  const num = document.getElementById('ldNum');
  const bar = document.getElementById('ldBar');
  let p = 0, done = false;
  const tick = setInterval(() => {
    p = Math.min(94, p + Math.random() * 9);
    num.textContent = Math.round(p);
    bar.style.width = p + '%';
  }, 90);

  const imgs = Array.from(document.images);
  const wait = imgs.map(img => img.complete ? Promise.resolve() :
    new Promise(res => { img.onload = res; img.onerror = res; setTimeout(res, 2500); }));

  Promise.all(wait).then(() => finish());
  setTimeout(() => finish(), 3400); // hard cap

  function finish(){
    if(done) return;
    done = true;
    clearInterval(tick);
    num.textContent = '100';
    bar.style.width = '100%';
    setTimeout(() => {
      loader.classList.add('out');
      gsap.fromTo('.gate-card', { y: 34, opacity: 0, rotateX: -7 },
        { y: 0, opacity: 1, rotateX: 0, duration: 1, ease: 'power3.out', delay: .1 });
      gsap.fromTo('.gate-ticker', { opacity: 0 }, { opacity: .9, duration: 1.2, delay: .25 });
    }, 380);
  }
}

/* ================= GATE — SLIDER ================= */
function initGate(){
  const slider = document.getElementById('slider');
  const knob = document.getElementById('slKnob');
  const fill = document.getElementById('slFill');
  const hint = document.getElementById('slHint');
  let dragging = false, done = false;

  const maxX = () => slider.clientWidth - knob.offsetWidth - 10;

  function setX(x, withTransition){
    knob.style.transition = withTransition ? 'transform .45s cubic-bezier(.2,.9,.25,1.2)' : 'none';
    knob.style.transform = `translateX(${x}px)`;
    fill.style.transition = withTransition ? 'width .45s ease' : 'none';
    fill.style.width = (10 + x) + 'px';
    // fill is % based — convert
    fill.style.width = ((x + knob.offsetWidth + 10) / slider.clientWidth * 100) + '%';
    slider.setAttribute('aria-valuenow', Math.round(x / maxX() * 100));
  }

  function complete(){
    if(done) return;
    done = true;
    slider.classList.add('done');
    setX(maxX(), true);
    hint.style.opacity = 0;
    playChime();
    if(!isMusicOn) toggleMusic(true);
    setTimeout(openGate, 480);
  }

  function onDown(e){
    if(done) return;
    dragging = true;
    slider.setPointerCapture && e.pointerId !== undefined && slider.setPointerCapture(e.pointerId);
  }
  function onMove(e){
    if(!dragging || done) return;
    const rect = slider.getBoundingClientRect();
    const x = Math.max(0, Math.min(maxX(), (e.clientX ?? (e.touches && e.touches[0].clientX)) - rect.left - knob.offsetWidth / 2 - 5));
    setX(x, false);
    if(x >= maxX() - 4) { dragging = false; complete(); }
  }
  function onUp(){
    if(done || !dragging) return;
    dragging = false;
    setX(0, true); // spring back
  }

  slider.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  slider.addEventListener('keydown', e => {
    if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); complete(); }
  });
}

function openGate(){
  const gate = document.getElementById('gate');
  const iris = document.getElementById('iris');
  const story = document.getElementById('story');

  // iris expands (paper) over the gate…
  iris.style.transition = 'clip-path .85s cubic-bezier(.7,0,.3,1)';
  iris.style.clipPath = 'circle(150% at 50% 50%)';

  setTimeout(() => {
    // …unlock the story underneath while the screen is fully covered…
    document.body.classList.remove('locked');
    story.classList.add('unlocked');
    ScrollTrigger.refresh();
    playHeroIn();
  }, 700);

  setTimeout(() => {
    gate.classList.add('gone');
    ScrollTrigger.refresh();
  }, 950);

  setTimeout(() => {
    gate.style.display = 'none';
    ScrollTrigger.refresh();
  }, 1600);
}

/* ================= SOUND — generative melody ================= */
function initSound(){
  document.getElementById('musicBtn').addEventListener('click', () => toggleMusic());
}

function ensureAudio(){
  if(audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0;
  const comp = audioCtx.createDynamicsCompressor();
  masterGain.connect(comp);
  comp.connect(audioCtx.destination);
}

/* warm plucked I–V–vi–IV arpeggio (nothing like a background pad) */
const CHORDS = [
  { root: 110.00, tones: [220.00, 277.18, 329.63, 415.30] },  // Amaj7
  { root: 82.41,  tones: [164.81, 207.65, 246.94, 329.63] },  // E
  { root: 92.50,  tones: [185.00, 220.00, 277.18, 329.63] },  // F#m7-ish
  { root: 73.42,  tones: [146.83, 185.00, 220.00, 277.18] },  // D
];
const ARP = [0, 1, 2, 3, 2, 3, 1, 2];

function pluck(freq, when, vel = .16, dur = .55){
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  const f = audioCtx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(2600, when);
  f.frequency.exponentialRampToValueAtTime(700, when + dur);
  osc.type = 'triangle';
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(vel, when + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  osc.connect(f); f.connect(g); g.connect(musicGain);
  osc.start(when); osc.stop(when + dur + .05);
}
function bass(freq, when, dur = 1.4){
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.20, when + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  osc.connect(g); g.connect(musicGain);
  osc.start(when); osc.stop(when + dur + .05);
}

function startMusic(){
  ensureAudio();
  if(audioCtx.state === 'suspended') audioCtx.resume();
  if(!musicGain){
    musicGain = audioCtx.createGain();
    musicGain.gain.value = 1;
    const delay = audioCtx.createDelay(1);
    delay.delayTime.value = 0.38;
    const fb = audioCtx.createGain(); fb.gain.value = 0.32;
    const wet = audioCtx.createGain(); wet.gain.value = 0.4;
    musicGain.connect(masterGain);
    musicGain.connect(delay);
    delay.connect(fb); fb.connect(delay);
    delay.connect(wet); wet.connect(masterGain);
  }
  const now = audioCtx.currentTime;
  masterGain.gain.cancelScheduledValues(now);
  masterGain.gain.setValueAtTime(masterGain.gain.value, now);
  masterGain.gain.linearRampToValueAtTime(0.5, now + 2);

  if(musicTimer) return; // already running
  const BEAT = 60 / 74 / 2; // eighth notes @74bpm
  let nextT = audioCtx.currentTime + 0.1;
  musicStep = 0;
  musicTimer = setInterval(() => {
    while(nextT < audioCtx.currentTime + 0.35){
      const bar = Math.floor(musicStep / 8) % CHORDS.length;
      const ch = CHORDS[bar];
      const idx = ARP[musicStep % 8];
      pluck(ch.tones[idx], nextT, musicStep % 4 === 0 ? 0.19 : 0.13);
      if(musicStep % 8 === 0){ bass(ch.root, nextT, 2.1); }
      if(musicStep % 8 === 4){ bass(ch.root, nextT, 1.2); }
      nextT += BEAT;
      musicStep++;
    }
  }, 110);
}

function stopMusic(){
  if(!masterGain || !audioCtx) return;
  const now = audioCtx.currentTime;
  masterGain.gain.cancelScheduledValues(now);
  masterGain.gain.setValueAtTime(masterGain.gain.value, now);
  masterGain.gain.linearRampToValueAtTime(0, now + 0.9);
  setTimeout(() => {
    if(musicTimer){ clearInterval(musicTimer); musicTimer = null; }
  }, 1000);
}

function toggleMusic(force){
  const btn = document.getElementById('musicBtn');
  const willOn = force !== undefined ? force : !isMusicOn;
  if(willOn === isMusicOn) return;
  isMusicOn = willOn;
  btn.classList.toggle('on', isMusicOn);
  btn.setAttribute('aria-pressed', String(isMusicOn));
  btn.querySelector('.sp-txt').textContent = isMusicOn ? 'music on' : 'music off';
  if(isMusicOn) startMusic(); else stopMusic();
}

function playChime(){
  ensureAudio();
  if(audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  [0, 4, 7, 12].forEach((semi, i) => {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.value = 523.25 * Math.pow(2, semi / 12); // from C5
    g.gain.setValueAtTime(0.0001, now + i * 0.09);
    g.gain.exponentialRampToValueAtTime(0.16, now + i * 0.09 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.09 + 1.5);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(now + i * 0.09); o.stop(now + i * 0.09 + 1.6);
  });
}

/* ================= LENIS ================= */
function setupLenis(){
  if(typeof window.ResizeObserver === 'undefined'){
    window.ResizeObserver = class { observe(){} unobserve(){} disconnect(){} };
  }
  try{
    lenis = new Lenis({
      duration: 1.1,
      easing: t => Math.min(1, 1 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      gestureOrientation: 'vertical',
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }catch(e){ lenis = null; }
}

/* ================= HERO ================= */
function splitLetter(){
  const holder = document.querySelector('.hero-name .ln');
  const word = holder.getAttribute('data-word') || 'ANZIYA';
  holder.innerHTML = [...word].map(c => `<span class="ch">${c}</span>`).join('');
}

let heroPlayed = false;
function setupHero(){
  gsap.set('.hero-name .ch', { yPercent: 120, rotationX: -85, opacity: 0, transformOrigin: '50% 100%' });
  gsap.set(['.hero-badge', '.hero-tag', '.scroll-cue'], { opacity: 0, y: 18 });

  // scroll parallax on hero
  gsap.to('.hero-name', {
    yPercent: -18, ease: 'none',
    scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true },
  });
  gsap.to('.hero-tag', {
    yPercent: -50, opacity: .2, ease: 'none',
    scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true },
  });
}
function playHeroIn(){
  if(heroPlayed) return;
  heroPlayed = true;
  const tl = gsap.timeline({ delay: .15 });
  tl.to('.hero-badge', { opacity: 1, y: 0, duration: .6, ease: 'power3.out' })
    .to('.hero-name .ch', {
      yPercent: 0, rotationX: 0, opacity: 1,
      duration: .9, ease: 'back.out(1.6)', stagger: .065,
    }, '-=.25')
    .to('.hero-tag', { opacity: 1, y: 0, duration: .7, ease: 'power3.out' }, '-=.4')
    .to('.scroll-cue', { opacity: 1, y: 0, duration: .6 }, '-=.3');
}

function setupPolaroids(){
  document.querySelectorAll('.polaroid').forEach((el, i) => {
    gsap.to(el, {
      y: '+=16', rotation: i % 2 ? '+=2.5' : '-=2.5',
      duration: 2.6 + i * .5, yoyo: true, repeat: -1, ease: 'sine.inOut',
    });
    gsap.to(el, {
      yPercent: i % 2 ? -40 : -70, ease: 'none',
      scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true },
    });
  });
}

/* ================= FIRST MEET — pinned scrollytelling ================= */
function setupMeet(){
  const media = document.querySelector('.meet-media');
  const lines = gsap.utils.toArray('.ml');

  gsap.fromTo(media,
    { filter: 'blur(14px) saturate(.6)', scale: 1.08, rotation: -1.5 },
    {
      filter: 'blur(0px) saturate(1)', scale: 1, rotation: 0, ease: 'none',
      scrollTrigger: { trigger: '#firstMeet', start: 'top 70%', end: 'top 5%', scrub: true },
    });

  // light the story lines based on scroll progress through the tall section
  ScrollTrigger.create({
    trigger: '#firstMeet',
    start: 'top 45%',
    end: 'bottom 90%',
    onUpdate: self => {
      const p = self.progress;
      lines.forEach((el, i) => {
        const at = (i + 1) / (lines.length + 0.6);
        el.classList.toggle('lit', p >= at * 0.72);
      });
    },
  });

  // chip pops in
  gsap.fromTo('.meet-chip', { y: 24, opacity: 0 }, {
    y: 0, opacity: 1, duration: .7, ease: 'back.out(2)',
    scrollTrigger: { trigger: '#firstMeet', start: 'top 55%', toggleActions: 'play none none reverse' },
  });
}

/* ================= STRIP — build + drag + tilt ================= */
function buildStrip(){
  const strip = document.getElementById('strip');
  CONFIG.cards.forEach(c => {
    const el = document.createElement('article');
    el.className = 'mcard' + (c.wide ? ' wide' : '');
    el.innerHTML = `
      <div class="mc-media">
        <span class="mc-num">${c.num}</span>
        <span class="mc-tag">${c.tag}</span>
        <img src="${c.src}" alt="${c.title}" loading="lazy" draggable="false">
      </div>
      <h3>${c.title}</h3>
      <p>${c.caption}</p>
      <div class="mc-accent"></div>`;
    strip.appendChild(el);
  });
}

function setupStripInteractions(){
  const strip = document.getElementById('strip');
  const bar = document.getElementById('stripBar');

  // progress
  const updateBar = () => {
    const max = strip.scrollWidth - strip.clientWidth;
    const p = max > 0 ? strip.scrollLeft / max : 0;
    bar.style.width = Math.max(8, p * 100) + '%';
  };
  strip.addEventListener('scroll', updateBar, { passive: true });

  // pointer drag-to-scroll (desktop & touch fallback)
  let down = false, startX = 0, startL = 0, moved = false;
  strip.addEventListener('pointerdown', e => {
    if(e.pointerType === 'touch') return; // native touch scroll is better
    down = true; moved = false;
    startX = e.clientX; startL = strip.scrollLeft;
    strip.classList.add('dragging');
  });
  window.addEventListener('pointermove', e => {
    if(!down) return;
    const dx = e.clientX - startX;
    if(Math.abs(dx) > 4) moved = true;
    strip.scrollLeft = startL - dx;
  });
  window.addEventListener('pointerup', () => {
    down = false;
    strip.classList.remove('dragging');
  });

  // entrance
  gsap.fromTo('.mcard',
    { y: 70, rotationY: 28, opacity: 0 },
    {
      y: 0, rotationY: 0, opacity: 1, duration: .9, ease: 'power3.out', stagger: .07,
      scrollTrigger: { trigger: strip, start: 'top 85%', once: true },
    });

  // 3D tilt (hover devices only)
  if(window.matchMedia('(hover:hover) and (pointer:fine)').matches){
    document.querySelectorAll('.mcard').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const rx = ((e.clientY - r.top) / r.height - .5) * -10;
        const ry = ((e.clientX - r.left) / r.width - .5) * 12;
        gsap.to(card, { rotationX: rx, rotationY: ry, transformPerspective: 900, duration: .35, ease: 'power2.out' });
      });
      card.addEventListener('pointerleave', () => {
        gsap.to(card, { rotationX: 0, rotationY: 0, duration: .7, ease: 'elastic.out(1,.5)' });
      });
    });
  }
}

/* ================= VIDEO STAGE ================= */
function setupReel(){
  const video = document.getElementById('bigVideo');
  const btn = document.getElementById('playBtn');
  const bar = document.getElementById('plBar');
  const reels = document.querySelectorAll('.reel');

  function toggle(){
    if(video.paused){ safePlay(video); btn.classList.add('hide'); }
    else { video.pause(); btn.classList.remove('hide'); }
  }
  btn.addEventListener('click', e => { e.stopPropagation(); toggle(); });
  document.getElementById('player').addEventListener('click', toggle);
  video.addEventListener('timeupdate', () => {
    if(video.duration) bar.style.width = (video.currentTime / video.duration * 100) + '%';
  });

  // autoplay while section visible
  const io = new IntersectionObserver(entries => {
    entries.forEach(ent => {
      if(ent.isIntersecting){
        if(video.currentTime === 0){
          video.muted = true;
          video.playbackRate = 1;
        }
        safePlay(video);
        btn.classList.add('hide');
      } else {
        video.pause();
        btn.classList.remove('hide');
      }
    });
  }, { threshold: .4 });
  io.observe(document.getElementById('player'));

  // reel thumbs seek + active state
  reels.forEach((r, i) => {
    r.addEventListener('click', () => {
      const t = parseFloat(r.getAttribute('data-t')) || 0;
      const set = () => { try{ video.currentTime = t; }catch(e){} };
      if(video.readyState >= 1) set();
      else video.addEventListener('loadedmetadata', set, { once: true });
      reels.forEach(x => x.classList.remove('active'));
      r.classList.add('active');
      safePlay(video);
      btn.classList.add('hide');
    });
  });
  if(reels[0]) reels[0].classList.add('active');
}

/* ================= TIMELINE — horizontal scroll ================= */
function buildTimeline(){
  const track = document.getElementById('tlTrack');
  const line = track.querySelector('.tl-line');
  CONFIG.timeline.forEach(t => {
    const el = document.createElement('div');
    el.className = 'tl-item';
    el.innerHTML = `
      <span class="tdot"></span>
      <p class="tl-date">${t.date}</p>
      <div class="tl-card"><h4>${t.title}</h4><p>${t.text}</p></div>`;
    track.appendChild(el);
  });
  track.appendChild(line); // keep line on top of stacking order
}

function setupTimelineScroll(){
  const track = document.getElementById('tlTrack');
  const fill = document.getElementById('tlFill');
  const dist = () => Math.max(0, track.scrollWidth - window.innerWidth + 60);

  gsap.to(track, {
    x: () => -dist(),
    ease: 'none',
    scrollTrigger: {
      trigger: '#timeline',
      start: 'top top',
      end: () => '+=' + (dist() + 300),
      pin: true,
      scrub: 0.6,
      invalidateOnRefresh: true,
      onUpdate: self => {
        fill.style.width = (self.progress * 100) + '%';
        // pop dots as they pass
        gsap.utils.toArray('.tl-item').forEach(item => {
          const r = item.getBoundingClientRect();
          const on = r.left < window.innerWidth * 0.85;
          gsap.to(item.querySelector('.tdot'), {
            scale: on ? 1.18 : 1, duration: .3, overwrite: 'auto',
          });
          gsap.to(item, { opacity: on ? 1 : .35, duration: .3, overwrite: 'auto' });
        });
      },
    },
  });
}

/* ================= LETTER — word-by-word colour fill ================= */
function setupLetterFill(){
  const ps = gsap.utils.toArray('#letterBody p');
  ps.forEach(p => {
    const nodes = [...p.childNodes];
    p.innerHTML = '';
    const frag = document.createDocumentFragment();
    const pushWords = (text, target) => {
      text.split(/(\s+)/).forEach(part => {
        if(!part) return;
        if(/^\s+$/.test(part)){ target.appendChild(document.createTextNode(part)); return; }
        const s = document.createElement('span');
        s.className = 'w';
        s.textContent = part;
        target.appendChild(s);
      });
    };
    nodes.forEach(child => {
      if(child.nodeType === 3){
        pushWords(child.textContent, frag);
      } else if(child.nodeType === 1){
        const clone = child.cloneNode(false);
        const holder = document.createDocumentFragment();
        [...child.childNodes].forEach(inner => {
          if(inner.nodeType === 3) pushWords(inner.textContent, holder);
          else holder.appendChild(inner.cloneNode(true));
        });
        clone.appendChild(holder);
        frag.appendChild(clone);
      }
    });
    p.appendChild(frag);

    const words = p.querySelectorAll('.w');
    const inEm = [];
    const normal = [];
    words.forEach(w => (w.closest('em') ? inEm : normal).push(w));
    const target = p.classList.contains('letter-sign') ? '#e6447c' : '#241226';

    gsap.to(normal, {
      color: target, ease: 'none', stagger: .5,
      scrollTrigger: { trigger: p, start: 'top 86%', end: 'top 42%', scrub: true },
    });
    if(inEm.length){
      gsap.to(inEm, {
        color: '#ff5a3c', ease: 'none', stagger: .5,
        scrollTrigger: { trigger: p, start: 'top 86%', end: 'top 42%', scrub: true },
      });
    }
  });
}

/* ================= FINALE ================= */
function setupFinale(){
  const wishBtn = document.getElementById('wishBtn');
  const stage = document.getElementById('finStage');
  const reveal = document.getElementById('finReveal');

  wishBtn.addEventListener('click', () => {
    if(reveal.classList.contains('show')) return;
    if(navigator.vibrate) navigator.vibrate([40, 30, 70]);
    playChime();

    gsap.to(stage, {
      opacity: 0, scale: .6, duration: .55, ease: 'power3.in',
      onComplete: () => { stage.style.display = 'none'; },
    });

    reveal.classList.add('show');
    reveal.removeAttribute('aria-hidden');
    FX.start();

    const tl = gsap.timeline({ delay: .7 });
    tl.fromTo('.fin-photo',
        { opacity: 0, y: 60, rotation: -8, scale: .9 },
        { opacity: 1, y: 0, rotation: -3, scale: 1, duration: 1, ease: 'back.out(1.4)' })
      .to('.fin-credits p:not(.fin-date)', {
        opacity: 1, y: 0, duration: .8, ease: 'power3.out', stagger: .55,
      }, '-=.3')
      .to('.fin-bday', { opacity: 1, y: 0, duration: .9, ease: 'back.out(1.5)' }, '-=.2')
      .to('.fin-date', { opacity: 1, y: 0, duration: .6 }, '-=.4')
      .to('#replayBtn', { opacity: 1, duration: .6 }, '-=.2');

    // late fireworks bursts
    setTimeout(() => FX.start(), 2600);
  });

  document.getElementById('replayBtn').addEventListener('click', () => {
    FX.stop();
    window.scrollTo(0, 0);
    setTimeout(() => location.reload(), 350);
  });
}

/* ================= TOP PROGRESS ================= */
function setupTopline(){
  const span = document.querySelector('#topline span');
  ScrollTrigger.create({
    trigger: document.body,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: self => { span.style.width = (self.progress * 100) + '%'; },
  });
}
