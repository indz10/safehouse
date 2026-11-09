<script>
/* =========================================================
   AUDIO: musica generata dal telefono (nessun file) + effetti
   - "app": tappeto tensivo (drone, battito, campane dissonanti)
   - "game": ritmo incalzante (cassa, charleston, basso ostinato),
     più veloce con le ondate alte
   ========================================================= */
const AUD={c:null,master:null,mus:null,mode:null,on:true,timer:null,next:0,step:0,bpm:118,started:false,nodes:[]};
function audioCtx(){try{if(!AUD.c){AUD.c=new(window.AudioContext||window.webkitAudioContext)();AUD.master=AUD.c.createGain();AUD.master.gain.value=.9;
  /* iPhone: l'audio "web" è zittito dall'interruttore silenzioso; quello dei lettori multimediali no.
     Su iOS mandiamo tutta l'uscita in un elemento <audio> (come un lettore musicale). */
  const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  if(ios&&AUD.c.createMediaStreamDestination){try{const d=AUD.c.createMediaStreamDestination();AUD.master.connect(d);
      const el=document.createElement('audio');el.setAttribute('playsinline','');el.autoplay=true;el.srcObject=d.stream;document.body.appendChild(el);AUD.outEl=el;
      const p=el.play();if(p&&p.then)p.then(()=>{AUD.route='media';}).catch(()=>{AUD.master.connect(AUD.c.destination);AUD.route='web';});else{AUD.route='media';}}
    catch(e){AUD.master.connect(AUD.c.destination);AUD.route='web';}}
  else{AUD.master.connect(AUD.c.destination);AUD.route='web';}
  AUD.mus=AUD.c.createGain();AUD.mus.gain.value=0;AUD.mus.connect(AUD.master);}
  if(AUD.c.state==='suspended'){const p=AUD.c.resume();if(p&&p.catch)p.catch(()=>{});}return AUD.c;}catch(e){return null;}}
const NOTE=n=>440*Math.pow(2,(n-69)/12);
/* --- effetti: riverbero e eco --- */
function fx(){if(AUD.fx)return AUD.fx;const c=AUD.c;
  const conv=c.createConvolver();const len=Math.floor(c.sampleRate*2.6);const ir=c.createBuffer(2,len,c.sampleRate);
  for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.6);}
  conv.buffer=ir;const rv=c.createGain();rv.gain.value=.4;conv.connect(rv);rv.connect(AUD.mus);
  const dl=c.createDelay(1.5);dl.delayTime.value=.36;const fb=c.createGain();fb.gain.value=.33;const dg=c.createGain();dg.gain.value=.3;
  dl.connect(fb);fb.connect(dl);dl.connect(dg);dg.connect(AUD.mus);dg.connect(conv);
  AUD.fx={conv,dl};return AUD.fx;}
function voice(t,f,d,o={}){const c=AUD.c;const osc=c.createOscillator();osc.type=o.type||'triangle';osc.frequency.setValueAtTime(f,t);if(o.det)osc.detune.setValueAtTime(o.det,t);if(o.f2)osc.frequency.exponentialRampToValueAtTime(o.f2,t+d);
  const g=c.createGain();const v=o.v||.05,a=Math.max(.003,o.a||.01),hold=Math.max(a,d-(o.r!=null?o.r:d*.7));
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+a);g.gain.setValueAtTime(v,t+hold);g.gain.exponentialRampToValueAtTime(.0001,t+d+.04);
  let node=osc;if(o.lp){const fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.setValueAtTime(o.lp,t);if(o.lp2)fl.frequency.exponentialRampToValueAtTime(o.lp2,t+d);fl.Q.value=o.q||1;node.connect(fl);node=fl;}
  node.connect(g);let out=g;if(o.pan&&c.createStereoPanner){const p=c.createStereoPanner();p.pan.value=o.pan;g.connect(p);out=p;}
  out.connect(o.dest||AUD.mus);if(o.rev||o.dly){const F=fx();if(o.rev){const s=c.createGain();s.gain.value=o.rev;out.connect(s);s.connect(F.conv);}if(o.dly){const s=c.createGain();s.gain.value=o.dly;out.connect(s);s.connect(F.dl);}}
  osc.start(t);osc.stop(t+d+.1);}
function mNoise(t,d,v,hp=6000,dest,band){const c=AUD.c,b=c.createBuffer(1,Math.max(1,Math.floor(c.sampleRate*d)),c.sampleRate),a=b.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1;
  const s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();f.type=band?'bandpass':'highpass';f.frequency.value=band||hp;if(band)f.Q.value=1.2;s.buffer=b;g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);s.connect(f);f.connect(g);g.connect(dest||AUD.mus);s.start(t);}
/* --- batteria --- */
const kick=(t,v=.45)=>{voice(t,150,.2,{type:'sine',v,f2:42,a:.003,r:.18});voice(t,900,.025,{type:'square',v:.035,a:.002,r:.02});};
const snare=(t,v=.12)=>{mNoise(t,.18,v,0,null,1900);voice(t,200,.09,{type:'triangle',v:.1,f2:130,a:.002});mNoise(t,.22,v*.4,0,AUD.fx?AUD.fx.conv:null,2400);};
const hat=(t,v=.035,open)=>mNoise(t,open?.22:.045,v,7500);
function stopDrone(){AUD.nodes.forEach(n=>{try{n.stop();}catch(e){}});AUD.nodes=[];}
function startDrone(){}
/* --- musica dell'app: "Mezzanotte" (84 bpm, la minore): si sente subito,
   battito morbido, basso, arpeggio a campanelli, pad e tema --- */
const APP_CH=[[57,60,64],[53,57,60],[48,52,55],[52,56,59]];
const APP_MEL=[[76,0,74,72,0,69,72,0],[72,0,0,69,0,65,69,0],[67,0,72,0,76,0,74,72],[71,0,68,0,64,0,0,0]];
const APP_MEL2=[[81,0,79,77,0,76,77,0],[77,0,0,76,0,72,74,0],[79,0,76,0,72,0,74,76],[76,77,76,71,0,68,0,0]];
function appStep(t,s,sd){const bar=Math.floor(s/8)%16,st=s%8,ch=APP_CH[bar%4],cyc=Math.floor(bar/4);
  /* pad */
  if(st===0)ch.forEach((n,i)=>[-8,8].forEach(dt=>voice(t,NOTE(n),sd*8.2,{type:'sawtooth',v:.016,det:dt,lp:900,lp2:1800,a:.25,r:1,rev:.5,pan:(i-1)*.4})));
  /* battito: cassa morbida "a cuore" e rullante leggero */
  if(st===0||st===3)voice(t,st?70:60,.22,{type:'sine',v:st?.2:.3,f2:40,a:.003,r:.2});
  if(st===4){mNoise(t,.12,.05,0,null,1800);voice(t,190,.06,{type:'triangle',v:.05,f2:140,a:.002});}
  if(st%2===1)mNoise(t,.03,.018,8000);
  /* basso */
  if(st===0||st===3||st===6)voice(t,NOTE(ch[0]-12+(st===6?7:0)),sd*1.6,{type:'sawtooth',v:.05,lp:700,lp2:220,a:.004,r:sd*1.3});
  /* arpeggio a campanelli */
  {const n=ch[[0,1,2,1,0,2,1,2][st]]+24;voice(t,NOTE(n),sd*1.4,{type:'triangle',v:.03,a:.002,r:sd*1.3,dly:.3,rev:.3,pan:st%2?.4:-.4});}
  /* tema: parte già al secondo giro */
  if(bar>=2){const mel=(cyc>=2?APP_MEL2:APP_MEL)[bar%4];const n=mel[st];
    if(n){voice(t,NOTE(n),sd*2.4,{type:'square',v:.03,lp:2400,a:.006,r:sd*2,rev:.35,dly:.3,pan:.1});voice(t,NOTE(n),sd*2.4,{type:'triangle',v:.05,a:.006,r:sd*2,rev:.3});}}
  if(bar===15&&st===4)mNoise(t,2,.03,0,null,900);}
/* --- musica di gioco: "L'orda" (re minore, velocità con il livello) --- */
const G_CH=[[50,53,57],[46,50,53],[43,46,50],[45,49,52]];
const G_LEAD=[[74,0,0,72,74,0,77,0,76,0,74,0,72,0,69,0],[70,0,0,69,70,0,74,0,72,0,70,0,69,0,0,0],[67,0,70,0,74,0,72,70,69,0,67,0,65,0,67,0],[69,0,0,0,73,0,76,0,79,0,0,0,76,0,73,0]];
function gameStep(t,s,sd){const bar=Math.floor(s/16)%16,st=s%16,ch=G_CH[bar%4],B=bar>=8,boss=(AUD.int||0)>=2,fill=bar===15&&st>=12;
  /* batteria */
  if(st===0||st===8||(B&&(st===6||st===11))||(boss&&st===14))kick(t);
  if(st===4||st===12)snare(t);if(fill)snare(t,.06+(st-12)*.02);
  if(st%2===0)hat(t,st%4===0?.04:.028);else if(B||boss)hat(t,.016);if(st===14&&!fill)hat(t,.03,true);
  /* basso */
  if(st%2===0){const pat=[0,0,12,0,0,12,0,7];const n=ch[0]-12+pat[st/2];voice(t,NOTE(n),sd*1.7,{type:'sawtooth',v:.05,lp:900,lp2:260,a:.004,r:sd*1.4});voice(t,NOTE(n-12),sd*1.7,{type:'triangle',v:.05,a:.004,r:sd*1.4});}
  /* arpeggio (sezione A) */
  if(!B){const n=ch[[0,1,2,1][st%4]]+12+(st>=8?12:0);voice(t,NOTE(n),sd*.9,{type:'square',v:.016,lp:2600,a:.003,r:sd*.8,dly:.25,pan:st%2?.35:-.35});}
  /* tema (sezione B) */
  if(B){const n=G_LEAD[bar%4][st];if(n){voice(t,NOTE(n),sd*1.9,{type:'square',v:.028,lp:3200,a:.006,r:sd*1.4,dly:.28,rev:.18,det:-6});voice(t,NOTE(n),sd*1.9,{type:'sawtooth',v:.016,lp:2400,a:.006,r:sd*1.4,det:6,pan:.25});}
    if(st===0)ch.forEach((n,i)=>voice(t,NOTE(n+12),.45,{type:'sawtooth',v:.014,lp:2000,a:.01,r:.4,rev:.35,pan:(i-1)*.4}));}
  /* boss: ottoni gravi */
  if(boss&&st%4===0)ch.forEach(n=>voice(t,NOTE(n-12),sd*3,{type:'sawtooth',v:.016,lp:1100,a:.02,r:sd*2,rev:.2}));}
function musicTick0(){const c=AUD.c;if(!c)return;
  const sd=AUD.mode==='game'?60/AUD.bpm/4:60/84/2;
  while(AUD.next<c.currentTime+.15){const t=AUD.next,s=AUD.step;
    if(AUD.mode==='app')appStep(t,s,sd);else if(AUD.mode==='game')gameStep(t,s,sd);
    AUD.next+=sd;AUD.step++;}}
function setMusicIntensity(v){AUD.int=v;}

function musicTick(){try{musicTick0();}catch(e){clearInterval(AUD.timer);AUD.timer=null;}}
function setMusic(mode,level){try{setMusic0(mode,level);}catch(e){}}
function setMusic0(mode,level){
  AUD.wanted=mode;if(level)AUD.bpm=Math.min(152,116+level*3);if(mode==='app')AUD.int=0;
  if(!AUD.on||!AUD.started)return;
  const c=audioCtx();if(!c)return;
  if(AUD.mode===mode)return;
  const t=c.currentTime;AUD.mus.gain.cancelScheduledValues(t);AUD.mus.gain.setValueAtTime(AUD.mus.gain.value,t);AUD.mus.gain.linearRampToValueAtTime(0,t+.4);
  setTimeout(()=>{try{stopDrone();AUD.mode=mode;AUD.step=0;AUD.next=c.currentTime+.05;startDrone(mode==='game'?55:41.2);
    const t2=c.currentTime;AUD.mus.gain.setValueAtTime(0,t2);AUD.mus.gain.linearRampToValueAtTime(mode==='game'?.95:.9,t2+.6);
    if(!AUD.timer)AUD.timer=setInterval(musicTick,40);}catch(e){}},420);
}
function musicOff(){try{if(unmuteEl)unmuteEl.pause();}catch(e){}AUD.on=false;const c=AUD.c;if(c){AUD.mus.gain.cancelScheduledValues(c.currentTime);AUD.mus.gain.linearRampToValueAtTime(0,c.currentTime+.3);}setTimeout(()=>{stopDrone();clearInterval(AUD.timer);AUD.timer=null;AUD.mode=null;},350);updMusicBtn();}
function musicOn(){iosPlayback();AUD.on=true;AUD.started=true;const m=AUD.wanted||'app';AUD.mode=null;setMusic(m);updMusicBtn();}
function updMusicBtn(){document.querySelectorAll('[data-music]').forEach(b=>{b.textContent=AUD.on?'🎵':'🔇';b.setAttribute('aria-label',AUD.on?'Spegni la musica':'Accendi la musica');b.classList.toggle('off',!AUD.on);});}
/* l'audio parte solo dopo il primo tocco (regola dei browser) */
/* iPhone: l'audio web segue l'interruttore silenzioso. Un elemento <audio> muto in loop
   porta la sessione in modalità "riproduzione", come le app musicali. */
let unmuteEl=null;
function silentWav(){const sr=8000,n=sr/2,b=new ArrayBuffer(44+n*2),v=new DataView(b);const w=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
  w(0,'RIFF');v.setUint32(4,36+n*2,true);w(8,'WAVE');w(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,sr,true);v.setUint32(28,sr*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,n*2,true);
  return URL.createObjectURL(new Blob([b],{type:'audio/wav'}));}
function iosPlayback(){try{if(navigator.audioSession)navigator.audioSession.type='playback';}catch(e){}
  try{if(!unmuteEl){unmuteEl=document.createElement('audio');unmuteEl.src=silentWav();unmuteEl.loop=true;unmuteEl.setAttribute('playsinline','');unmuteEl.setAttribute('x-webkit-airplay','deny');unmuteEl.preload='auto';}
    const p=unmuteEl.play();if(p&&p.catch)p.catch(()=>{});}catch(e){}}
function unlockAudio(){iosPlayback();try{if(AUD.outEl&&AUD.outEl.paused){const p=AUD.outEl.play();if(p&&p.catch)p.catch(()=>{});}}catch(e){}try{if(!AUD.started&&AUD.on){AUD.started=true;audioCtx();setMusic(AUD.wanted||'app');}else if(AUD.c&&AUD.c.state==='suspended'){audioCtx();}}catch(e){}}
['pointerdown','touchend','click'].forEach(ev=>document.addEventListener(ev,unlockAudio,{passive:true}));
</script>
