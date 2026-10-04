/* WW4 — feedback layer: haptics + synthesised sound.
   Shared by index.html and ww4-multiplayer.html as a classic script, so its
   globals are reachable from both the plain script and the module.

   Tones are generated with Web Audio rather than shipped as files: no extra
   assets to cache, nothing to load, and it works offline like the rest of the
   shell. Every call is wrapped because both APIs are optional — desktop Safari
   has no vibrate, and a locked-down browser can refuse an AudioContext. */
/* Storage is optional too: with site data blocked, or in some embedded views,
   the localStorage accessor itself throws. This file is a classic script, so an
   uncaught throw at the top level would take FX, warmCardArt and toggleSound
   down with it and the game could not start at all. Default to sound on. */
function storageGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
function storageSet(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
const FX={
  on: storageGet('ww4-sound')!=='off',
  _ctx:null,
  ctx(){
    if(!this._ctx){
      try{ this._ctx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ return null; }
      /* iPhone routes Web Audio through the "ambient" session by default, which
         the ring/silent switch mutes — so with the switch off the game looked
         broken rather than muted. Declaring playback opts out of that.
         Safari 16.4+; guarded because no other browser implements it yet. */
      try{ if(navigator.audioSession) navigator.audioSession.type='playback'; }catch(e){}
    }
    // Browsers start the context suspended until a gesture; every FX call
    // follows a tap, so resuming here is enough.
    if(this._ctx.state==='suspended') this._ctx.resume().catch(()=>{});
    return this._ctx;
  },
  /* One shaped oscillator note. */
  tone(freq,dur,{type='triangle',gain=.09,to=null,delay=0}={}){
    if(!this.on) return;
    const ctx=this.ctx(); if(!ctx) return;
    const t0=ctx.currentTime+delay;
    const osc=ctx.createOscillator(), g=ctx.createGain();
    osc.type=type;
    osc.frequency.setValueAtTime(freq,t0);
    if(to) osc.frequency.exponentialRampToValueAtTime(Math.max(1,to),t0+dur);
    g.gain.setValueAtTime(0,t0);
    g.gain.linearRampToValueAtTime(gain,t0+Math.min(.02,dur/3));
    g.gain.exponentialRampToValueAtTime(.0001,t0+dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0); osc.stop(t0+dur+.02);
  },
  /* Filtered noise burst — the card/impact texture. */
  noise(dur,{gain=.07,freq=1200,q=.7,delay=0}={}){
    if(!this.on) return;
    const ctx=this.ctx(); if(!ctx) return;
    const t0=ctx.currentTime+delay;
    const n=Math.max(1,Math.floor(ctx.sampleRate*dur));
    const buf=ctx.createBuffer(1,n,ctx.sampleRate), d=buf.getChannelData(0);
    for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*(1-i/n);
    const src=ctx.createBufferSource(); src.buffer=buf;
    const bp=ctx.createBiquadFilter(); bp.type='bandpass';
    bp.frequency.value=freq; bp.Q.value=q;
    const g=ctx.createGain(); g.gain.value=gain;
    src.connect(bp).connect(g).connect(ctx.destination);
    src.start(t0); src.stop(t0+dur+.02);
  },
  buzz(pattern){
    // Haptics follow the sound switch, so one control silences the whole game.
    // No-ops on iPhone: iOS Safari does not implement the Vibration API at all,
    // so the game is sound-only there. Kept for Android and future support.
    if(!this.on) return;
    try{ navigator.vibrate && navigator.vibrate(pattern); }catch(e){}
  },
  flip(){ this.noise(.13,{freq:1700,gain:.05}); this.tone(420,.09,{type:'square',gain:.03}); this.buzz(12); },
  win() { this.tone(523,.13,{gain:.07}); this.tone(784,.22,{gain:.07,delay:.1}); this.buzz([0,22,45,28]); },
  lose(){ this.tone(300,.3,{to:150,type:'sawtooth',gain:.05}); this.buzz(45); },
  war() { this.noise(.5,{freq:260,gain:.12,q:.4}); this.tone(90,.55,{to:42,type:'sawtooth',gain:.1});
          this.buzz([0,70,50,130]); },
  victory(){ [523,659,784,1046].forEach((f,i)=>this.tone(f,.32,{gain:.07,delay:i*.11}));
             this.buzz([0,40,55,40,55,130]); },
  defeat(){ [392,330,262].forEach((f,i)=>this.tone(f,.42,{type:'sawtooth',gain:.055,delay:i*.16}));
            this.buzz([0,90,60,160]); },
  toggle(){
    this.on=!this.on;
    storageSet('ww4-sound', this.on?'on':'off');
    renderSoundBtn();
    if(this.on) this.flip();      // confirm audibly that it came back on
  }
};

function renderSoundBtn(){
  const b=document.getElementById('sound-btn');
  if(!b) return;
  b.textContent = FX.on ? '🔊' : '🔇';
  b.setAttribute('aria-label', FX.on ? 'Sound on — tap to mute' : 'Sound off — tap to unmute');
  b.setAttribute('aria-pressed', String(!FX.on));
}
window.toggleSound=()=>FX.toggle();
window.addEventListener('DOMContentLoaded', renderSoundBtn);

/* ── Two-tap quit ──────────────────────────────────────────────────────────
   The first tap arms the ✕ button, the second confirms. A modal would be surer
   but heavier, and an unguarded single tap next to FLIP would throw away a
   long game by accident. Disarms itself after 3s. Shared by both pages; each
   passes what "confirm" means for it (back to setup, or leave the room). */
let quitArmed=null;
function armQuit(confirm){
  if(quitArmed){ disarmQuit(); confirm(); return; }
  const b=document.getElementById('quit-btn');
  if(!b) return;
  b.classList.add('arm');
  b.textContent='LEAVE?';
  b.setAttribute('aria-label','Tap again to leave the game');
  quitArmed=setTimeout(disarmQuit, 3000);
}
function disarmQuit(){
  if(quitArmed){ clearTimeout(quitArmed); quitArmed=null; }
  const b=document.getElementById('quit-btn');
  if(!b) return;
  b.classList.remove('arm');
  b.textContent='✕';
  b.setAttribute('aria-label','Leave this game');
}
window.armQuit=armQuit;
window.disarmQuit=disarmQuit;

/* ── Gold confetti burst ───────────────────────────────────────────────────
   Same spawn approach as the WW4 blast sparks. The pages differ only in which
   box they fill and which CSS class animates the pieces. */
function spawnConfetti(boxId, cls){
  const box=document.getElementById(boxId);
  if(!box) return;
  box.innerHTML='';
  const colors=['#c8a84b','#e8dfc8','#ffd700','#a83224','#d6ba6e'];
  for(let i=0;i<60;i++){
    const c=document.createElement('div');
    c.className=cls;
    c.style.cssText=`left:${Math.random()*100}%;background:${colors[i%colors.length]};`+
      `--d:${2.4+Math.random()*2}s;--delay:${Math.random()*1.2}s;`+
      `--spin:${(Math.random()>.5?1:-1)*(360+Math.random()*540)}deg;`+
      `width:${5+Math.random()*5}px;height:${9+Math.random()*8}px;`;
    box.appendChild(c);
  }
}
window.spawnConfetti=spawnConfetti;

/* ── Card art warmer ───────────────────────────────────────────────────────
   The 79 card faces are background-images, so each one hit the network the
   first time its rank came up — on a phone that showed as a card landing
   blank and filling in a beat later. Pull them into the HTTP cache in the
   background once a game starts. Sequential with a small concurrency cap so it
   never competes with the images actually on screen. */
const CARD_NATIONS=['usa','cn','ru','ir','il','tw'];
const CARD_RANKS=['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
let cardsWarmed=false;
function warmCardArt(version){
  if(cardsWarmed) return;
  cardsWarmed=true;
  const urls=[`cards/back.webp?v=${version}`, `cards/joker.webp?v=${version}`];
  for(const n of CARD_NATIONS)
    for(const r of CARD_RANKS)
      urls.push(`cards/${n}_${r}.webp?v=${version}`);
  let i=0;
  const pump=()=>{
    if(i>=urls.length) return;
    const img=new Image();
    // Either outcome frees the slot — a missing file must not stall the queue.
    img.onload=img.onerror=pump;
    img.src=urls[i++];
  };
  const LANES=4;
  const start=()=>{ for(let k=0;k<LANES;k++) pump(); };
  // Idle time if the browser offers it, otherwise just after first paint.
  if(window.requestIdleCallback) requestIdleCallback(start,{timeout:2500});
  else setTimeout(start,1200);
}
window.warmCardArt=warmCardArt;
