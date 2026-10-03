/* Thabat MS: anatomical 3D neuron for the website (three.js r128, global THREE).
   An educational illustration, not to scale. It shows the parts named in the "Why tapping?" section:
   dendrites, cell body (soma), axon, myelin sheath, nodes of Ranvier and axon terminals.
   A signal (action potential) travels dendrites -> soma -> axon -> terminals and releases a burst at the synapse.
   Usage: const view = ThabatNeuron.mount(canvas, options); view.pulse(); view.setDamage(true); view.focus("myelin"); */
(function(){
"use strict";
const TAU=Math.PI*2;
function rng(seed){ let s=(seed>>>0)||1; return ()=>{ s=(s+0x6D2B79F5)>>>0; let t=s; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; }; }

/* ---------- shaders ---------- */
const WAVE=`
uniform float uTime; uniform vec4 uPulse; uniform vec4 uPS;
float wave1(float t0,float sp,float d){ if(t0<-50.) return 0.; float p=-1.08+(uTime-t0)*.55*sp; float x=d-p; return exp(-x*x*70.)*(1.-smoothstep(1.06,1.32,p)); }
float waveAt(float d){ return wave1(uPulse.x,uPS.x,d)+wave1(uPulse.y,uPS.y,d)+wave1(uPulse.z,uPS.z,d)+wave1(uPulse.w,uPS.w,d); }`;
const VS_BODY=`
attribute float aDist; attribute float aKind; attribute float aSeg;
varying vec3 vN; varying vec3 vV; varying float vDist; varying float vKind; varying float vSeg;
void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); vDist=aDist; vKind=aKind; vSeg=aSeg; gl_Position=projectionMatrix*mv; }`;
const FS_BODY=`
${WAVE}
uniform vec3 uDeep; uniform vec3 uRim; uniform vec3 uHot; uniform float uOpacity; uniform float uDamage; uniform float uFocus; uniform float uFocusAmt;
varying vec3 vN; varying vec3 vV; varying float vDist; varying float vKind; varying float vSeg;
float h1(float n){ return fract(sin(n*12.9898+4.1)*43758.5453); }
void main(){
  vec3 n=normalize(vN); if(!gl_FrontFacing) n=-n;
  float fres=pow(1.-clamp(abs(dot(n,normalize(vV))),0.,1.),2.1);
  float g=waveAt(vDist);
  float myel=step(1.5,vKind)*step(vKind,2.5);
  float dmg=myel*step(h1(vSeg),uDamage*.62)*smoothstep(0.,1.,uDamage);
  float axonSide=step(0.,vDist)*step(.5,vKind)*step(vKind,3.5);
  g*=mix(1.,.45,uDamage*axonSide*smoothstep(.05,.8,vDist));
  vec3 base=mix(uDeep,uRim,fres);
  base=mix(base,vec3(.62,.78,1.),myel*.2);
  base=mix(base,vec3(.42,.30,.26),dmg*.85);
  float soma=step(3.5,vKind);
  base+=uRim*.22*soma;
  float foc=uFocusAmt*(1.-step(.5,abs(vKind-uFocus)));
  vec3 col=base*(.5+fres*1.25)*(1.+foc*1.1)+uHot*g*1.8+uHot*dmg*fres*.35*(.6+.4*sin(uTime*2.+vSeg));
  float a=(.2+.8*fres)*uOpacity*(1.+foc*.7)+g*.55;
  a*=mix(1.,.16,dmg);
  gl_FragColor=vec4(col,clamp(a,0.,1.));
}`;
const VS_PTS=`
${WAVE}
attribute float aDist; attribute float aSeed; attribute float aSize; uniform float uPR;
varying float vG; varying float vT;
void main(){ float g=clamp(waveAt(aDist),0.,1.4); vG=g; float tw=.6+.4*sin(uTime*1.7+aSeed*6.283); vT=tw;
  vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv;
  gl_PointSize=(aSize*(.7+.3*tw)+g*aSize*2.4)*uPR*(10./-mv.z); }`;
const FS_PTS=`uniform vec3 uColor; uniform vec3 uHot; uniform float uOpacity; varying float vG; varying float vT;
void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,0.,d); vec3 c=mix(uColor,uHot,clamp(vG,0.,1.)); gl_FragColor=vec4(c*(.8+vG*1.4),a*(uOpacity*vT*.75+vG*.85)); }`;
const VS_BURST=`
attribute vec3 aDir; attribute float aSeed; uniform float uTime; uniform vec4 uBurst; uniform float uPR; varying float vA;
void main(){ float a=-1.; float t;
  t=uTime-uBurst.x; if(t>0.&&t<1.6) a=t;
  t=uTime-uBurst.y; if(t>0.&&t<1.6&&(a<0.||t<a)) a=t;
  t=uTime-uBurst.z; if(t>0.&&t<1.6&&(a<0.||t<a)) a=t;
  t=uTime-uBurst.w; if(t>0.&&t<1.6&&(a<0.||t<a)) a=t;
  vec3 p=position; float al=0.;
  if(a>0.){ p+=aDir*(a*(.28+.3*aSeed)); al=pow(1.-a/1.6,1.5); }
  vA=al; vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv;
  gl_PointSize=(2.5+aSeed*3.5)*uPR*(10./-mv.z)*step(.001,al); }`;
const FS_BURST=`uniform vec3 uHot; varying float vA; void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,0.,d)*vA; gl_FragColor=vec4(uHot*1.7,a); }`;

function glowTexture(THREE,inner,outer){
  const c=document.createElement("canvas"); c.width=c.height=128; const x=c.getContext("2d");
  const g=x.createRadialGradient(64,64,0,64,64,64); g.addColorStop(0,inner); g.addColorStop(.35,outer); g.addColorStop(1,"rgba(0,0,0,0)");
  x.fillStyle=g; x.fillRect(0,0,128,128); const t=new THREE.CanvasTexture(c); return t;
}

/* ---------- geometry ---------- */
function buildNeuron(opts){
  const THREE=window.THREE;
  const o=Object.assign({seed:11,opacity:1,radial:10,detail:1,dendrites:8,hot:"#FFA45C",deep:"#0B2A66",rim:"#5FA0FF",spark:"#8FC0FF"},opts||{});
  const rnd=rng(o.seed);
  const V=(x,y,z)=>new THREE.Vector3(x,y,z);
  const rdir=()=>{ const u=rnd()*2-1,t=rnd()*TAU,r=Math.sqrt(1-u*u); return V(r*Math.cos(t),r*Math.sin(t),u); };
  const pos=[],nor=[],dist=[],kind=[],seg=[],idx=[]; let vc=0;
  const K={DEND:0,AXON:1,MYEL:2,TERM:3,SOMA:4};

  function tube(pts,r0,r1,radial,d0,d1,k,s,capsule){
    const curve=new THREE.CatmullRomCurve3(pts,false,"centripetal");
    const len=curve.getLength(), N=Math.max(6,Math.ceil(len/0.045*o.detail));
    const fr=curve.computeFrenetFrames(N,false), base=vc;
    for(let i=0;i<=N;i++){
      const t=i/N, P=curve.getPointAt(t), n=fr.normals[i], b=fr.binormals[i];
      let r=r0+(r1-r0)*t;
      if(capsule) r=r0*Math.pow(Math.max(0,Math.sin(Math.PI*t)),.32);
      r*=1+.06*Math.sin(t*23+s);
      for(let j=0;j<=radial;j++){
        const a=j/radial*TAU, c=Math.cos(a), sn=Math.sin(a);
        const nx=c*n.x+sn*b.x, ny=c*n.y+sn*b.y, nz=c*n.z+sn*b.z;
        pos.push(P.x+nx*r,P.y+ny*r,P.z+nz*r); nor.push(nx,ny,nz); dist.push(d0+(d1-d0)*t); kind.push(k); seg.push(s);
      }
    }
    for(let i=0;i<N;i++) for(let j=0;j<radial;j++){ const a=base+i*(radial+1)+j, c=a+radial+1; idx.push(a,c,a+1,c,c+1,a+1); }
    vc+=(N+1)*(radial+1);
    return curve;
  }
  function blob(center,r,k,d,lat,lon,wob,stretch){
    const base=vc;
    for(let i=0;i<=lat;i++){ const th=i/lat*Math.PI;
      for(let j=0;j<=lon;j++){ const ph=j/lon*TAU;
        const nx=Math.sin(th)*Math.cos(ph), ny=Math.cos(th), nz=Math.sin(th)*Math.sin(ph);
        let rr=r*(1+wob*(Math.sin(nx*4.1+1.3)*Math.sin(ny*3.3)+.6*Math.sin(nz*5.2+ny*2.)));
        let px=nx*rr, py=ny*rr, pz=nz*rr;
        if(stretch){ const dd=Math.max(0,nx*stretch.x+ny*stretch.y+nz*stretch.z); const s2=1+dd*dd*.55; px*=s2; py*=s2; pz*=s2; }
        pos.push(center.x+px,center.y+py,center.z+pz); nor.push(nx,ny,nz); dist.push(d); kind.push(k); seg.push(0);
      }
    }
    for(let i=0;i<lat;i++) for(let j=0;j<lon;j++){ const a=base+i*(lon+1)+j, b=a+lon+1; idx.push(a,b,a+1,b,b+1,a+1); }
    vc+=(lat+1)*(lon+1);
  }
  const sample=(curve,ta,tb,n)=>Array.from({length:n},(_,i)=>curve.getPointAt(ta+(tb-ta)*i/(n-1)));

  /* axon direction: towards the lower right */
  const axonDir=V(1,-.36,.18).normalize();

  /* soma (cell body): slightly irregular, pulled towards the axon hillock */
  blob(V(0,0,0),.6,K.SOMA,0,26,36,.1,axonDir);
  /* nucleus inside the cell body, seen through the translucent membrane */
  const NUC=V(-.06,.05,.04); blob(NUC,.24,K.SOMA,0,14,22,.04,null);

  /* dendrites: tapered, bifurcating, with spines */
  const spines=[]; let maxDend=0; const dendMid=[];
  function dendrite(start,dir,len,r0,depth,d){
    const pts=[start.clone()]; let p=start.clone(); const dd=dir.clone().normalize();
    const steps=5+Math.floor(rnd()*3), st=len/steps;
    for(let i=0;i<steps;i++){ dd.add(rdir().multiplyScalar(.3)).normalize(); p=p.clone().addScaledVector(dd,st); pts.push(p); }
    const r1=Math.max(.014,r0*.52);
    const c=tube(pts,r0,r1,Math.max(6,o.radial-depth*2),d,d+len,K.DEND,depth);
    if(depth===1) dendMid.push(c.getPointAt(.5));
    const ns=Math.floor(len*28*(depth+1)*.6);
    for(let i=0;i<ns;i++){ const t=rnd(); const q=c.getPointAt(t); const rr=(r0+(r1-r0)*t)*1.25+.03*rnd(); spines.push(q.add(rdir().multiplyScalar(rr)),d+len*t,.9+rnd()*1.6); }
    maxDend=Math.max(maxDend,d+len);
    if(depth<3){ const kids=depth===0?2:(rnd()<.72?2:1);
      for(let k=0;k<kids;k++){ const nd=dd.clone().add(rdir().multiplyScalar(.95)).normalize(); dendrite(p,nd,len*(.6+rnd()*.22),r1*.96,depth+1,d+len); } }
  }
  for(let i=0;i<o.dendrites;i++){
    let d=rdir(); if(d.dot(axonDir)>-.05) d.addScaledVector(axonDir,-1.4).normalize();
    dendrite(d.clone().multiplyScalar(.52),d,1.05+rnd()*.65,.12+rnd()*.03,0,0);
  }

  /* axon: hillock, core, myelin sheaths with nodes of Ranvier, then terminals with boutons */
  const L=6.4, axPts=[]; let p=axonDir.clone().multiplyScalar(.5); axPts.push(p.clone()); const ad=axonDir.clone();
  for(let i=1;i<=16;i++){ ad.add(V(0,Math.sin(i*.8)*.05,Math.cos(i*.55)*.05)).normalize(); p=p.clone().addScaledVector(ad,L/16); axPts.push(p); }
  const ax=new THREE.CatmullRomCurve3(axPts,false,"centripetal"); const axLen=ax.getLength();
  tube(sample(ax,0,.07,6),.3,.075,o.radial,0,.07*axLen,K.AXON,0);
  tube(sample(ax,.05,1,40),.07,.052,Math.max(6,o.radial-2),.05*axLen,axLen,K.AXON,0);
  const nodes=[]; let sIdx=1, t=.1; const segT=.082, gap=.013;
  while(t+segT<.9){ tube(sample(ax,t,t+segT,8),.165,.165,o.radial,t*axLen,(t+segT)*axLen,K.MYEL,sIdx++,true); nodes.push(ax.getPointAt(t+segT+gap/2)); t+=segT+gap; }
  const E=ax.getPointAt(1), Et=ax.getTangentAt(1); const boutons=[]; let maxAx=axLen;
  for(let i=0;i<7;i++){
    const pts=[E.clone()]; let q=E.clone(); const dd=Et.clone().add(rdir().multiplyScalar(.9)).normalize(); const len=.7+rnd()*.5, n=5;
    for(let k=0;k<n;k++){ dd.add(rdir().multiplyScalar(.35)).normalize(); q=q.clone().addScaledVector(dd,len/n); pts.push(q); }
    tube(pts,.045,.022,7,axLen,axLen+len,K.TERM,0);
    blob(q,.075,K.TERM,axLen+len,8,12,.05,null); boutons.push({p:q.clone(),d:dd.clone(),dist:axLen+len});
    maxAx=Math.max(maxAx,axLen+len);
  }

  /* normalise distances: dendrite tips = -1, soma = 0, terminals = +1 */
  for(let i=0;i<dist.length;i++){ const k=kind[i]; dist[i]=k===K.DEND?-dist[i]/maxDend:(k===K.SOMA?0:dist[i]/maxAx); }

  const geo=new THREE.BufferGeometry();
  geo.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));
  geo.setAttribute("normal",new THREE.Float32BufferAttribute(nor,3));
  geo.setAttribute("aDist",new THREE.Float32BufferAttribute(dist,1));
  geo.setAttribute("aKind",new THREE.Float32BufferAttribute(kind,1));
  geo.setAttribute("aSeg",new THREE.Float32BufferAttribute(seg,1));
  geo.setIndex(idx);

  const U={uTime:{value:0},uPulse:{value:new THREE.Vector4(-99,-99,-99,-99)},uPS:{value:new THREE.Vector4(1,1,1,1)},uBurst:{value:new THREE.Vector4(-99,-99,-99,-99)},
    uDeep:{value:new THREE.Color(o.deep)},uRim:{value:new THREE.Color(o.rim)},uHot:{value:new THREE.Color(o.hot)},uColor:{value:new THREE.Color(o.spark)},
    uOpacity:{value:o.opacity},uDamage:{value:0},uFocus:{value:-1},uFocusAmt:{value:0},uPR:{value:Math.min(window.devicePixelRatio||1,1.75)}};
  const common={uniforms:U,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending};
  const group=new THREE.Group();
  const body=new THREE.Mesh(geo,new THREE.ShaderMaterial(Object.assign({vertexShader:VS_BODY,fragmentShader:FS_BODY,side:THREE.DoubleSide},common)));
  group.add(body);

  /* spines + travelling sparks along the axon */
  const sp=[],sd=[],ss=[],sz=[];
  for(let i=0;i<spines.length;i+=3){ const v=spines[i]; sp.push(v.x,v.y,v.z); sd.push(-spines[i+1]/maxDend); ss.push(rnd()); sz.push(spines[i+2]); }
  for(let i=0;i<180;i++){ const tt=.04+rnd()*.95; const q=ax.getPointAt(tt).add(rdir().multiplyScalar(.04+rnd()*.1)); sp.push(q.x,q.y,q.z); sd.push(tt*axLen/maxAx); ss.push(rnd()); sz.push(1.2+rnd()*1.8); }
  const pg=new THREE.BufferGeometry(); pg.setAttribute("position",new THREE.Float32BufferAttribute(sp,3)); pg.setAttribute("aDist",new THREE.Float32BufferAttribute(sd,1)); pg.setAttribute("aSeed",new THREE.Float32BufferAttribute(ss,1)); pg.setAttribute("aSize",new THREE.Float32BufferAttribute(sz,1));
  group.add(new THREE.Points(pg,new THREE.ShaderMaterial(Object.assign({vertexShader:VS_PTS,fragmentShader:FS_PTS},common))));

  /* synaptic burst at the boutons */
  const bp=[],bd=[],bs=[];
  boutons.forEach(b=>{ for(let i=0;i<26;i++){ const dir=b.d.clone().multiplyScalar(.8).add(rdir()).normalize(); bp.push(b.p.x,b.p.y,b.p.z); bd.push(dir.x,dir.y,dir.z); bs.push(rnd()); } });
  const bg=new THREE.BufferGeometry(); bg.setAttribute("position",new THREE.Float32BufferAttribute(bp,3)); bg.setAttribute("aDir",new THREE.Float32BufferAttribute(bd,3)); bg.setAttribute("aSeed",new THREE.Float32BufferAttribute(bs,1));
  const burst=new THREE.Points(bg,new THREE.ShaderMaterial(Object.assign({vertexShader:VS_BURST,fragmentShader:FS_BURST},common))); burst.frustumCulled=false; group.add(burst);

  /* glow: soma halo + nucleus */
  const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture(THREE,"rgba(140,190,255,.85)","rgba(60,130,240,.28)"),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:.75*o.opacity}));
  halo.scale.set(3.1,3.1,1); group.add(halo);
  const nuc=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture(THREE,"rgba(255,235,210,.95)","rgba(255,170,90,.25)"),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:.55*o.opacity}));
  nuc.scale.set(.42,.42,1); nuc.position.set(-.06,.05,.04); group.add(nuc);

  let slot=0;
  const api={group,U,halo,nuc,
    parts:{dendrites:dendMid[0]||V(-1,.6,0),soma:V(0,0,0),axon:ax.getPointAt(.935),myelin:ax.getPointAt(.32),node:nodes[3]||ax.getPointAt(.45),terminals:E.clone().addScaledVector(Et,.45)},
    kinds:{dendrites:0,soma:4,axon:1,myelin:2,node:1,terminals:3},
    focusPoint:V(0,0,0).lerp(ax.getPointAt(.28),.45),
    /* fire an action potential; returns the time it reaches the terminals */
    pulse(now,speed){ const s=speed||1; const i=slot++%4; U.uPulse.value.setComponent(i,now); U.uPS.value.setComponent(i,s); const arrive=now+2.12/(.55*s); U.uBurst.value.setComponent(i,arrive-.05); return arrive; }
  };
  return api;
}

/* ---------- viewer ---------- */
function mount(canvas,opt){
  const THREE=window.THREE; if(!THREE||!canvas) return null;
  opt=Object.assign({seed:11,autoPulse:2.8,network:false,autoRotate:.06,parallax:true,dist:11,fov:34,layout:null,labels:null,onPulse:null,onSpeed:null,tilt:{x:-.22,y:-.35}},opt||{});
  let renderer;
  try{ renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:"high-performance"}); }catch(e){ return null; }
  renderer.setClearColor(0x000000,0);
  const RM=matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scene=new THREE.Scene(), cam=new THREE.PerspectiveCamera(opt.fov,1,.1,200);
  const root=new THREE.Group(); scene.add(root);
  const main=buildNeuron({seed:opt.seed,radial:opt.radial||10});
  main.group.position.copy(main.focusPoint).multiplyScalar(-1);
  root.add(main.group);
  const neighbours=[];
  if(opt.network){
    const a=buildNeuron({seed:opt.seed+17,opacity:.42,radial:7,dendrites:7,deep:"#08214F"}); a.group.scale.setScalar(.72); a.group.rotation.set(.4,2.6,.3);
    const tip=main.parts.terminals.clone().add(main.group.position); a.group.position.copy(tip).add(new THREE.Vector3(2.4,-1.4,-1.2)); root.add(a.group); neighbours.push(a);
    const b=buildNeuron({seed:opt.seed+41,opacity:.3,radial:6,dendrites:6,deep:"#071C44"}); b.group.scale.setScalar(.6); b.group.rotation.set(-.3,.9,-.5); b.group.position.set(6.5,5.2,-9); root.add(b.group); neighbours.push(b);
  }
  /* dust */
  const rnd=rng(opt.seed*7+3), dp=[],dd=[],ds=[],dz=[];
  for(let i=0;i<900;i++){ dp.push((rnd()-.5)*30,(rnd()-.5)*18,(rnd()-.5)*16-3); dd.push(9); ds.push(rnd()); dz.push(.6+rnd()*1.4); }
  const dg=new THREE.BufferGeometry(); dg.setAttribute("position",new THREE.Float32BufferAttribute(dp,3)); dg.setAttribute("aDist",new THREE.Float32BufferAttribute(dd,1)); dg.setAttribute("aSeed",new THREE.Float32BufferAttribute(ds,1)); dg.setAttribute("aSize",new THREE.Float32BufferAttribute(dz,1));
  const dustU=Object.assign({},main.U,{uOpacity:{value:.38},uColor:{value:new THREE.Color("#6EA8FF")}});
  const dust=new THREE.Points(dg,new THREE.ShaderMaterial({uniforms:dustU,vertexShader:VS_PTS,fragmentShader:FS_PTS,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
  scene.add(dust);

  /* state */
  let t=0,last=0,running=false,visible=true,auto=0;
  let yaw=0,pitch=0,vy=0,vp=0,mx=0,my=0,tmx=0,tmy=0;
  let damage=0,damageTarget=0,dist=opt.dist,distTarget=opt.dist,focusKey=null,focusAmt=0;
  const look=new THREE.Vector3(), lookTarget=new THREE.Vector3(), offset=new THREE.Vector3();
  const speedNow=()=>1-.58*damageTarget;
  const pending=[];
  function pulse(){ const s=speedNow(); const arrive=main.pulse(t,s); if(neighbours[0]) pending.push({at:arrive+.12,n:neighbours[0],s}); if(opt.onPulse) opt.onPulse(s); kick(); }
  function layout(){
    const w=canvas.clientWidth||1,h=canvas.clientHeight||1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75)); renderer.setSize(w,h,false);
    cam.aspect=w/h; cam.updateProjectionMatrix();
    if(opt.layout){ const r=opt.layout(w,h)||{}; offset.set(r.x||0,r.y||0,0); if(r.dist){ distTarget=dist=r.dist; } }
    if(neighbours[1]) neighbours[1].group.position.x=(offset.x<0?-1:1)*6.5;   /* keep the far neuron on the open side (mirrors for Arabic) */
    kick();
  }
  const ro=new ResizeObserver(layout); ro.observe(canvas);

  /* pointer: drag to rotate, tap to fire */
  let dragging=false,lx=0,ly=0,moved=0,downAt=0;
  canvas.addEventListener("pointerdown",e=>{ dragging=true; moved=0; lx=e.clientX; ly=e.clientY; downAt=performance.now(); try{canvas.setPointerCapture(e.pointerId);}catch(_){} });
  canvas.addEventListener("pointermove",e=>{ if(!dragging) return; const dx=e.clientX-lx, dy=e.clientY-ly; lx=e.clientX; ly=e.clientY; moved+=Math.abs(dx)+Math.abs(dy); vy=dx*.006; vp=dy*.004; yaw+=vy; pitch=Math.max(-.9,Math.min(.9,pitch+vp)); kick(); });
  const up=e=>{ if(!dragging) return; dragging=false; if(moved<7&&performance.now()-downAt<450){ pulse(); if(opt.onTap) opt.onTap(e); } };
  canvas.addEventListener("pointerup",up); canvas.addEventListener("pointercancel",()=>{dragging=false;});
  if(opt.parallax){ (opt.parallaxEl||canvas).addEventListener("pointermove",e=>{ const r=canvas.getBoundingClientRect(); tmx=(e.clientX-r.left)/r.width-.5; tmy=(e.clientY-r.top)/r.height-.5; },{passive:true}); }

  const tmpV=new THREE.Vector3();
  function partWorld(key,out){ out.copy(main.parts[key]); main.group.localToWorld(out); return out; }
  function frame(dt){
    t+=dt; main.U.uTime.value=t; neighbours.forEach(n=>n.U.uTime.value=t);
    if(!RM&&opt.autoPulse){ auto+=dt; if(auto>opt.autoPulse){ auto=0; pulse(); } }
    for(let i=pending.length-1;i>=0;i--){ if(t>=pending[i].at){ pending[i].n.pulse(t,pending[i].s); pending.splice(i,1); } }
    damage+=(damageTarget-damage)*Math.min(1,dt*2.2); main.U.uDamage.value=damage;
    focusAmt+=((focusKey?1:0)-focusAmt)*Math.min(1,dt*3); main.U.uFocusAmt.value=focusAmt;
    if(!dragging){ yaw+=vy; pitch=Math.max(-.9,Math.min(.9,pitch+vp)); vy*=.94; vp*=.9; if(!RM&&!focusKey) yaw+=opt.autoRotate*dt; }
    mx+=(tmx-mx)*.05; my+=(tmy-my)*.05;
    root.rotation.set(opt.tilt.x+pitch+my*.25,opt.tilt.y+yaw+mx*.45,opt.tilt.z||0);
    root.position.copy(offset);
    root.updateMatrixWorld(true);
    if(focusKey){ partWorld(focusKey,lookTarget); } else lookTarget.set(offset.x*.0,0,0);
    look.lerp(lookTarget,Math.min(1,dt*3.2)); dist+=(distTarget-dist)*Math.min(1,dt*3);
    cam.position.set(look.x,look.y+dist*.04,look.z+dist); cam.lookAt(look);
    dust.rotation.y=t*.008;
    renderer.render(scene,cam);
    if(opt.labels){ const w=canvas.clientWidth,h=canvas.clientHeight; const out=[];
      for(const k in main.parts){ partWorld(k,tmpV); const z=tmpV.clone().project(cam); out.push({key:k,x:(z.x*.5+.5)*w,y:(-z.y*.5+.5)*h,visible:z.z<1&&Math.abs(z.x)<1.05&&Math.abs(z.y)<1.05}); }
      opt.labels(out); }
  }
  function loop(now){
    if(!visible||document.hidden){ running=false; return; }
    const dt=Math.min(.05,(now-last)/1000||0); last=now; frame(dt);
    if(RM&&!dragging&&Math.abs(vy)<1e-4&&Math.abs(damage-damageTarget)<.01&&Math.abs(dist-distTarget)<.01&&look.distanceTo(lookTarget)<.01){ running=false; return; }
    requestAnimationFrame(loop);
  }
  function kick(){ if(!running&&visible&&!document.hidden){ running=true; last=performance.now(); requestAnimationFrame(loop); } }
  new IntersectionObserver(es=>{ visible=es[0].isIntersecting; if(visible) kick(); },{rootMargin:"120px"}).observe(canvas);
  document.addEventListener("visibilitychange",()=>{ if(!document.hidden) kick(); });
  layout();
  if(RM){ t=1.4; main.U.uPulse.value.x=0; main.U.uPS.value.x=1; }
  else pulse();
  kick();

  return {
    pulse,
    setDamage(on,instant){ damageTarget=on?1:0; if(instant){ damage=damageTarget; main.U.uDamage.value=damage; } if(opt.onSpeed) opt.onSpeed(speedNow()); kick(); },
    focus(key){ focusKey=key&&main.parts[key]?key:null; main.U.uFocus.value=focusKey?main.kinds[focusKey]:-1; distTarget=focusKey?opt.dist*.42:opt.dist; vy=vp=0; kick(); },
    reset(){ focusKey=null; main.U.uFocus.value=-1; yaw=0; pitch=0; vy=vp=0; distTarget=opt.dist; kick(); },
    zoom(f){ distTarget=Math.max(opt.dist*.3,Math.min(opt.dist*1.6,distTarget*f)); kick(); },
    nudge(dyaw,dpitch){ vy=dyaw; vp=dpitch||0; kick(); },
    relayout:layout,
    get speed(){ return speedNow(); }
  };
}

window.ThabatNeuron={mount,buildNeuron};
})();
