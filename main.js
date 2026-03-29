// ═══════════════════════════════════════════════════════════════
// MAIN.JS — Scene orchestrator, camera, animation, UI
// ═══════════════════════════════════════════════════════════════
'use strict';

// ── PROGRESS REPORTER ────────────────────────────────────────
const BAR = document.getElementById('loader-bar');
const STATUS = document.getElementById('loader-status');
function progress(pct, msg){
  BAR.style.width = pct+'%';
  if(msg) STATUS.textContent = msg;
}

// ── RENDERER ─────────────────────────────────────────────────
progress(5, 'Renderer...');
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  logarithmicDepthBuffer: true,
  powerPreference: 'high-performance'
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.insertBefore(renderer.domElement, document.getElementById('hud'));

const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, window.innerWidth/window.innerHeight, 0.001, 9e10);
camera.position.set(0, 80, 220);

window.addEventListener('resize',()=>{
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
});

// ── CAMERA CONTROLLER ────────────────────────────────────────
let theta=0.4, phi=1.15, radius=220, radiusGoal=220;
let camTarget=new THREE.Vector3(), camGoal=new THREE.Vector3();
let panOff=new THREE.Vector3(), panGoal=new THREE.Vector3();
let isDrag=false, lx=0, ly=0, shiftHeld=false;

document.addEventListener('keydown', e=>{ if(e.key==='Shift') shiftHeld=true; });
document.addEventListener('keyup',   e=>{ if(e.key==='Shift') shiftHeld=false; });

renderer.domElement.addEventListener('mousedown', e=>{ isDrag=true; lx=e.clientX; ly=e.clientY; });
document.addEventListener('mouseup', ()=>isDrag=false);
document.addEventListener('mousemove', e=>{
  if(!isDrag) return;
  const dx=e.clientX-lx, dy=e.clientY-ly; lx=e.clientX; ly=e.clientY;
  if(shiftHeld){
    const r2=new THREE.Vector3().crossVectors(
      new THREE.Vector3(Math.sin(theta)*Math.sin(phi),Math.cos(phi),Math.cos(theta)*Math.sin(phi)),
      new THREE.Vector3(0,1,0)).normalize();
    panGoal.addScaledVector(r2,-dx*radius*0.001);
    panGoal.addScaledVector(new THREE.Vector3(0,1,0),dy*radius*0.001);
  } else {
    theta -= dx*0.005;
    phi = Math.max(0.04, Math.min(Math.PI-0.04, phi-dy*0.005));
  }
});

renderer.domElement.addEventListener('wheel', e=>{
  e.preventDefault();
  const factor = e.deltaY>0 ? 1.12 : 0.89;
  radiusGoal = Math.max(1.5, Math.min(5e7, radiusGoal*factor));
  AUDIO.resume(); AUDIO.playZoom(e.deltaY>0?-1:1);
},{passive:false});

// Touch
let lastTouchDist=0, touchCount=0, lastTap=0;
renderer.domElement.addEventListener('touchstart', e=>{
  touchCount = e.touches.length;
  if(touchCount===1){ isDrag=true; lx=e.touches[0].clientX; ly=e.touches[0].clientY; }
  if(touchCount===2){
    lastTouchDist = Math.hypot(
      e.touches[0].clientX-e.touches[1].clientX,
      e.touches[0].clientY-e.touches[1].clientY);
  }
  // Double-tap = zoom to point
  const now=Date.now();
  if(now-lastTap<300) handleDoubleTap(e.touches[0].clientX, e.touches[0].clientY);
  lastTap=now;
},{passive:true});

renderer.domElement.addEventListener('touchmove', e=>{
  if(touchCount===1&&isDrag){
    const dx=e.touches[0].clientX-lx, dy=e.touches[0].clientY-ly;
    lx=e.touches[0].clientX; ly=e.touches[0].clientY;
    theta-=dx*0.005; phi=Math.max(0.04,Math.min(Math.PI-0.04,phi-dy*0.005));
  }
  if(touchCount===2){
    const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
    radiusGoal=Math.max(1.5,Math.min(5e7,radiusGoal*(lastTouchDist/d)));
    lastTouchDist=d;
    AUDIO.resume();
  }
},{passive:true});

renderer.domElement.addEventListener('touchend',()=>{isDrag=false;touchCount=0;});

function applyCamera(){
  radius += (radiusGoal-radius)*0.10;
  camTarget.lerp(camGoal,0.10);
  panOff.lerp(panGoal,0.08);
  const tx=camTarget.x+panOff.x, ty=camTarget.y+panOff.y, tz=camTarget.z+panOff.z;
  camera.position.set(
    tx+radius*Math.sin(theta)*Math.sin(phi),
    ty+radius*Math.cos(phi),
    tz+radius*Math.cos(theta)*Math.sin(phi));
  camera.lookAt(tx,ty,tz);
  // Dynamic near/far
  const near = radius>50000 ? radius*0.0005 : 0.001;
  const far  = radius>50000 ? radius*2500   : 9e10;
  if(Math.abs(camera.near-near)>near*0.1){camera.near=near;camera.far=far;camera.updateProjectionMatrix();}
}

// ── LIGHTING ─────────────────────────────────────────────────
progress(8, 'Éclairage...');
const sunLight = new THREE.PointLight(0xfff5e0, 5, 8000, 1.4);
scene.add(sunLight);
scene.add(new THREE.AmbientLight(0x0d1428, 0.6));

// ── STAR CATALOG ─────────────────────────────────────────────
progress(10, 'Catalogue d\'étoiles (HD catalog)...');
const { geo: starGeo, stars: starList } = STARDATA.buildStarGeometry();
const starField = new THREE.Points(starGeo, SHADERS.makeStarPointsMaterial());
scene.add(starField);

// ── SUN ──────────────────────────────────────────────────────
progress(18, 'Soleil...');
const sunMat  = SHADERS.makeSunMaterial();
const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(7,64,64), sunMat);
scene.add(sunMesh);

const coronaMat = SHADERS.makeCoronaMaterial();
const coronaMesh = new THREE.Mesh(new THREE.SphereGeometry(15,32,32), coronaMat);
scene.add(coronaMesh);

// Second corona layer
const corona2 = new THREE.Mesh(new THREE.SphereGeometry(24,24,24),
  new THREE.MeshBasicMaterial({color:0xff4400,transparent:true,opacity:0.035,side:THREE.BackSide}));
scene.add(corona2);

// ── SCALE & LOG HELPERS ───────────────────────────────────────
function logD(au){ return 8+Math.log(1+au*2.5)/Math.log(1.9)*18; }
function pR(km){ return Math.max(0.5, Math.log(km/500+1)*0.7); }
function mkOrbit(r,col=0xff4444,op=0.6,seg=128){
  const pts=[]; for(let i=0;i<=seg;i++){const a=(i/seg)*Math.PI*2;pts.push(new THREE.Vector3(Math.cos(a)*r,0,Math.sin(a)*r));}
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:col,transparent:true,opacity:op}));
}
function mkAtmos(r,col,op=0.07,falloff=3.5){
  const atm = SHADERS.makeAtmosMaterial(col, new THREE.Vector3(1,0,0), op*14, falloff);
  return new THREE.Mesh(new THREE.SphereGeometry(r,32,32), atm);
}
function mkLabel(txt,col='rgba(160,200,255,.9)',sz=22){
  const c=document.createElement('canvas'); c.width=512; c.height=64;
  const x=c.getContext('2d'); x.font=`${sz}px monospace`; x.fillStyle=col; x.textAlign='center'; x.fillText(txt,256,42);
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true}));
  s.scale.set(8,2,1); return s;
}

// ── BUILD PLANETS ─────────────────────────────────────────────
progress(25, 'Planètes...');
const PM = {};
const orbitLines = [];
const allShaderMats = [sunMat, coronaMat]; // for uniform updates

for(const pd of PLANETS_DATA){
  const dist=logD(pd.au), r=pR(pd.km);
  const pivot=new THREE.Object3D(); scene.add(pivot);

  // Orbit line
  const orb=mkOrbit(dist); scene.add(orb); orbitLines.push(orb);

  // Tilt node (holds planet and rings at correct axial inclination)
  const tiltNode=new THREE.Object3D();
  tiltNode.position.x=dist;
  tiltNode.rotation.z=(pd.tilt||0)*Math.PI/180;
  pivot.add(tiltNode);

  // Planet mesh with procedural texture
  const tex=TEXTURES.get(pd.id);
  const mat=new THREE.MeshStandardMaterial({
    map:tex, roughness:0.78, metalness:0.02,
    emissive:new THREE.Color(pd.emis||'#000'),
    emissiveIntensity:0.03
  });
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(r,72,72), mat);
  tiltNode.add(mesh);

  // Atmosphere (shader-based Rayleigh)
  if(pd.atmos){
    const am=mkAtmos(r*1.12, pd.atmos, pd.atmosIntensity||1.0, pd.atmosFalloff||3.5);
    tiltNode.add(am);
    allShaderMats.push(am.material);
  }

  // Cloud layer (Earth)
  let cloudMesh=null;
  if(pd.clouds){
    const cTex=TEXTURES.get('earthClouds');
    cloudMesh=new THREE.Mesh(
      new THREE.SphereGeometry(r*1.009,56,56),
      new THREE.MeshStandardMaterial({map:cTex,transparent:true,opacity:0.88,depthWrite:false,roughness:1}));
    tiltNode.add(cloudMesh);
  }

  // Saturn rings with real texture
  if(pd.rings){
    const rTex = pd.id==='saturn' ? TEXTURES.get('saturnRings') : null;
    const inn=r*1.22, out=r*2.5;
    const rGeo=new THREE.RingGeometry(inn,out,120,8);
    const rPos=rGeo.attributes.position, rUv=rGeo.attributes.uv;
    for(let i=0;i<rPos.count;i++){
      const v=new THREE.Vector3().fromBufferAttribute(rPos,i);
      rUv.setXY(i,(v.length()-inn)/(out-inn),0);
    }
    const rMat=new THREE.MeshBasicMaterial({
      map:rTex||null,
      color:pd.thinRings?0x889aaa:0xddc880,
      transparent:true, opacity:pd.thinRings?0.20:0.62,
      side:THREE.DoubleSide
    });
    const ringMesh=new THREE.Mesh(rGeo,rMat);
    ringMesh.rotation.x=Math.PI/2;
    tiltNode.add(ringMesh);
  }

  // Moons
  const moonPivots=[];
  for(const m of pd.moons_list){
    const mD=r*2.5+m.dist*2.5, mR=Math.max(0.12,pR(m.km)*0.6);
    const mTex = m.name==='Lune' ? TEXTURES.get('moon') : null;
    const mMat = new THREE.MeshStandardMaterial({color:new THREE.Color(m.color||'#aaa'),roughness:0.85, map:mTex||undefined});
    const mMesh=new THREE.Mesh(new THREE.SphereGeometry(mR,20,20),mMat);
    mMesh.position.x=mD;

    const mPts=[]; for(let i=0;i<=80;i++){const a=(i/80)*Math.PI*2;mPts.push(new THREE.Vector3(Math.cos(a)*mD,0,Math.sin(a)*mD));}
    const mOrb=new THREE.Line(new THREE.BufferGeometry().setFromPoints(mPts),new THREE.LineBasicMaterial({color:0xff8888,transparent:true,opacity:0.32}));
    mOrb.position.x=dist; pivot.add(mOrb); orbitLines.push(mOrb);

    const mPiv=new THREE.Object3D(); mPiv.position.x=dist; pivot.add(mPiv);
    mPiv.add(mMesh);
    moonPivots.push({piv:mPiv,mesh:mMesh,data:m,dist:mD});
  }

  // Label
  const lbl=mkLabel(pd.name); lbl.position.set(dist,r+2.8,0); pivot.add(lbl);
  PM[pd.id]={pivot,mesh,tiltNode,data:pd,moonPivots,dist,r,cloudMesh,lbl};
}

// ── BELTS ─────────────────────────────────────────────────────
progress(38, 'Ceintures...');
function beltRing(inAU,outAU,N,col,op,sp=1.5){
  const geo=new THREE.BufferGeometry(),pos=new Float32Array(N*3);
  for(let i=0;i<N;i++){const r=logD(inAU+Math.random()*(outAU-inAU))+(Math.random()-0.5)*1.5,a=Math.random()*Math.PI*2;pos[i*3]=Math.cos(a)*r;pos[i*3+1]=(Math.random()-0.5)*sp;pos[i*3+2]=Math.sin(a)*r;}
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  scene.add(new THREE.Points(geo,new THREE.PointsMaterial({color:new THREE.Color(col),size:0.3,transparent:true,opacity:op,sizeAttenuation:true})));
}
beltRing(2.2,3.5,4000,'#c8b89a',0.58);
beltRing(30,55,6000,'#88aacc',0.62,6);
{const l=mkLabel('Ceinture de Kuiper','rgba(136,170,204,.55)',16);l.scale.set(20,3,1);l.position.set(logD(42)*0.72,4,-logD(42)*0.72);scene.add(l);}

// ── OORT CLOUD ────────────────────────────────────────────────
progress(42, 'Nuage de Oort...');
function oortLayer(N,rMin,rMax,flatY,col,size,op){
  const geo=new THREE.BufferGeometry(),pos=new Float32Array(N*3),cols=new Float32Array(N*3);
  for(let i=0;i<N;i++){
    const r=rMin+Math.random()*(rMax-rMin),th=Math.random()*Math.PI*2,ph=Math.acos(2*Math.random()-1);
    pos[i*3]=r*Math.sin(ph)*Math.cos(th); pos[i*3+1]=r*Math.sin(ph)*Math.sin(th)*flatY; pos[i*3+2]=r*Math.cos(ph);
    const icy=Math.random()>0.35;
    if(icy){cols[i*3]=0.55+Math.random()*0.4;cols[i*3+1]=0.72+Math.random()*0.28;cols[i*3+2]=1;}
    else{cols[i*3]=0.9;cols[i*3+1]=0.55+Math.random()*0.25;cols[i*3+2]=0.25+Math.random()*0.2;}
  }
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  geo.setAttribute('color',   new THREE.BufferAttribute(cols,3));
  scene.add(new THREE.Points(geo,new THREE.PointsMaterial({size,vertexColors:true,transparent:true,opacity:op,sizeAttenuation:true})));
}
oortLayer(14000,555,650,0.32,null,1.05,0.85);
oortLayer(18000,660,900,1.0,null,0.80,0.52);
for(let s=0;s<4;s++) scene.add(new THREE.Mesh(new THREE.SphereGeometry(585+s*55,16,16),new THREE.MeshBasicMaterial({color:new THREE.Color(0.04,0.06,0.18),transparent:true,opacity:0.022,side:THREE.BackSide,depthWrite:false})));
{const l=mkLabel('Nuage de Oort  ·  ~1 milliard de comètes','rgba(130,165,255,.5)',16);l.scale.set(65,7,1);l.position.set(0,840,0);scene.add(l);}

// Light-day ring
{
  const ldR=540; const dashes=[];
  for(let i=0;i<=240;i++){
    const a=(i/240)*Math.PI*2;
    if(Math.floor(i/4)%2===0) dashes.push(new THREE.Vector3(Math.cos(a)*ldR,0,Math.sin(a)*ldR));
    else if(dashes.length>1){scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([...dashes]),new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:0.18})));dashes.length=0;}
  }
  const l=mkLabel('1 jour-lumière — 173 UA','rgba(255,255,255,.32)',15);l.scale.set(36,5,1);l.position.set(ldR*0.72,5,-ldR*0.72);scene.add(l);
}

// ── COMETS ────────────────────────────────────────────────────
progress(48, 'Comètes...');
const cTailTex=TEXTURES.make(32,128,(ctx,W,H)=>{const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'rgba(220,240,255,0)');g.addColorStop(0.1,'rgba(200,225,255,.88)');g.addColorStop(0.55,'rgba(150,200,255,.32)');g.addColorStop(1,'rgba(100,170,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);});
const COMETS=[];
for(let i=0;i<24;i++){
  const pR2=logD(0.2+Math.random()*12),aR=460+Math.random()*340,a=(pR2+aR)/2,e=(aR-pR2)/(aR+pR2);
  const cm=new THREE.Mesh(new THREE.SphereGeometry(0.22+Math.random()*0.20,8,8),new THREE.MeshStandardMaterial({color:0xcce8ff,emissive:0x3366aa,emissiveIntensity:1.3}));
  scene.add(cm);
  const coma=new THREE.Mesh(new THREE.SphereGeometry(1.6,8,8),new THREE.MeshBasicMaterial({color:0x88ccff,transparent:true,opacity:0.1,side:THREE.BackSide,depthWrite:false}));
  scene.add(coma);
  const dL=10+Math.random()*16;
  const dust=new THREE.Sprite(new THREE.SpriteMaterial({map:cTailTex,transparent:true,opacity:0.78,color:new THREE.Color(0.95,0.95,0.85)}));
  dust.scale.set(2.5,dL,1); scene.add(dust);
  const ion=new THREE.Sprite(new THREE.SpriteMaterial({map:cTailTex,transparent:true,opacity:0.58,color:new THREE.Color(0.4,0.65,1)}));
  ion.scale.set(0.8,dL*1.35,1); scene.add(ion);
  COMETS.push({a,e,inc:(Math.random()-0.5)*Math.PI,om:Math.random()*Math.PI*2,node:Math.random()*Math.PI*2,phase:Math.random()*Math.PI*2,spd:0.00018+Math.random()*0.00065,periR:pR2,mesh:cm,coma,dust,ion});
}

// ── ISS ───────────────────────────────────────────────────────
progress(52, 'Orbiteurs...');
const earthR=pR(6371), earthDist=logD(1);
const issR=earthR*2.5+0.55;
const issPO=new THREE.Object3D(); scene.add(issPO);
const issPI=new THREE.Object3D(); issPO.add(issPI);
const issMesh=new THREE.Mesh(new THREE.OctahedronGeometry(0.18,0),new THREE.MeshStandardMaterial({color:0xddeeff,emissive:0x445566,emissiveIntensity:0.5,roughness:0.3,metalness:0.8}));
issMesh.position.x=issR; issPI.add(issMesh);
{const o=mkOrbit(issR,0x00ffcc,0.58);issPO.add(o);orbitLines.push(o);}
{const l=mkLabel('ISS','rgba(0,255,200,.88)',15);l.scale.set(2.2,0.8,1);l.position.set(issR,0.4,0);issPI.add(l);}

// ── HUBBLE ────────────────────────────────────────────────────
const hubR=earthR*2.5+0.42;
const hubPO=new THREE.Object3D(); scene.add(hubPO);
const hubPI=new THREE.Object3D(); hubPO.add(hubPI);
const hubMesh=new THREE.Group();
const hubMat2=new THREE.MeshStandardMaterial({color:0xccddff,emissive:0x223355,emissiveIntensity:0.6,roughness:0.4,metalness:0.7});
hubMesh.add(new THREE.Mesh(new THREE.BoxGeometry(0.35,0.06,0.06),hubMat2));
hubMesh.add(new THREE.Mesh(new THREE.BoxGeometry(0.06,0.06,0.44),hubMat2));
hubMesh.position.x=hubR; hubPI.add(hubMesh);
{const o=mkOrbit(hubR,0x44ffee,0.52);hubPO.add(o);orbitLines.push(o);}
{const l=mkLabel('Hubble','rgba(100,220,255,.88)',14);l.scale.set(2,0.75,1);l.position.set(hubR,0.42,0);hubPI.add(l);}

// ── JWST ──────────────────────────────────────────────────────
const L2D=logD(1.010);
const jwstPO=new THREE.Object3D(); scene.add(jwstPO);
const jwstH=new THREE.Object3D(); jwstH.position.x=L2D; jwstPO.add(jwstH);
const jwstMesh=new THREE.Group();
const jMat2=new THREE.MeshStandardMaterial({color:0xffe0a0,emissive:0xaa6600,emissiveIntensity:0.7,roughness:0.3,metalness:0.6});
jwstMesh.add(new THREE.Mesh(new THREE.BoxGeometry(0.42,0.02,0.24),jMat2));
jwstMesh.add(new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.13,0.016,6),new THREE.MeshStandardMaterial({color:0xffd700,emissive:0xaa8800,emissiveIntensity:0.85,roughness:0.1,metalness:0.9})));
[0.28,-0.28].forEach(x=>{const p=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.01,0.24),new THREE.MeshStandardMaterial({color:0x334488,roughness:0.5}));p.position.x=x;jwstMesh.add(p);});
jwstMesh.position.x=0.35; jwstH.add(jwstMesh);
{const pts=[];for(let i=0;i<=100;i++){const a=(i/100)*Math.PI*2;pts.push(new THREE.Vector3(Math.cos(a)*0.35,Math.sin(a)*0.14,Math.sin(a)*0.35));}const o=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0xffcc44,transparent:true,opacity:0.52}));jwstH.add(o);orbitLines.push(o);}
{const l=mkLabel('JWST','rgba(255,210,80,.9)',14);l.scale.set(1.8,0.7,1);l.position.set(0.35,0.38,0);jwstH.add(l);}

// ── LAGRANGE POINTS ───────────────────────────────────────────
const lagPiv=new THREE.Object3D(); scene.add(lagPiv);
const LPS=[{id:'L1',r:logD(0.990),a:0,col:'#ff8844',info:'L1 · 0.990 UA\nSOHO, DSCOVR\nVent solaire'},
           {id:'L2',r:logD(1.010),a:0,col:'#ffdd44',info:'L2 · 1.010 UA\nJWST, Planck, Herschel'},
           {id:'L3',r:logD(1),a:Math.PI,col:'#ff4488',info:'L3 · instable\nOpposé à la Terre'},
           {id:'L4',r:logD(1),a:Math.PI/3,col:'#44ff88',info:'L4 · +60° Troie\nAstéroïdes troyens'},
           {id:'L5',r:logD(1),a:-Math.PI/3,col:'#44ff88',info:'L5 · -60° Troie\nAstéroïdes troyens'}];
const lagMs=[];
for(const lp of LPS){
  const lx=Math.cos(lp.a)*lp.r,lz=Math.sin(lp.a)*lp.r;
  const m=new THREE.Mesh(new THREE.OctahedronGeometry(0.22,0),new THREE.MeshBasicMaterial({color:new THREE.Color(lp.col),transparent:true,opacity:0.9}));
  m.position.set(lx,0,lz); lagPiv.add(m);
  const g2=new THREE.Mesh(new THREE.SphereGeometry(0.55,8,8),new THREE.MeshBasicMaterial({color:new THREE.Color(lp.col),transparent:true,opacity:0.07,side:THREE.BackSide}));
  g2.position.set(lx,0,lz); lagPiv.add(g2);
  const l=mkLabel(lp.id,lp.col,17);l.scale.set(1.6,0.62,1);l.position.set(lx,0.68,lz);lagPiv.add(l);
  lagMs.push({mesh:m,data:lp});
}

// ── GALACTIC STRUCTURES ───────────────────────────────────────
progress(58, 'Voie Lactée (bras spiraux)...');
const galGroup=new THREE.Group(); scene.add(galGroup); galGroup.visible=false;
GALAXY.buildMilkyWay(galGroup);

// Sgr A*
progress(65, 'Sgr A* (trou noir central)...');
const {group:sgraGroup, phRing, disk:accDisk, BHR} = GALAXY.buildSgrA(galGroup);

// ── ALPHA CENTAURI ────────────────────────────────────────────
progress(70, 'Alpha Centauri...');
const acG=new THREE.Group(); acG.position.set(38000,2000,52000); scene.add(acG); acG.visible=false;
// α Cen A
const acaMesh=new THREE.Mesh(new THREE.SphereGeometry(8.5,32,32),new THREE.MeshBasicMaterial({color:0xffee88})); acG.add(acaMesh);
const acaCorona=SHADERS.makeCoronaMaterial();
acG.add(new THREE.Mesh(new THREE.SphereGeometry(14,20,20),acaCorona));
// α Cen B
const acbPiv=new THREE.Object3D(); acG.add(acbPiv);
const acbMesh=new THREE.Mesh(new THREE.SphereGeometry(7.5,32,32),new THREE.MeshBasicMaterial({color:0xffbb66})); acbMesh.position.x=88; acbPiv.add(acbMesh);
// AB orbit
{const pts=[];for(let i=0;i<=80;i++){const a=(i/80)*Math.PI*2;pts.push(new THREE.Vector3(Math.cos(a)*46,Math.sin(a)*12,Math.sin(a)*46));}acG.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0xff4444,transparent:true,opacity:0.38})));}
// Proxima
const proxPos=new THREE.Vector3(14000,0,11500);
const proxMesh=new THREE.Mesh(new THREE.SphereGeometry(2.8,20,20),new THREE.MeshBasicMaterial({color:0xff4422})); proxMesh.position.copy(proxPos); acG.add(proxMesh);
// Proxima b
const proxbPiv=new THREE.Object3D(); proxbPiv.position.copy(proxPos); acG.add(proxbPiv);
const proxbMesh=new THREE.Mesh(new THREE.SphereGeometry(0.85,14,14),new THREE.MeshStandardMaterial({color:0x4466aa,emissive:0x001122,roughness:0.7})); proxbMesh.position.x=12; proxbPiv.add(proxbMesh);
{const o=mkOrbit(12,0xff8888,0.42);proxbPiv.add(o);}
// Labels
['α Centauri A  (G2V)','α Centauri B  (K1V)','Proxima Centauri  (M5V · 4.24 al)','Proxima b'].forEach((t,i)=>{
  const l=mkLabel(t,['rgba(255,238,120,.88)','rgba(255,190,100,.82)','rgba(255,100,60,.82)','rgba(100,160,255,.78)'][i],15);
  l.scale.set([200,200,380,180][i],[44,44,50,44][i],1);
  l.position.copy([new THREE.Vector3(0,18,0),new THREE.Vector3(88,17,0),proxPos.clone().add(new THREE.Vector3(0,13,0)),new THREE.Vector3(12,5,0).add(proxPos)][i]);
  if(i===3) proxbPiv.add(l); else acG.add(l);
});
{const l=mkLabel('Système α Centauri · Triple étoile · 4.37 années-lumière',  'rgba(255,225,155,.72)',14);l.scale.set(440,52,1);l.position.set(0,42,0);acG.add(l);}

// ── ANDROMEDA ─────────────────────────────────────────────────
progress(75, 'Andromède (M31)...');
const AND_DIST=11500000;
const {group:andG, AND_R} = GALAXY.buildAndromeda(scene, AND_DIST);
andG.visible=false;
{const l=mkLabel('Andromède (M31)  ·  2.537 Mly','rgba(255,220,160,.85)',17);l.scale.set(AND_R*1.3,AND_R*0.15,1);l.position.set(0,AND_R*1.2,0);andG.add(l);}

// Magellanic Clouds
const magClouds = GALAXY.buildMagellanicClouds(scene);
magClouds.forEach(c=>c.group.visible=false);

// ── NEARBY STAR MARKERS ───────────────────────────────────────
progress(80, 'Étoiles voisines...');
const nearbyGroup=new THREE.Group(); scene.add(nearbyGroup); nearbyGroup.visible=false;
STARDATA.NEARBY.forEach((s,i)=>{
  const [x,y,z]=STARDATA.radecToXYZ(s.ra,s.dec,s.dist*1200);
  const col=STARDATA.specToColor(s.spec);
  const sm=new THREE.Mesh(new THREE.SphereGeometry(s.dist<6?8:5,12,12),new THREE.MeshBasicMaterial({color:new THREE.Color(...col)}));
  sm.position.set(x,y,z); nearbyGroup.add(sm);
  sm.userData={name:s.name,info:s.desc};
  const lbl=mkLabel(s.name,`rgba(${Math.round(col[0]*255)},${Math.round(col[1]*255)},${Math.round(col[2]*255)},0.8)`,14);
  lbl.scale.set(150,35,1); lbl.position.set(x,y+12,z); nearbyGroup.add(lbl);
});

// ── FOCUS SYSTEM ─────────────────────────────────────────────
progress(88, 'Interface...');
const GC=GALAXY.GC, MWR=GALAXY.MWR;

let curTarget='free';
function focusOn(key){
  curTarget=key;
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.target===key));
  panGoal.set(0,0,0);
  AUDIO.resume(); AUDIO.playNavClick();

  if(key==='free'){ camGoal.set(0,0,0); radiusGoal=220; }
  else if(key==='sun'){ camGoal.set(0,0,0); radiusGoal=22; }
  else if(PM[key]){ PM[key].tiltNode.getWorldPosition(camGoal); radiusGoal=PM[key].r*35+12; }
  else if(key==='iss'){ issMesh.getWorldPosition(camGoal); radiusGoal=3; }
  else if(key==='hubble'){ hubMesh.children[0].getWorldPosition(camGoal); radiusGoal=2.5; }
  else if(key==='jwst'){ jwstMesh.children[0].getWorldPosition(camGoal); radiusGoal=3.5; }
  else if(key==='milkyway'){ camGoal.set(GC,0,0); radiusGoal=5500000; phi=1.0; theta=0.5; }
  else if(key==='sgra'){ camGoal.set(GC,0,0); radiusGoal=BHR*22; phi=1.22; theta=0.85; }
  else if(key==='alphacentauri'){ camGoal.copy(acG.position); radiusGoal=600; phi=1.1; theta=0.4; }
  else if(key==='andromeda'){ camGoal.copy(andG.position); radiusGoal=AND_R*3.2; phi=1.05; theta=0.5; }
  else if(key==='barnard'){ const s=STARDATA.NEARBY.find(n=>n.name.includes('Barnard'));if(s){const[x,y,z]=STARDATA.radecToXYZ(s.ra,s.dec,s.dist*1200);camGoal.set(x,y,z);radiusGoal=120;} }
  else if(key==='sirius'){ const s=STARDATA.NEARBY.find(n=>n.name==='Sirius A');if(s){const[x,y,z]=STARDATA.radecToXYZ(s.ra,s.dec,s.dist*1200);camGoal.set(x,y,z);radiusGoal=120;} }
  else if(key==='localgroup'){ camGoal.set(AND_DIST*0.3,AND_DIST*0.1,0); radiusGoal=AND_DIST*1.5; }
}
document.querySelectorAll('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>focusOn(btn.dataset.target)));

// ── CONTROLS ─────────────────────────────────────────────────
let speed=1, orbVis=true, lblVis=true;
function setSpeed(s){speed=s;document.getElementById('speed-val').textContent=`×${s}`;}
document.getElementById('btn-faster').onclick=()=>{setSpeed(Math.min(speed*2,1024));AUDIO.resume();};
document.getElementById('btn-slower').onclick=()=>{setSpeed(Math.max(speed/2,0.125));AUDIO.resume();};
document.getElementById('btn-reset').onclick=()=>{setSpeed(1);focusOn('free');};
document.getElementById('btn-orbits').onclick=()=>{
  orbVis=!orbVis;orbitLines.forEach(l=>l.visible=orbVis);
  document.getElementById('btn-orbits').classList.toggle('active',!orbVis);
};
document.getElementById('btn-labels').onclick=()=>{
  lblVis=!lblVis;
  Object.values(PM).forEach(p=>p.lbl.visible=lblVis);
  document.getElementById('btn-labels').classList.toggle('active',!lblVis);
};

// ── RAYCASTING ────────────────────────────────────────────────
const ray=new THREE.Raycaster();
const mouse=new THREE.Vector2();

function raycast(cx,cy){
  mouse.x=(cx/window.innerWidth)*2-1; mouse.y=-(cy/window.innerHeight)*2+1;
  ray.setFromCamera(mouse,camera);
  const pMeshes=PLANETS_DATA.map(p=>PM[p.id].mesh);
  const lagMeshes=lagMs.map(l=>l.mesh);
  const nearbyMeshes=nearbyGroup.children.filter(c=>c instanceof THREE.Mesh);
  const all=[...pMeshes,issMesh,...lagMeshes,...hubMesh.children,...jwstMesh.children,proxbMesh,...nearbyMeshes];
  const hits=ray.intersectObjects(all,true);
  if(!hits.length){ document.getElementById('info').classList.remove('show'); return; }
  const obj=hits[0].object;
  let name='',info='';
  const pi=pMeshes.indexOf(obj);
  if(pi>=0){name=PLANETS_DATA[pi].name;info=PLANETS_DATA[pi].info;}
  else if(obj===issMesh){name='🛰 ISS';info='Station Spatiale Internationale\nAlt: ~408 km · Vitesse: 27 600 km/h\nPériode: 92 min · Lancée: 1998\nÉquipage: 7 astronautes';}
  else if(hubMesh.children.includes(obj)){name='🔭 Hubble';info='Télescope Spatial Hubble\nAlt: ~540 km (LEO)\nLancé: 1990 · Miroir: 2.4 m\nPlus de 1.5 million d\'observations';}
  else if(jwstMesh.children.includes(obj)){name='🌌 JWST';info='James Webb Space Telescope\nPoint L2 Soleil-Terre · 1.5 M km\nLancé: 2021 · Miroir: 6.5 m (18 segments)\nInfrarouge: galaxies à z>10';}
  else if(lagMeshes.includes(obj)){const ld=lagMs[lagMeshes.indexOf(obj)].data;name=ld.id;info=ld.info;}
  else if(obj===proxbMesh){name='Proxima b';info='Exoplanète candidate habitable\nAutour de Proxima Centauri (4.24 al)\nPériode: 11.2 jours · Zone habitable\nMasse min: ~1.3 M⊕';}
  else if(nearbyMeshes.includes(obj)){name=obj.userData.name||'Étoile';info=obj.userData.info||'';}
  if(name){
    document.getElementById('info-name').textContent=name;
    document.getElementById('info-body').innerHTML=info.replace(/\n/g,'<br>');
    document.getElementById('info').classList.add('show');
  }
}
renderer.domElement.addEventListener('click',e=>raycast(e.clientX,e.clientY));
renderer.domElement.addEventListener('touchend',e=>{if(e.changedTouches.length===1&&!isDrag)raycast(e.changedTouches[0].clientX,e.changedTouches[0].clientY);});

function handleDoubleTap(cx,cy){
  mouse.x=(cx/window.innerWidth)*2-1; mouse.y=-(cy/window.innerHeight)*2+1;
  ray.setFromCamera(mouse,camera);
  const pMeshes=PLANETS_DATA.map(p=>PM[p.id].mesh);
  const hits=ray.intersectObjects(pMeshes,true);
  if(hits.length){const idx=pMeshes.indexOf(hits[0].object);if(idx>=0)focusOn(PLANETS_DATA[idx].id);}
}

// ── SCALE DISPLAY ─────────────────────────────────────────────
let lastScaleName='';
function scLabel(r){
  if(r<6)   return '🔭 Orbite terrestre basse';
  if(r<30)  return '🌍 Proche de la Terre';
  if(r<100) return '☀️ Système Solaire intérieur';
  if(r<380) return '🪐 Système Solaire extérieur';
  if(r<2200)return '❄️ Ceinture de Kuiper';
  if(r<22000)return '☄️ Nuage de Oort';
  if(r<160000)return '⭐ Voisinage solaire';
  if(r<1400000)return '🌌 Bras d\'Orion — Voie Lactée';
  if(r<6500000)return '🌀 Voie Lactée complète';
  if(r<20000000)return '🌠 Groupe Local';
  return '🔭 Univers local observable';
}

// ── MAIN ANIMATION ────────────────────────────────────────────
let T=0, prevScaleName='';

function animate(){
  requestAnimationFrame(animate);
  T+=0.016*speed;

  // Shader time uniforms
  const tu=T*0.5;
  allShaderMats.forEach(m=>{ if(m.uniforms?.uTime) m.uniforms.uTime.value=tu; });
  if(accDisk?.material?.uniforms?.uTime) accDisk.material.uniforms.uTime.value=tu;

  // Sun
  sunMesh.rotation.y=T*0.018;
  if(coronaMat.uniforms?.uTime) coronaMat.uniforms.uTime.value=tu;

  // Planets
  for(const pd of PLANETS_DATA){
    const pm=PM[pd.id];
    const as=(2*Math.PI)/(pd.period/365.25);
    pm.pivot.rotation.y=T*as*0.05;
    pm.mesh.rotation.y+=(pd.rotDir||1)*0.002*speed;
    if(pm.cloudMesh) pm.cloudMesh.rotation.y+=(pd.rotDir||1)*0.0026*speed;
    for(const mp of pm.moonPivots){
      const ms=(2*Math.PI)/Math.abs(mp.data.period);
      mp.piv.rotation.y=T*ms*0.3*(mp.data.period<0?-1:1);
    }
    // Update atmosphere sun direction
    if(pm.tiltNode){
      pm.tiltNode.children.forEach(c=>{
        if(c.material?.uniforms?.uSunDir){
          const wp=new THREE.Vector3(); pm.tiltNode.getWorldPosition(wp);
          c.material.uniforms.uSunDir.value.copy(wp.normalize().negate());
        }
      });
    }
  }

  // Orbiters
  const ePm=PM['earth'];
  issPO.rotation.y=ePm.pivot.rotation.y;
  issPI.position.x=ePm.dist;
  issPI.rotation.y=T*(2*Math.PI/(92/(60*24*365.25)))*0.05;
  issMesh.rotation.y+=0.05*speed;
  hubPO.rotation.y=ePm.pivot.rotation.y;
  hubPI.position.x=ePm.dist;
  hubPI.rotation.y=T*(2*Math.PI/(97/(60*24*365.25)))*0.05+1.2;
  hubMesh.rotation.y+=0.03*speed;
  jwstPO.rotation.y=ePm.pivot.rotation.y;
  jwstH.position.x=L2D;
  jwstH.rotation.y=T*0.0075;
  jwstMesh.rotation.y+=0.01*speed;

  // Lagrange
  lagPiv.rotation.y=ePm.pivot.rotation.y;
  const pulse=0.85+Math.sin(T*2)*0.15;
  lagMs.forEach(l=>{l.mesh.scale.setScalar(pulse);l.mesh.rotation.y+=0.02*speed;});

  // Comets (Keplerian)
  for(const c of COMETS){
    c.phase+=c.spd*speed;
    const p3=Kepler.orbitPos(c.a,c.e,c.inc,c.om,c.node,c.phase%(Math.PI*2));
    c.mesh.position.copy(p3); c.coma.position.copy(p3);
    const prox=Math.max(0,1-p3.length()/(c.periR*8));
    c.coma.material.opacity=prox*0.18;
    const away=p3.clone().normalize();
    const tb=p3.clone().addScaledVector(away,c.dust.scale.y*0.5*prox);
    c.dust.position.copy(tb); c.ion.position.copy(tb);
    const ang=Math.atan2(away.x,away.z);
    c.dust.material.rotation=ang+Math.PI/2; c.ion.material.rotation=ang+Math.PI/2;
    c.dust.visible=prox>0.05; c.ion.visible=prox>0.05;
    c.dust.material.opacity=prox>0.05?0.78*prox:0;
    c.ion.material.opacity=prox>0.05?0.58*prox:0;
    c.mesh.rotation.x+=0.03*speed; c.mesh.rotation.z+=0.02*speed;
  }

  // Alpha Centauri
  acbPiv.rotation.y=T*0.001;
  proxbPiv.rotation.y=T*0.018;
  acaMesh.rotation.y+=0.006*speed;
  acbMesh.rotation.y+=0.005*speed;
  if(acaCorona.uniforms?.uTime) acaCorona.uniforms.uTime.value=tu;

  // Sgr A*
  if(phRing) phRing.rotation.z+=0.018*speed;

  // Scale-based visibility
  const inGal=radius>65000||curTarget==='milkyway'||curTarget==='sgra';
  const inAnd=radius>5000000||curTarget==='andromeda'||curTarget==='localgroup';
  const inAC=(radius>15000&&radius<4000000)||curTarget==='alphacentauri'||curTarget==='barnard'||curTarget==='sirius';
  galGroup.visible=inGal;
  andG.visible=inAnd;
  magClouds.forEach(c=>c.group.visible=inGal);
  acG.visible=inAC;
  nearbyGroup.visible=inAC;

  // Dynamic follow
  if(curTarget!=='free'&&PM[curTarget]){ PM[curTarget].tiltNode.getWorldPosition(camGoal); }
  if(curTarget==='iss') issMesh.getWorldPosition(camGoal);
  if(curTarget==='hubble') hubMesh.children[0].getWorldPosition(camGoal);
  if(curTarget==='jwst') jwstMesh.children[0].getWorldPosition(camGoal);

  applyCamera();

  // Scale label
  const sn=scLabel(radius);
  if(sn!==prevScaleName){
    document.getElementById('scale-label').textContent=sn;
    if(prevScaleName) AUDIO.updateMusic(sn);
    prevScaleName=sn;
  }

  renderer.render(scene,camera);
}

// ── PWA SERVICE WORKER ────────────────────────────────────────
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('sw.js').catch(()=>{});
}

// ── INIT ─────────────────────────────────────────────────────
progress(95, 'Finalisation...');
setTimeout(()=>{
  progress(100,'Prêt !');
  setTimeout(()=>{
    document.getElementById('loader').classList.add('fade');
    setTimeout(()=>document.getElementById('loader').remove(),900);
    animate();
    // Start audio on first interaction
    document.addEventListener('click', ()=>AUDIO.start(), {once:true});
    document.addEventListener('touchstart',()=>AUDIO.start(),{once:true});
  },400);
},200);
