// ═══════════════════════════════════════════════════════════════
// MAIN.JS — Cosmos PWA · Version PC haute résolution
// ═══════════════════════════════════════════════════════════════
'use strict';

function wait(ms){ return new Promise(r=>setTimeout(r,ms)); }
const BAR=document.getElementById('loader-bar');
const STATUS=document.getElementById('loader-status');
function progress(pct,msg){ BAR.style.width=pct+'%'; if(msg)STATUS.textContent=msg; }

// ── RENDERER ─────────────────────────────────────────────────
const renderer=new THREE.WebGLRenderer({antialias:true,logarithmicDepthBuffer:true});
renderer.setSize(window.innerWidth,window.innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio,3));
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.15;
document.body.insertBefore(renderer.domElement,document.getElementById('hud'));

const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(55,window.innerWidth/window.innerHeight,0.001,9e10);
camera.position.set(0,80,220);
window.addEventListener('resize',()=>{
  renderer.setSize(window.innerWidth,window.innerHeight);
  camera.aspect=window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
});

// ── CAMÉRA ───────────────────────────────────────────────────
let theta=0.4,phi=1.15,radius=220,radiusGoal=220;
let camTarget=new THREE.Vector3(),camGoal=new THREE.Vector3();
let panOff=new THREE.Vector3(),panGoal=new THREE.Vector3();
let isDrag=false,lx=0,ly=0,shiftHeld=false;

document.addEventListener('keydown',e=>{ if(e.key==='Shift')shiftHeld=true; });
document.addEventListener('keyup',  e=>{ if(e.key==='Shift')shiftHeld=false; });
renderer.domElement.addEventListener('mousedown',e=>{ isDrag=true;lx=e.clientX;ly=e.clientY; });
document.addEventListener('mouseup',()=>isDrag=false);
document.addEventListener('mousemove',e=>{
  if(!isDrag)return;
  const dx=e.clientX-lx,dy=e.clientY-ly; lx=e.clientX;ly=e.clientY;
  if(shiftHeld){
    const r2=new THREE.Vector3().crossVectors(new THREE.Vector3(Math.sin(theta)*Math.sin(phi),Math.cos(phi),Math.cos(theta)*Math.sin(phi)),new THREE.Vector3(0,1,0)).normalize();
    panGoal.addScaledVector(r2,-dx*radius*0.001);
    panGoal.addScaledVector(new THREE.Vector3(0,1,0),dy*radius*0.001);
  } else { theta-=dx*0.005; phi=Math.max(0.04,Math.min(Math.PI-0.04,phi-dy*0.005)); }
});
renderer.domElement.addEventListener('wheel',e=>{
  e.preventDefault();
  radiusGoal=Math.max(1.5,Math.min(5e7,radiusGoal*(e.deltaY>0?1.12:0.89)));
  AUDIO.resume();
},{passive:false});
let ltd=0,tc=0,ltap=0;
renderer.domElement.addEventListener('touchstart',e=>{
  tc=e.touches.length;
  if(tc===1){isDrag=true;lx=e.touches[0].clientX;ly=e.touches[0].clientY;}
  if(tc===2)ltd=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
  const now=Date.now(); if(now-ltap<300)doubleTap(e.touches[0].clientX,e.touches[0].clientY); ltap=now;
},{passive:true});
renderer.domElement.addEventListener('touchmove',e=>{
  if(tc===1&&isDrag){const dx=e.touches[0].clientX-lx,dy=e.touches[0].clientY-ly;lx=e.touches[0].clientX;ly=e.touches[0].clientY;theta-=dx*0.005;phi=Math.max(0.04,Math.min(Math.PI-0.04,phi-dy*0.005));}
  if(tc===2){const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);radiusGoal=Math.max(1.5,Math.min(5e7,radiusGoal*(ltd/d)));ltd=d;}
},{passive:true});
renderer.domElement.addEventListener('touchend',()=>{isDrag=false;tc=0;});

function applyCamera(){
  radius+=(radiusGoal-radius)*0.10; camTarget.lerp(camGoal,0.10); panOff.lerp(panGoal,0.08);
  const tx=camTarget.x+panOff.x,ty=camTarget.y+panOff.y,tz=camTarget.z+panOff.z;
  camera.position.set(tx+radius*Math.sin(theta)*Math.sin(phi),ty+radius*Math.cos(phi),tz+radius*Math.cos(theta)*Math.sin(phi));
  camera.lookAt(tx,ty,tz);
  const near=radius>50000?radius*0.0005:0.001, far=radius>50000?radius*2500:9e10;
  if(Math.abs(camera.near-near)>near*0.1){camera.near=near;camera.far=far;camera.updateProjectionMatrix();}
}

// ── HELPERS ──────────────────────────────────────────────────
function logD(au){return 8+Math.log(1+au*2.5)/Math.log(1.9)*18;}
function pR(km){return Math.max(0.5,Math.log(km/500+1)*0.7);}
function mkOrbit(r,col=0xff4444,op=0.55,seg=120){
  const pts=[];for(let i=0;i<=seg;i++){const a=(i/seg)*Math.PI*2;pts.push(new THREE.Vector3(Math.cos(a)*r,0,Math.sin(a)*r));}
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:col,transparent:true,opacity:op}));
}
function mkLabel(txt,col='rgba(160,200,255,.9)',sz=20,w=512){
  const c=document.createElement('canvas'); c.width=w;c.height=64;
  const x=c.getContext('2d'); x.font=`bold ${sz}px monospace`; x.fillStyle=col; x.textAlign='center'; x.fillText(txt,w/2,42);
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true}));
  s.scale.set(8,2,1); return s;
}
function registerMesh(mesh,name,info){ mesh.userData={name,info}; clickables.push(mesh); return mesh; }

// ── VARIABLES GLOBALES ────────────────────────────────────────
const PM={}, planetOrbitLines=[], moonOrbitLines=[], moonPivotRegistry=[], allShaderMats=[];
const clickables=[]; // tous les meshes cliquables
let sgraGroup=null,phRing=null,accDisk=null,BHR=40000;
let acG=null,acaMesh=null,acbMesh=null,acbPiv=null,proxMesh=null,proxbMesh=null,proxbPiv=null,proxcMesh=null,proxcPiv=null;
let andG=null,AND_R=GALAXY.MWR*1.15,AND_DIST=11500000;
let magClouds=[],nearbyGroup=new THREE.Group(),galGroup=null;
let stellarSysGroup=null,giantStarGroup=null,nebulaGroup=null,quasarGroup=null;
let issMesh=null,hubMesh=null,jwstMesh=null,issPI=null,issPO=null,hubPI=null,hubPO=null,jwstPO=null,jwstH=null,L2D=0;
let lagMs=[], lagPivRef=null;
const COMETS=[];
const GC=GALAXY.GC;
let curTarget='free', speed=1, orbPlanetsVis=true, orbMoonsVis=true, lblVis=true;
let T=0, prevScaleName='';

scene.add(nearbyGroup); nearbyGroup.visible=false;

// ═══════════════════════════════════════════════════════════════
// CHARGEMENT ASYNCHRONE
// ═══════════════════════════════════════════════════════════════
async function loadAll(){
  try{

  // 1 — Lumières
  progress(5,'Lumières...');  await wait(20);
  scene.add(new THREE.PointLight(0xfff5e0,5,8000,1.4));
  scene.add(new THREE.AmbientLight(0x0d1428,0.6));

  // 2 — Étoiles fond
  progress(10,'Catalogue étoiles...');  await wait(30);
  const {geo:starGeo}=STARDATA.buildStarGeometry();
  scene.add(new THREE.Points(starGeo,SHADERS.makeStarPointsMaterial()));

  // 3 — Soleil
  progress(16,'Soleil...');  await wait(20);
  const sunMat=SHADERS.makeSunMaterial(); allShaderMats.push(sunMat);
  const sunMesh=new THREE.Mesh(new THREE.SphereGeometry(7,64,64),sunMat); scene.add(sunMesh);
  window._sunMesh=sunMesh;
  const coronaMat=SHADERS.makeCoronaMaterial(); allShaderMats.push(coronaMat);
  window._coronaMat=coronaMat;
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(15,32,32),coronaMat));
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(26,16,16),new THREE.MeshBasicMaterial({color:0xff4400,transparent:true,opacity:0.032,side:THREE.BackSide})));
  registerMesh(sunMesh,'☀️ Soleil (G2V)','Type: G2V · Naine jaune\nMasse: 1 M☉ · Rayon: 695 700 km\nTempérature: 5 778 K\nÂge: 4.6 milliards d\'années\nLuminosité: 3.828×10²⁶ W\nPériode de rotation: 25-35 jours\nDistance Terre: 1 UA = 149 597 870 km');

  // 4 — Planètes
  progress(22,'Planètes...'); await wait(15);
  for(const pd of PLANETS_DATA){
    await wait(12);
    const dist=logD(pd.au),r=pR(pd.km);
    const pivot=new THREE.Object3D(); scene.add(pivot);
    const pOrb=mkOrbit(dist); scene.add(pOrb); planetOrbitLines.push(pOrb);
    const tiltNode=new THREE.Object3D(); tiltNode.position.x=dist; tiltNode.rotation.z=(pd.tilt||0)*Math.PI/180; pivot.add(tiltNode);
    const tex=TEXTURES.get(pd.id);
    const mat=new THREE.MeshStandardMaterial({map:tex,roughness:0.78,metalness:0.02,emissive:new THREE.Color(pd.emis||'#000'),emissiveIntensity:0.03});
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(r,96,96),mat); tiltNode.add(mesh);
    registerMesh(mesh, pd.name, pd.info);
    if(pd.atmos){const am=new THREE.Mesh(new THREE.SphereGeometry(r*1.12,28,28),SHADERS.makeAtmosMaterial(pd.atmos,new THREE.Vector3(1,0,0),pd.atmosIntensity||1,pd.atmosFalloff||3.5));tiltNode.add(am);allShaderMats.push(am.material);}
    let cloudMesh=null;
    if(pd.clouds){const cT=TEXTURES.get('earthClouds');cloudMesh=new THREE.Mesh(new THREE.SphereGeometry(r*1.009,56,56),new THREE.MeshStandardMaterial({map:cT,transparent:true,opacity:0.88,depthWrite:false,roughness:1}));tiltNode.add(cloudMesh);}
    if(pd.rings){const inn=r*1.22,out=r*2.5,geo=new THREE.RingGeometry(inn,out,120,6);const pos2=geo.attributes.position,uv=geo.attributes.uv;for(let i=0;i<pos2.count;i++){const v=new THREE.Vector3().fromBufferAttribute(pos2,i);uv.setXY(i,(v.length()-inn)/(out-inn),0);}const rTex=pd.id==='saturn'?TEXTURES.get('saturnRings'):null;const rm=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({map:rTex||null,color:pd.thinRings?0x889aaa:0xddc880,transparent:true,opacity:pd.thinRings?0.20:0.65,side:THREE.DoubleSide}));rm.rotation.x=Math.PI/2;tiltNode.add(rm);}
    const moonPivots=[];
    for(const m of pd.moons_list){
      const mD=r*2.5+m.dist*2.5,mR=Math.max(0.12,pR(m.km)*0.6);
      const mPts=[];for(let i=0;i<=80;i++){const a=(i/80)*Math.PI*2;mPts.push(new THREE.Vector3(Math.cos(a)*mD,0,Math.sin(a)*mD));}
      const mOrb=new THREE.Line(new THREE.BufferGeometry().setFromPoints(mPts),new THREE.LineBasicMaterial({color:0xff8888,transparent:true,opacity:0.35}));
      mOrb.position.x=dist; pivot.add(mOrb); moonOrbitLines.push(mOrb);
      const mPiv=new THREE.Object3D(); mPiv.position.x=dist; pivot.add(mPiv);
      const mTex=m.name==='Lune'?TEXTURES.get('moon'):null;
      const mMesh=new THREE.Mesh(new THREE.SphereGeometry(mR,24,24),new THREE.MeshStandardMaterial({color:new THREE.Color(m.color||'#aaa'),roughness:0.85,map:mTex||undefined}));
      mMesh.position.x=mD; mPiv.add(mMesh);
      registerMesh(mMesh, m.name, m.info||`Lune de ${pd.name}`);
      moonPivotRegistry.push({piv:mPiv,mesh:mMesh,data:m,dist:mD,parentDist:dist});
      moonPivots.push({piv:mPiv,mesh:mMesh,data:m,dist:mD});
    }
    const lbl=mkLabel(pd.name); lbl.position.set(dist,r+3,0); pivot.add(lbl);
    PM[pd.id]={pivot,mesh,tiltNode,data:pd,moonPivots,dist,r,cloudMesh,lbl};
  }

  // 5 — Ceintures
  progress(42,'Ceintures...'); await wait(25);
  _buildBelts();

  // 6 — Oort + comètes
  progress(48,'Oort + comètes...'); await wait(25);
  _buildOort(); await wait(10); _buildComets();

  // 7 — Orbiteurs + Lagrange
  progress(54,'Orbiteurs...'); await wait(20);
  _buildOrbiters(); _buildLagrange();

  // 8 — Voie Lactée
  progress(60,'Voie Lactée...'); await wait(50);
  galGroup=new THREE.Group(); scene.add(galGroup); galGroup.visible=false;
  GALAXY.buildMilkyWay(galGroup);

  // 9 — Sgr A*
  progress(70,'Sgr A*...'); await wait(40);
  const sgra=GALAXY.buildSgrA(galGroup);
  sgraGroup=sgra.group; phRing=sgra.phRing; accDisk=sgra.disk; BHR=sgra.BHR;

  // 10 — Alpha Centauri
  progress(74,'α Centauri...'); await wait(30);
  _buildAlphaCen();

  // 11 — Systèmes stellaires (TRAPPIST, Tau Ceti...)
  progress(78,'Systèmes exoplanétaires...'); await wait(40);
  _buildStellarSystems();

  // 12 — Étoiles géantes
  progress(83,'Étoiles géantes...'); await wait(40);
  _buildGiantStars();

  // 13 — Nébuleuses
  progress(87,'Nébuleuses...'); await wait(40);
  _buildNebulae();

  // 14 — Quasars / Pulsars
  progress(90,'Quasars et pulsars...'); await wait(30);
  _buildQuasars();

  // 15 — Andromède + Nuages de Magellan + étoiles voisines
  progress(92,'Andromède...'); await wait(50);
  const res=GALAXY.buildAndromeda(scene,AND_DIST);
  andG=res.group; AND_R=res.AND_R; andG.visible=false;
  const andLbl=mkLabel('Andromède (M31)  ·  2.537 Mly','rgba(255,220,160,.88)',16);
  andLbl.scale.set(AND_R*1.35,AND_R*0.16,1); andLbl.position.set(0,AND_R*1.25,0); andG.add(andLbl);
  const mc=GALAXY.buildMagellanicClouds(scene); mc.forEach(c=>{magClouds.push(c);c.group.visible=false;});

  progress(96,'Étoiles voisines...'); await wait(30);
  _buildNearbyStars();

  // PRÊT
  progress(100,'Prêt !'); await wait(350);
  document.getElementById('loader').classList.add('fade');
  setTimeout(()=>document.getElementById('loader').remove(),900);
  _setupUI(); animate();
  if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
  document.addEventListener('click',()=>AUDIO.start(),{once:true});
  document.addEventListener('touchstart',()=>AUDIO.start(),{once:true});

  }catch(err){STATUS.textContent='Erreur: '+err.message; console.error(err);}
}

// ═══════════════════════════════════════════════════════════════
// CONSTRUCTEURS
// ═══════════════════════════════════════════════════════════════

function _buildBelts(){
  function belt(iAU,oAU,N,col,op,sp=1.5){
    const geo=new THREE.BufferGeometry(),pos=new Float32Array(N*3);
    for(let i=0;i<N;i++){const r=logD(iAU+Math.random()*(oAU-iAU))+(Math.random()-.5)*1.5,a=Math.random()*Math.PI*2;pos[i*3]=Math.cos(a)*r;pos[i*3+1]=(Math.random()-.5)*sp;pos[i*3+2]=Math.sin(a)*r;}
    geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
    scene.add(new THREE.Points(geo,new THREE.PointsMaterial({color:new THREE.Color(col),size:.3,transparent:true,opacity:op,sizeAttenuation:true})));
  }
  belt(2.2,3.5,4000,'#c8b89a',.58); belt(30,55,6000,'#88aacc',.62,6);
  const l=mkLabel('Ceinture de Kuiper','rgba(136,170,204,.55)',15); l.scale.set(20,3,1); l.position.set(logD(42)*.72,4,-logD(42)*.72); scene.add(l);
}

function _buildOort(){
  function layer(N,rMin,rMax,flatY,sz,op){
    const geo=new THREE.BufferGeometry(),pos=new Float32Array(N*3),cols=new Float32Array(N*3);
    for(let i=0;i<N;i++){const r=rMin+Math.random()*(rMax-rMin),th=Math.random()*Math.PI*2,ph=Math.acos(2*Math.random()-1);pos[i*3]=r*Math.sin(ph)*Math.cos(th);pos[i*3+1]=r*Math.sin(ph)*Math.sin(th)*flatY;pos[i*3+2]=r*Math.cos(ph);const icy=Math.random()>.38;if(icy){cols[i*3]=.55+Math.random()*.4;cols[i*3+1]=.72+Math.random()*.28;cols[i*3+2]=1;}else{cols[i*3]=.9;cols[i*3+1]=.55;cols[i*3+2]=.25;}}
    geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('color',new THREE.BufferAttribute(cols,3));
    scene.add(new THREE.Points(geo,new THREE.PointsMaterial({size:sz,vertexColors:true,transparent:true,opacity:op,sizeAttenuation:true})));
  }
  layer(14000,555,650,.32,1.05,.88); layer(22000,660,900,1.0,.82,.55); layer(8000,900,1100,1.0,.60,.28);
  for(let s=0;s<4;s++)scene.add(new THREE.Mesh(new THREE.SphereGeometry(585+s*55,12,12),new THREE.MeshBasicMaterial({color:new THREE.Color(.04,.06,.18),transparent:true,opacity:.02,side:THREE.BackSide,depthWrite:false})));
  const l=mkLabel('Nuage de Oort  ·  ~1 milliard de comètes','rgba(130,165,255,.5)',15); l.scale.set(60,7,1); l.position.set(0,840,0); scene.add(l);
  // Light-day ring
  const ldR=540,d2=[];
  for(let i=0;i<=240;i++){const a=(i/240)*Math.PI*2;if(Math.floor(i/4)%2===0)d2.push(new THREE.Vector3(Math.cos(a)*ldR,0,Math.sin(a)*ldR));else if(d2.length>1){scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([...d2]),new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.16})));d2.length=0;}}
  const l2=mkLabel('1 jour-lumière — 173 UA','rgba(255,255,255,.3)',14); l2.scale.set(34,5,1); l2.position.set(ldR*.72,5,-ldR*.72); scene.add(l2);
}

function _buildComets(){
  const cTex=TEXTURES.make(32,128,(ctx,W,H)=>{const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'rgba(220,240,255,0)');g.addColorStop(.1,'rgba(200,225,255,.88)');g.addColorStop(.55,'rgba(150,200,255,.32)');g.addColorStop(1,'rgba(100,170,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);});
  for(let i=0;i<24;i++){
    const pR2=logD(.2+Math.random()*12),aR=460+Math.random()*340,a=(pR2+aR)/2,e=(aR-pR2)/(aR+pR2);
    const cm=new THREE.Mesh(new THREE.SphereGeometry(.22+Math.random()*.2,8,8),new THREE.MeshStandardMaterial({color:0xcce8ff,emissive:0x3366aa,emissiveIntensity:1.3})); scene.add(cm);
    const coma=new THREE.Mesh(new THREE.SphereGeometry(1.6,8,8),new THREE.MeshBasicMaterial({color:0x88ccff,transparent:true,opacity:.1,side:THREE.BackSide,depthWrite:false})); scene.add(coma);
    const dL=10+Math.random()*16;
    const dust=new THREE.Sprite(new THREE.SpriteMaterial({map:cTex,transparent:true,opacity:.78,color:new THREE.Color(.95,.95,.85)})); dust.scale.set(2.5,dL,1); scene.add(dust);
    const ion=new THREE.Sprite(new THREE.SpriteMaterial({map:cTex,transparent:true,opacity:.60,color:new THREE.Color(.4,.65,1)})); ion.scale.set(.8,dL*1.35,1); scene.add(ion);
    COMETS.push({a,e,inc:(Math.random()-.5)*Math.PI,om:Math.random()*Math.PI*2,node:Math.random()*Math.PI*2,phase:Math.random()*Math.PI*2,spd:.00018+Math.random()*.00065,periR:pR2,mesh:cm,coma,dust,ion});
  }
}

function _buildOrbiters(){
  const eR=pR(6371),eD=logD(1);
  // ISS
  const issR=eR*2.5+.55;
  issPO=new THREE.Object3D();scene.add(issPO);issPI=new THREE.Object3D();issPO.add(issPI);
  issMesh=new THREE.Mesh(new THREE.OctahedronGeometry(.18,0),new THREE.MeshStandardMaterial({color:0xddeeff,emissive:0x445566,emissiveIntensity:.5,roughness:.3,metalness:.8}));
  issMesh.position.x=issR;issPI.add(issMesh);
  registerMesh(issMesh,'🛰 ISS','Station Spatiale Internationale\nAlt: ~408 km · 27 600 km/h\nPériode: 92 min · Lancée: 1998\nÉquipage: 7 astronautes');
  {const o=mkOrbit(issR,0x00ffcc,.55);issPO.add(o);planetOrbitLines.push(o);}
  {const l=mkLabel('ISS','rgba(0,255,200,.88)',14);l.scale.set(2.2,.8,1);l.position.set(issR,.4,0);issPI.add(l);}
  // Hubble
  const hubR=eR*2.5+.42;
  hubPO=new THREE.Object3D();scene.add(hubPO);hubPI=new THREE.Object3D();hubPO.add(hubPI);
  hubMesh=new THREE.Group();
  const hm=new THREE.MeshStandardMaterial({color:0xccddff,emissive:0x223355,emissiveIntensity:.6,roughness:.4,metalness:.7});
  hubMesh.add(new THREE.Mesh(new THREE.BoxGeometry(.35,.06,.06),hm)); hubMesh.add(new THREE.Mesh(new THREE.BoxGeometry(.06,.06,.44),hm));
  hubMesh.position.x=hubR;hubPI.add(hubMesh);
  hubMesh.children.forEach(c=>registerMesh(c,'🔭 Hubble','Télescope Spatial Hubble\nAlt: ~540 km · Lancé: 1990\nMiroir: 2.4 m · 1.5M observations'));
  {const o=mkOrbit(hubR,0x44ffee,.5);hubPO.add(o);planetOrbitLines.push(o);}
  {const l=mkLabel('Hubble','rgba(100,220,255,.88)',13);l.scale.set(2,.72,1);l.position.set(hubR,.42,0);hubPI.add(l);}
  // JWST
  L2D=logD(1.010);
  jwstPO=new THREE.Object3D();scene.add(jwstPO);
  jwstH=new THREE.Object3D();jwstH.position.x=L2D;jwstPO.add(jwstH);
  jwstMesh=new THREE.Group();
  const jm=new THREE.MeshStandardMaterial({color:0xffe0a0,emissive:0xaa6600,emissiveIntensity:.7,roughness:.3,metalness:.6});
  jwstMesh.add(new THREE.Mesh(new THREE.BoxGeometry(.42,.02,.24),jm));
  jwstMesh.add(new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,.016,6),new THREE.MeshStandardMaterial({color:0xffd700,emissive:0xaa8800,emissiveIntensity:.85,roughness:.1,metalness:.9})));
  [.28,-.28].forEach(x=>{const p=new THREE.Mesh(new THREE.BoxGeometry(.12,.01,.24),new THREE.MeshStandardMaterial({color:0x334488,roughness:.5}));p.position.x=x;jwstMesh.add(p);});
  jwstMesh.position.x=.35;jwstH.add(jwstMesh);
  jwstMesh.children.forEach(c=>registerMesh(c,'🌌 JWST','James Webb Space Telescope\nPoint L2 · 1.5 M km\nLancé: 2021 · Miroir: 6.5 m'));
  {const pts=[];for(let i=0;i<=100;i++){const a=(i/100)*Math.PI*2;pts.push(new THREE.Vector3(Math.cos(a)*.35,Math.sin(a)*.14,Math.sin(a)*.35));}jwstH.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0xffcc44,transparent:true,opacity:.5})));}
  {const l=mkLabel('JWST','rgba(255,210,80,.9)',13);l.scale.set(1.8,.7,1);l.position.set(.35,.38,0);jwstH.add(l);}
}

function _buildLagrange(){
  const lagPiv=new THREE.Object3D();scene.add(lagPiv);lagPivRef=lagPiv;
  [{id:'L1',r:logD(.990),a:0,col:'#ff8844',info:'L1 · 0.990 UA\nSOHO, DSCOVR'},
   {id:'L2',r:logD(1.010),a:0,col:'#ffdd44',info:'L2 · 1.010 UA\nJWST, Planck'},
   {id:'L3',r:logD(1),a:Math.PI,col:'#ff4488',info:'L3 · instable'},
   {id:'L4',r:logD(1),a:Math.PI/3,col:'#44ff88',info:'L4 · +60° Troie'},
   {id:'L5',r:logD(1),a:-Math.PI/3,col:'#44ff88',info:'L5 · -60° Troie'}
  ].forEach(lp=>{
    const lx=Math.cos(lp.a)*lp.r,lz=Math.sin(lp.a)*lp.r;
    const m=new THREE.Mesh(new THREE.OctahedronGeometry(.22,0),new THREE.MeshBasicMaterial({color:new THREE.Color(lp.col),transparent:true,opacity:.9}));
    m.position.set(lx,0,lz); lagPiv.add(m); registerMesh(m,lp.id,lp.info);
    const l=mkLabel(lp.id,lp.col,16); l.scale.set(1.5,.6,1); l.position.set(lx,.65,lz); lagPiv.add(l);
    lagMs.push({mesh:m,data:lp});
  });
}

// ── ALPHA CENTAURI ─────────────────────────────────────────────
// Tailles réelles: A=1.227 R☉, B=0.865 R☉, Proxima=0.141 R☉
// Rapporté à Soleil=7u → A=8.6u, B=6.1u, Proxima=1.0u
function _buildAlphaCen(){
  acG=new THREE.Group();
  acG.position.set(28000,-500,18000); // dans bras d'Orion près du SS
  scene.add(acG); acG.visible=false;

  // α Cen A — G2V (1.227 R☉)
  const acaR=8.6;
  acaMesh=new THREE.Mesh(new THREE.SphereGeometry(acaR,48,48),new THREE.MeshBasicMaterial({color:0xffee88}));
  acG.add(acaMesh); registerMesh(acaMesh,'α Centauri A (G2V)','Type: G2V · Naine jaune (similaire au Soleil)\nMasse: 1.100 M☉ · Rayon: 1.227 R☉\nLuminosité: 1.519 L☉\nTempérature: 5 790 K\nÂge: ~6.5 milliards d\'années\nDistance: 4.37 années-lumière\nOrbite avec B: période 79.9 ans (e=0.52)');
  // Corona A
  const acaCor=SHADERS.makeCoronaMaterial(); allShaderMats.push(acaCor);
  acG.add(new THREE.Mesh(new THREE.SphereGeometry(acaR*2.0,24,24),acaCor));
  {const l=mkLabel('α Cen A (G2V)','rgba(255,238,120,.90)',13);l.scale.set(160,36,1);l.position.set(0,acaR+9,0);acG.add(l);}

  // α Cen B — K1V (0.865 R☉) orbite autour de A
  // B orbite à ~23 UA en moyenne autour de A (dans le plan de acG)
  acbPiv=new THREE.Object3D(); acG.add(acbPiv);
  const acbR=6.1;
  acbMesh=new THREE.Mesh(new THREE.SphereGeometry(acbR,40,40),new THREE.MeshBasicMaterial({color:0xffaa55}));
  acbMesh.position.x=90; acbPiv.add(acbMesh);
  registerMesh(acbMesh,'α Centauri B (K1V)','Type: K1V · Naine orange\nMasse: 0.907 M☉ · Rayon: 0.865 R☉\nLuminosité: 0.500 L☉\nTempérature: 5 260 K\nOrbite α Cen A: 79.9 ans · séparation 11-36 UA (e=0.52)\nDistance: 4.37 années-lumière');
  const acbCor=SHADERS.makeCoronaMaterial(); allShaderMats.push(acbCor);
  {const cm=new THREE.Mesh(new THREE.SphereGeometry(acbR*1.8,18,18),acbCor);cm.position.x=90;acbPiv.add(cm);}
  {const l=mkLabel('α Cen B (K1V)','rgba(255,185,90,.88)',13);l.scale.set(150,34,1);const ll=l;ll.position.set(0,acbR+8,0);acbMesh.add(ll);}
  // Orbite AB elliptique
  {const pts=[];for(let i=0;i<=100;i++){const a=(i/100)*Math.PI*2;const ea=90,eb=90*Math.sqrt(1-0.52*0.52);pts.push(new THREE.Vector3(Math.cos(a)*ea,Math.sin(a)*10,Math.sin(a)*eb));}
  acG.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0xff6644,transparent:true,opacity:.32})));}

  // Proxima Centauri — M5Ve (0.141 R☉) à 15 000 unités scène
  const proxPos=new THREE.Vector3(13500,800,11200);
  const proxR=1.0;
  proxMesh=new THREE.Mesh(new THREE.SphereGeometry(proxR,16,16),new THREE.MeshBasicMaterial({color:0xff3311}));
  proxMesh.position.copy(proxPos); acG.add(proxMesh);
  registerMesh(proxMesh,'Proxima Centauri (M5Ve)','Type: M5Ve · Naine rouge · Étoile la + proche\nMasse: 0.122 M☉ · Rayon: 0.141 R☉\nLuminosité: 0.00155 L☉\nTempérature: 3 042 K · Âge: ~4.85 Ga\nDistance: 4.243 années-lumière\nÉtoile à éruptions UV intenses\n\nExoplanètes:\n• Proxima b: 1.3 M⊕ · 11.2 j · zone habitable\n• Proxima c: 7 M⊕ · 5.2 ans\n• Proxima d: 0.26 M⊕ · 5.1 j');
  {const g2=new THREE.Mesh(new THREE.SphereGeometry(proxR*4,10,10),new THREE.MeshBasicMaterial({color:0xff2200,transparent:true,opacity:.12,side:THREE.BackSide}));g2.position.copy(proxPos);acG.add(g2);}
  {const l=mkLabel('Proxima Centauri (M5Ve · 4.24 al)','rgba(255,110,60,.88)',13);l.scale.set(300,38,1);l.position.copy(proxPos).add(new THREE.Vector3(0,12,0));acG.add(l);}

  // Proxima b (zone habitable)
  proxbPiv=new THREE.Object3D(); proxbPiv.position.copy(proxPos); acG.add(proxbPiv);
  proxbMesh=new THREE.Mesh(new THREE.SphereGeometry(.85,14,14),new THREE.MeshStandardMaterial({color:0x3355aa,emissive:0x001133,roughness:.8}));
  proxbMesh.position.x=12; proxbPiv.add(proxbMesh);
  proxbPiv.add(mkOrbit(12,0xff6644,.42));
  registerMesh(proxbMesh,'Proxima b','Exoplanète de Proxima Centauri\nMasse min: ~1.3 M⊕\nPériode: 11.2 jours · 0.048 UA\nZone habitable confirmée\nRotation probablement synchrone\nExposée aux éruptions UV');

  // Proxima c
  proxcPiv=new THREE.Object3D(); proxcPiv.position.copy(proxPos); acG.add(proxcPiv);
  proxcMesh=new THREE.Mesh(new THREE.SphereGeometry(1.2,12,12),new THREE.MeshStandardMaterial({color:0x886633,roughness:.7}));
  proxcMesh.position.x=22; proxcPiv.add(proxcMesh);
  proxcPiv.add(mkOrbit(22,0xaa5533,.28));
  registerMesh(proxcMesh,'Proxima c','Exoplanète de Proxima Centauri\nMasse: ~7 M⊕ · Période: 5.2 ans\nFroide · T~38 K · Hors zone habitable');

  {const l=mkLabel('Système α Centauri · Triple · 4.37 al','rgba(255,225,155,.72)',13);l.scale.set(380,46,1);l.position.set(0,44,0);acG.add(l);}
}

// ── SYSTÈMES STELLAIRES ─────────────────────────────────────────
function _buildStellarSystems(){
  stellarSysGroup=new THREE.Group(); galGroup.add(stellarSysGroup);

  const SYSTEMS=[
    {
      name:'TRAPPIST-1', key:'trappist',
      pos:[GC+20000,-3000,35000],
      col:0xff2200, starR:0.9, specType:'M8V · Ultra-cool',
      info:'TRAPPIST-1 · M8V · 39.5 al\nMasse: 0.089 M☉ · Rayon: 0.121 R☉\nTempérature: 2 559 K · Âge: ~7.6 Ga\n\n7 exoplanètes rocheuses dont 3 en zone habitable!',
      exoplanets:[
        {n:'TRAPPIST-1b',r:.85,orb:5.2, period:1.51, col:0xaa6633,info:'Rocheuse · 1.12 R⊕ · 1.51 jours\nTrès chaude · T~400K'},
        {n:'TRAPPIST-1c',r:.82,orb:7.5, period:2.42, col:0xaa7744,info:'Rocheuse · 1.10 R⊕ · 2.42 jours\nJWST: peu d\'atm. CO₂'},
        {n:'TRAPPIST-1d',r:.60,orb:10,  period:4.05, col:0x5577aa,info:'Rocheuse · 0.79 R⊕ · 4.05 jours\nBord interne zone habitable'},
        {n:'TRAPPIST-1e',r:.70,orb:13,  period:6.10, col:0x4466cc,info:'🌟 PRIORITÉ HABITABILITÉ\n0.92 R⊕ · 6.10 jours\nZone habitable centrale\nEau liquide possible'},
        {n:'TRAPPIST-1f',r:.78,orb:17,  period:9.21, col:0x3355bb,info:'Rocheuse · 1.04 R⊕ · 9.21 jours\nZone habitable · Eau possible'},
        {n:'TRAPPIST-1g',r:.86,orb:22,  period:12.35,col:0x336699,info:'Rocheuse · 1.13 R⊕ · 12.35 jours\nBord externe zone habitable'},
        {n:'TRAPPIST-1h',r:.58,orb:28,  period:18.77,col:0x556677,info:'Rocheuse · 0.76 R⊕ · 18.77 jours\nHors zone habitable · Glacée'},
      ]
    },
    {
      name:'Tau Ceti', key:'tauceti',
      pos:[GC-8000,1500,-22000],
      col:0xffdd88, starR:5.5, specType:'G8V · Analogue solaire',
      info:'Tau Ceti · G8V · 11.9 al\nMasse: 0.783 M☉ · Rayon: 0.793 R☉\nTempérature: 5 344 K\nCible SETI historique (Project Ozma 1960)\nDisque de débris 10× Soleil',
      exoplanets:[
        {n:'τ Ceti e',r:1.3,orb:9, period:162, col:0x4477bb,info:'Super-Terre · 1.7 R⊕ · 162 jours\nZone habitable interne · ~3.9 M⊕'},
        {n:'τ Ceti f',r:1.4,orb:13,period:636, col:0x5588cc,info:'Super-Terre · 1.9 R⊕ · 636 jours\nZone habitable externe'},
        {n:'τ Ceti g',r:1.35,orb:6,period:20,  col:0xaa7733,info:'Super-Terre · 1.8 R⊕ · 20 jours\nTrop chaude'},
        {n:'τ Ceti h',r:1.35,orb:4,period:49,  col:0x997733,info:'Super-Terre · 1.8 R⊕ · 49 jours'},
      ]
    },
    {
      name:'Kepler-452', key:'kepler452',
      pos:[GC+180000,5000,-95000],
      col:0xffee99, starR:7.5, specType:'G2V · Quasi-jumeau solaire',
      info:'Kepler-452 · G2V · 1 400 al\nMasse: ~1.04 M☉ · Rayon: 1.11 R☉\nÂge: 6 milliards d\'années\nTempérature: 5 757 K\n"Cousin de la Terre" (NASA)',
      exoplanets:[
        {n:'Kepler-452b',r:2.1,orb:10,period:384.8,col:0x4488bb,info:'🌟 "Cousin de la Terre"\nSuper-Terre · 2.8 R⊕ · 384.8 jours\nZone habitable · ~5 M⊕\nFlux: ~1.1× la Terre\nDécouvert Kepler 2015'},
      ]
    },
    {
      name:'51 Pegasi', key:'51peg',
      pos:[GC+15000,2000,-45000],
      col:0xffee88, starR:6.0, specType:'G2IV · Sous-géante',
      info:'51 Pegasi · G2IV · 50.9 al\nMasse: 1.11 M☉\n1ère exoplanète autour d\'étoile solaire (1995)\nNobel 2019 → Mayor & Queloz',
      exoplanets:[
        {n:'51 Peg b',r:1.9,orb:8,period:4.23,col:0xff8833,info:'1er "Jupiter chaud" (1995)\n~0.47 MJ · 4.23 jours · 0.052 UA\nT~1200K · Nobel Physique 2019'},
      ]
    },
    {
      name:'ε Eridani', key:'eridani',
      pos:[GC-9000,500,-9500],
      col:0xffbb66, starR:5.2, specType:'K2V · Naine orange jeune',
      info:'ε Eridani (Ran) · K2V · 10.5 al\nMasse: 0.820 M☉ · Rayon: 0.735 R☉\nJeune (~0.4-0.8 Ga)\nAnneau de débris multiple\nCible SETI favorite',
      exoplanets:[
        {n:'ε Eri b (Ægir)',r:1.5,orb:12,period:2502,col:0xff8833,info:'Jupiter froid · ~0.78 MJ\nPériode: 6.85 ans · 3.39 UA\nExcentricité 0.70'},
      ]
    },
    {
      name:'Gliese 667C', key:'gliese667',
      pos:[GC-14000,-2500,-22000],
      col:0xff5533, starR:2.2, specType:'M1.5V · Naine rouge (système triple)',
      info:'Gliese 667C · M1.5V · 23.6 al\nMasse: 0.33 M☉\nPartie d\'un système stellaire triple\n3 super-Terres en zone habitable!',
      exoplanets:[
        {n:'Gl 667Cc',r:1.1,orb:7, period:28.1,col:0x4477cc,info:'Zone habitable · 3.8 M⊕ · 28.1 j'},
        {n:'Gl 667Ce',r:1.0,orb:10,period:62.2,col:0x3366bb,info:'Zone habitable ext. · 2.5 M⊕'},
        {n:'Gl 667Cf',r:1.05,orb:5,period:39.0,col:0x4488bb,info:'Zone habitable · 2.7 M⊕'},
      ]
    },
  ];

  SYSTEMS.forEach(sys=>{
    const g=new THREE.Group(); g.position.set(...sys.pos);
    g.userData={systemKey:sys.key, systemName:sys.name};
    stellarSysGroup.add(g);
    // Étoile
    const sm=new THREE.Mesh(new THREE.SphereGeometry(sys.starR,24,24),new THREE.MeshBasicMaterial({color:sys.col}));
    g.add(sm); registerMesh(sm,sys.name,sys.info);
    g.add(new THREE.Mesh(new THREE.SphereGeometry(sys.starR*3.5,12,12),new THREE.MeshBasicMaterial({color:sys.col,transparent:true,opacity:.07,side:THREE.BackSide})));
    const lbl=mkLabel(sys.name,'rgba(255,220,160,.85)',13,512);
    lbl.scale.set(Math.max(150,sys.name.length*12),32,1); lbl.position.set(0,sys.starR+11,0); g.add(lbl);
    // Exoplanètes orbitales
    sys.exoplanets.forEach(ep=>{
      g.add(mkOrbit(ep.orb,0xff6644,.25,60));
      const em=new THREE.Mesh(new THREE.SphereGeometry(ep.r*.38,10,10),new THREE.MeshStandardMaterial({color:ep.col,roughness:.8}));
      em.position.set(ep.orb,0,0); em.userData={orbit:ep.orb,period:ep.period,phase:Math.random()*Math.PI*2};
      g.add(em); registerMesh(em,ep.n,ep.info);
    });
    g.userData.exoplanets=sys.exoplanets;
  });
}

// ── ÉTOILES GÉANTES ───────────────────────────────────────────
function _buildGiantStars(){
  giantStarGroup=new THREE.Group(); galGroup.add(giantStarGroup);

  const GIANTS=[
    {
      key:'betelgeuse', name:'Bételgeuse (α Ori)',
      pos:[GC-35000,2000,-320000],
      starR:420, col:0xff3300, coronaCol:'#ff2200', isRed:true,
      info:'🔴 BÉTELGEUSE — SUPERGÉANTE ROUGE\n\nType: M1-M2 Ia (variable)\nMasse: ~20 M☉ · Rayon: 764–887 R☉\n→ Engloutirait l\'orbite de Jupiter!\nLuminosité: ~100 000 L☉ · T: 3 500 K\nDistance: ~700 al\n\nGrand évanouissement 2019-2020 (-40%)\n→ Éruption massière + refroidissement\n\nDestin: Supernova dans <100 000 ans\nVisible en plein jour depuis la Terre!\nTaches convectives géantes détectées',
      nebR:2200, nebCol:0xff4400, nebN:16000,
      comp:null,
    },
    {
      key:'antares', name:'Antarès (α Sco)',
      pos:[GC-55000,-8000,-248000],
      starR:400, col:0xff2200, coronaCol:'#ff1100', isRed:true,
      info:'🔴 ANTARÈS — CŒUR DU SCORPION\n\nType: M0.5Iab + B2.5V (binaire)\nMasse: ~11-12 M☉ · Rayon: 883 R☉\n→ Engloutirait l\'orbite de Mars!\nLuminosité: ~57 500 L☉ · T: 3 660 K\nDistance: ~550 al\n\nNom: "Anti-Arès" (rival de Mars en rouge)\n\nCompagnon Antarès B (B2.5V):\nSéparation: ~529 UA · Période: ~2 562 ans\nNoyé dans la nébuleuse rouge\n\nDestin: Supernova dans ~10 000-40 000 ans',
      nebR:2000, nebCol:0xff3300, nebN:13000,
      comp:{col:0x8899ff, r:28, dist:800},
    },
    {
      key:'rigel', name:'Rigel (β Ori)',
      pos:[GC-20000,8000,-390000],
      starR:120, col:0xaabbff, coronaCol:'#6688ff', isRed:false,
      info:'💙 RIGEL — SUPERGÉANTE BLEUE D\'ORION\n\nType: B8Ia\nMasse: 17-23 M☉ · Rayon: 78 R☉\nLuminosité: 120 000 L☉ (!)\nTempérature: 11 000-12 000 K\nDistance: ~860 al\n\nL\'une des + lumineuses de la Galaxie\nSi à distance de Sirius: brillerait\ncomme 1/4 de la pleine Lune\n\nSystème multiple: Rigel B + C\nNébuleuse de la Sorcière (IC 2118)\néclairée par Rigel\n\nDestin: Supernova dans ~1 Ma',
      nebR:800, nebCol:0x3355cc, nebN:9000,
      comp:{col:0xddeeff, r:20, dist:500},
    },
    {
      key:'deneb', name:'Déneb (α Cyg)',
      pos:[GC+120000,15000,-180000],
      starR:200, col:0xddeeff, coronaCol:'#aaccff', isRed:false,
      info:'💎 DÉNEB — SUPERGÉANTE BLANCHE\n\nType: A2Ia\nMasse: ~19 M☉ · Rayon: 203 R☉\nLuminosité: ~196 000 L☉\nTempérature: ~8 500 K\nDistance: ~2 600 al\n\nL\'une des + grandes A connues\nSi au centre du SS: engloutirait\nl\'orbite de la Terre!\n\nDeneb, Véga, Altaïr forment\nle "Triangle d\'été"\n\nDestin: Supernova future',
      nebR:1200, nebCol:0x4466cc, nebN:8000,
      comp:null,
    },
    {
      key:'muCep', name:'μ Cephei (Étoile Grenat)',
      pos:[GC+50000,8000,-280000],
      starR:550, col:0xff1100, coronaCol:'#cc0800', isRed:true,
      info:'🍷 μ CEPHEI — HYPERGÉANTE ROUGE\n\nType: M2 Ia\nMasse: ~20 M☉ · Rayon: ~1 650 R☉ (!)\n→ Si au centre du SS: jusqu\'à Saturne!\nLuminosité: ~340 000 L☉\nTempérature: ~3 690 K\nDistance: ~2 400-2 800 al\n\n"Étoile Grenat" de Herschel (1783)\nL\'une des plus grandes étoiles connues\n\nVariation semi-régulière de luminosité\nPertes de masse énormes (vents stellaires)\n\nDestin: Hypernova imminente\n(à l\'échelle cosmique)',
      nebR:2800, nebCol:0xff2200, nebN:18000,
      comp:null,
    },
  ];

  GIANTS.forEach(gd=>{
    const g=new THREE.Group(); g.position.set(...gd.pos);
    g.userData={starKey:gd.key,starR:gd.starR}; giantStarGroup.add(g);

    // Texture de surface
    const starTex=TEXTURES.make(512,256,(ctx,W,H)=>{
      const id=ctx.createImageData(W,H);
      for(let y=0;y<H;y++) for(let x=0;x<W;x++){
        const u=x/W*6,v=y/H*3;
        const n=NOISE.fbm(u,v,7,gd.starR%100);
        const conv=NOISE.warpedFbm(u*.5,v*.5,4,42);
        const i=(y*W+x)*4;
        if(gd.isRed){id.data[i]=Math.min(255,195+n*60+conv*18);id.data[i+1]=Math.min(255,55+n*34+conv*10);id.data[i+2]=Math.min(255,8+n*10);
        }else{id.data[i]=Math.min(255,130+n*45);id.data[i+1]=Math.min(255,158+n*42);id.data[i+2]=Math.min(255,230+n*25);}
        id.data[i+3]=255;
      }
      ctx.putImageData(id,0,0);
      // Limb darkening
      const cxL=W/2,cyL=H/2,grd=ctx.createRadialGradient(cxL,cyL,W*.06,cxL,cyL,W*.48);
      grd.addColorStop(0,'rgba(0,0,0,0)');grd.addColorStop(.72,'rgba(0,0,0,0)');grd.addColorStop(1,'rgba(0,0,0,.58)');
      ctx.fillStyle=grd;ctx.fillRect(0,0,W,H);
    });

    const sm=new THREE.Mesh(new THREE.SphereGeometry(gd.starR,72,72),new THREE.MeshStandardMaterial({map:starTex,emissive:new THREE.Color(gd.col).multiplyScalar(.12),emissiveIntensity:1,roughness:.9,metalness:0}));
    g.add(sm); registerMesh(sm,gd.name,gd.info);
    g.add(new THREE.PointLight(gd.col,3.5,gd.starR*35,1.4));

    // Atmosphère
    const corMat=SHADERS.makeAtmosMaterial(gd.coronaCol,new THREE.Vector3(0,0,1),2.0,2.5); allShaderMats.push(corMat);
    g.add(new THREE.Mesh(new THREE.SphereGeometry(gd.starR*1.28,32,32),corMat));
    [1.65,2.3,3.8].forEach((m,i)=>g.add(new THREE.Mesh(new THREE.SphereGeometry(gd.starR*m,16,16),new THREE.MeshBasicMaterial({color:gd.col,transparent:true,opacity:[.14,.065,.028][i],side:THREE.BackSide,depthWrite:false}))));

    // Nébuleuse / vents stellaires
    {
      const nGeo=new THREE.BufferGeometry(),nPos=new Float32Array(gd.nebN*3),nCols=new Float32Array(gd.nebN*3);
      const nr=(gd.nebCol>>16)/255,ng=((gd.nebCol>>8)&0xff)/255,nb=(gd.nebCol&0xff)/255;
      for(let i=0;i<gd.nebN;i++){
        const ph2=Math.acos(2*Math.random()-1),th2=Math.random()*Math.PI*2;
        const rad=gd.starR*1.9+Math.random()*(gd.nebR-gd.starR*1.9);
        const fil=.62+.38*Math.abs(Math.sin(th2*3+ph2*2));
        nPos[i*3]=Math.sin(ph2)*Math.cos(th2)*rad*fil;nPos[i*3+1]=Math.sin(ph2)*Math.sin(th2)*rad*.88;nPos[i*3+2]=Math.cos(ph2)*rad*fil;
        const b2=.28+Math.random()*.48*(1-rad/gd.nebR);nCols[i*3]=nr*b2;nCols[i*3+1]=ng*b2;nCols[i*3+2]=nb*b2;
      }
      nGeo.setAttribute('position',new THREE.BufferAttribute(nPos,3)); nGeo.setAttribute('color',new THREE.BufferAttribute(nCols,3));
      g.add(new THREE.Points(nGeo,new THREE.PointsMaterial({size:gd.nebR*.044,vertexColors:true,transparent:true,opacity:.50,sizeAttenuation:true,depthWrite:false,blending:THREE.AdditiveBlending})));
      g.add(new THREE.Mesh(new THREE.SphereGeometry(gd.nebR*.92,14,14),new THREE.MeshBasicMaterial({color:gd.col,transparent:true,opacity:.032,side:THREE.DoubleSide,depthWrite:false})));
    }

    // Compagnon binaire
    if(gd.comp){
      const cm=new THREE.Mesh(new THREE.SphereGeometry(gd.comp.r,20,20),new THREE.MeshBasicMaterial({color:gd.comp.col}));
      cm.position.x=gd.comp.dist; g.add(cm);
      const cg=new THREE.Mesh(new THREE.SphereGeometry(gd.comp.r*2.5,12,12),new THREE.MeshBasicMaterial({color:gd.comp.col,transparent:true,opacity:.08,side:THREE.BackSide}));
      cg.position.x=gd.comp.dist; g.add(cg);
    }

    const lbl2=mkLabel(gd.name,'rgba(255,220,180,.88)',14,512);
    lbl2.scale.set(gd.starR*3.8,gd.starR*.48,1); lbl2.position.set(0,gd.starR*1.55,0); g.add(lbl2);
  });
}

// ── NÉBULEUSES ─────────────────────────────────────────────────
function _buildNebulae(){
  nebulaGroup=new THREE.Group(); galGroup.add(nebulaGroup);

  const NEBULAE=[
    {
      name:'Piliers de la Création (M16)',
      key:'pillars',
      pos:[GC-200000,-8000,-650000],
      type:'émission', cols:[0xff3366,0xff6633,0x4488ff],
      radius:45000, N:80000,
      info:'🌟 PILIERS DE LA CRÉATION\n\nNébuleuse de l\'Aigle (M16) · IC 4703\nDistance: 6 500-7 000 al\nConstellation: Serpent (Serpens)\n\nFormation d\'étoiles active:\n• 3 colonnes de gaz et poussière\n• H: 5 al · L: 3 al · P: 0.5 al\n• Régions HII éclairées par NGC 6611\n• Nouveaux-nés stellaires (EGGs)\n\nPhotographié HST 1995 (révolution!)\nRe-photographié JWST 2022 (infrarouge)\n\nErosion par rayonnement UV\n→ Disparaîtront dans ~3 Ma',
      shape:'pillars',
    },
    {
      name:'Nébuleuse du Crabe (M1)',
      key:'crab',
      pos:[GC+80000,12000,-480000],
      type:'remnant', cols:[0x4488ff,0xff4422,0xffaa22],
      radius:12000, N:50000,
      info:'💥 NÉBULEUSE DU CRABE — M1\n\nReste de supernova SN 1054\nObservée par les Chinois le 4 juillet 1054\nBrillait comme Vénus pendant 23 jours!\n\nDistance: ~6 500 al\nDimensions: 11 × 7 al\nVitesse d\'expansion: ~1 500 km/s\n\nPulsar central:\n• Étoile à neutrons: 28-30 km Ø\n• Rotation: 30.2 fois/seconde!\n• Champ magnétique: 10¹² Gauss\n• Émet en radio, X, gamma\n\nL\'une des sources radio les + brillantes du ciel\nRéférence d\'étalonnage pour les télescopes X',
      shape:'explosion',
    },
    {
      name:'Nébuleuse d\'Orion (M42)',
      key:'orion',
      pos:[GC-50000,-15000,-460000],
      type:'émission', cols:[0xff3388,0x4499ff,0xffcc44],
      radius:35000, N:70000,
      info:'✨ NÉBULEUSE D\'ORION — M42\n\nNébuleuse de formation d\'étoiles\nDistance: ~1 344 al\nVisible à l\'œil nu (épée d\'Orion)\n\nDimensions: ~40 al × 30 al\nTrapèze: 4 étoiles O/B ultra-chaudes\n→ Ionisent la nébuleuse (région HII)\n\nFormation d\'étoiles active:\n• Disques protoplanétaires (proplyds)\n• Plusieurs centaines de jeunes étoiles\n• Étoiles T Tauri (stade pré-main séquence)\n\nParties de la nébuleuse d\'Orion:\n• M42 (grande nébuleuse)\n• M43 (De Mairan)\n• Boucle de Barnard (complète)',
      shape:'cloud',
    },
    {
      name:'Nébuleuse de la Rosette (NGC 2244)',
      key:'rosette',
      pos:[GC+100000,5000,-380000],
      type:'émission', cols:[0xff2244,0xff6644,0x3344cc],
      radius:28000, N:55000,
      info:'🌹 NÉBULEUSE DE LA ROSETTE\n\nNGC 2244 / 2237-2246\nDistance: ~5 200 al\nConstellation: Licorne (Monoceros)\n\nDimensions: ~130 al de diamètre\nMasse: ~10 000 M☉\nBelle forme annulaire caractéristique\n\nAmas stellaire central NGC 2244:\n• Étoiles O/B jeunes et chaudes\n• Vents stellaires crée cavité centrale\n• Ionisent le gaz environnant\n\nRégion de formation d\'étoiles active\nGlobules de Bok présents\n(futures étoiles en formation)',
      shape:'ring',
    },
    {
      name:'Nébuleuse Tête de Cheval (IC 434)',
      key:'horsehead',
      pos:[GC-55000,5000,-470000],
      type:'sombre', cols:[0x220011,0x441122,0x3322aa],
      radius:8000, N:25000,
      info:'🐴 NÉBULEUSE TÊTE DE CHEVAL\n\nIC 434 / Barnard 33\nDistance: ~1 375 al (près de la Ceinture d\'Orion)\nConstellation: Orion\n\nNébuleuse sombre projetée sur\nla nébuleuse d\'émission IC 434 (rouge)\n\nDimensions: ~4 al de hauteur\nSilhouette iconique en tête de cheval\n\nFormation d\'étoiles en cours:\n• Colonnes de gaz et poussière\n• Érosion lente par rayonnement UV\n• Durera encore ~5 millions d\'années\n\nDifficile à observer visuellement\n→ Mieux en infrarouge (JWST)',
      shape:'horse',
    },
    {
      name:'Nébuleuse du Voile (NGC 6960)',
      key:'veil',
      pos:[GC+95000,18000,-220000],
      type:'remnant', cols:[0x4488ff,0x88ffcc,0xffaa44],
      radius:30000, N:45000,
      info:'💫 NÉBULEUSE DU VOILE\n\nCygnus Loop · NGC 6960/6992\nDistance: ~2 400 al · Constellation: Cygne\n\nReste de supernova vieille de\n~10 000-20 000 ans\nÉtoile progénitrice: ~20 M☉\n\nDimensions: ~130 al de diamètre\nOndes de choc se propageant\nà ~170 km/s dans le milieu interstellaire\n\nStructure filamenteuse exquise:\n• Dentelles orientale et occidentale\n• Couleurs: O[III] bleu, Hα rouge\n• Très bien résolu avec filtres\n\nL\'un des restes de SN les plus spectaculaires',
      shape:'veil',
    },
    {
      name:'Nébuleuse de la Lyre (M57)',
      key:'ring',
      pos:[GC+35000,8000,-150000],
      type:'planétaire', cols:[0x4499ff,0x55ffcc,0xffcc44],
      radius:3000, N:20000,
      info:'💍 NÉBULEUSE DE LA LYRE — M57\n\nNébuleuse planétaire\nDistance: ~2 000 al · Constellation: Lyre\n\nNaine blanche centrale:\n• Température: ~120 000 K\n• Magnitude: +14.8 (très faible)\n• Rayon: ~0.015 R☉\n\nGaz éjecté à ~20-30 km/s\nDimensions: ~2.5 × 2 al\nÂge: ~6 900 ans\n\nMagnifique anneau coloré:\n• Bleu-vert centre: O[III]\n• Rouge extérieur: Hα\n\nL\'une des nébuleuses planétaires\nles plus photographiées du ciel',
      shape:'torus',
    },
  ];

  NEBULAE.forEach(neb=>{
    const g=new THREE.Group(); g.position.set(...neb.pos);
    g.userData={nebulaKey:neb.key};
    nebulaGroup.add(g);

    const nGeo=new THREE.BufferGeometry();
    const nPos=new Float32Array(neb.N*3), nCols=new Float32Array(neb.N*3);

    for(let i=0;i<neb.N;i++){
      let x2,y2,z2,colIdx;

      if(neb.shape==='pillars'){
        // 3 colonnes verticales
        const col2=Math.floor(Math.random()*3);
        const cx=[0,-neb.radius*.35,neb.radius*.35][col2];
        const pilH=neb.radius*(0.5+Math.random()*.5);
        const pilR=neb.radius*.08*(1-Math.random()*.3);
        const ang=Math.random()*Math.PI*2;
        x2=cx+Math.cos(ang)*pilR*Math.random();
        y2=-neb.radius*.2+Math.random()*pilH;
        z2=Math.sin(ang)*pilR*Math.random();
        colIdx=col2%neb.cols.length;
      } else if(neb.shape==='explosion'){
        // Forme d'explosion filamenteuse
        const ph2=Math.acos(2*Math.random()-1),th2=Math.random()*Math.PI*2;
        const r=neb.radius*(.3+Math.random()*.7);
        const fil=.7+.3*Math.abs(Math.sin(th2*5+ph2*3));
        x2=Math.sin(ph2)*Math.cos(th2)*r*fil;
        y2=Math.sin(ph2)*Math.sin(th2)*r*.7;
        z2=Math.cos(ph2)*r*fil;
        colIdx=Math.floor(Math.random()*neb.cols.length);
      } else if(neb.shape==='ring'){
        // Forme annulaire
        const outerR=neb.radius,innerR=neb.radius*.35;
        const r=innerR+Math.random()*(outerR-innerR);
        const a=Math.random()*Math.PI*2;
        x2=Math.cos(a)*r; y2=(Math.random()-.5)*neb.radius*.25; z2=Math.sin(a)*r;
        colIdx=Math.floor(Math.random()*neb.cols.length);
      } else if(neb.shape==='torus'){
        const R=neb.radius*.6,r=neb.radius*.25;
        const a=Math.random()*Math.PI*2,b=Math.random()*Math.PI*2;
        x2=(R+r*Math.cos(b))*Math.cos(a); y2=r*Math.sin(b); z2=(R+r*Math.cos(b))*Math.sin(a);
        colIdx=Math.floor(a/(Math.PI*2)*neb.cols.length)%neb.cols.length;
      } else {
        // Cloud default
        const ph2=Math.acos(2*Math.random()-1),th2=Math.random()*Math.PI*2;
        const r=neb.radius*(Math.random()*.85+.15);
        const turbX=(Math.random()-.5)*r*.4, turbZ=(Math.random()-.5)*r*.4;
        x2=Math.sin(ph2)*Math.cos(th2)*r+turbX;
        y2=Math.sin(ph2)*Math.sin(th2)*r*.6;
        z2=Math.cos(ph2)*r+turbZ;
        colIdx=Math.floor(Math.random()*neb.cols.length);
      }

      nPos[i*3]=x2; nPos[i*3+1]=y2; nPos[i*3+2]=z2;
      const c2=neb.cols[colIdx];
      const br=.25+Math.random()*.6;
      nCols[i*3]=((c2>>16)/255)*br; nCols[i*3+1]=(((c2>>8)&0xff)/255)*br; nCols[i*3+2]=((c2&0xff)/255)*br;
    }
    nGeo.setAttribute('position',new THREE.BufferAttribute(nPos,3));
    nGeo.setAttribute('color',   new THREE.BufferAttribute(nCols,3));

    const ptSize=neb.radius*({pillars:.055,explosion:.08,ring:.062,torus:.12,cloud:.072,veil:.065,horse:.065,sombre:.05}[neb.shape]||.06);
    g.add(new THREE.Points(nGeo,new THREE.PointsMaterial({size:ptSize,vertexColors:true,transparent:true,opacity:.58,sizeAttenuation:true,depthWrite:false,blending:THREE.AdditiveBlending})));

    // Halo diffus
    if(neb.type!=='sombre'){
      const halo=new THREE.Mesh(new THREE.SphereGeometry(neb.radius*.9,16,16),new THREE.MeshBasicMaterial({color:neb.cols[0],transparent:true,opacity:.025,side:THREE.DoubleSide,depthWrite:false}));
      g.add(halo);
    }

    // Étoile centrale pour restes de supernova + nébuleuses planétaires
    if(neb.type==='remnant'||neb.type==='planétaire'){
      const cstar=new THREE.Mesh(new THREE.SphereGeometry(neb.radius*.02,8,8),new THREE.MeshBasicMaterial({color:0xffffff}));
      g.add(cstar); registerMesh(cstar,neb.name+' (étoile centrale)',neb.info);
      g.add(new THREE.Mesh(new THREE.SphereGeometry(neb.radius*.06,8,8),new THREE.MeshBasicMaterial({color:0xaaddff,transparent:true,opacity:.15,side:THREE.BackSide})));
    }

    const lbl=mkLabel(neb.name,'rgba(200,220,255,.75)',13,600);
    lbl.scale.set(neb.radius*2.2,neb.radius*.25,1); lbl.position.set(0,neb.radius*1.1,0); g.add(lbl);
    registerMesh(new THREE.Mesh(new THREE.SphereGeometry(neb.radius*.15,6,6),new THREE.MeshBasicMaterial({visible:false})),neb.name,neb.info);
    g.children[g.children.length-1].position.set(0,0,0); g.add(g.children[g.children.length-1]);
  });
}

// ── QUASARS / PULSARS / ÉTOILES À NEUTRONS ────────────────────
function _buildQuasars(){
  quasarGroup=new THREE.Group(); galGroup.add(quasarGroup);

  const OBJECTS=[
    {
      name:'3C 273 — Quasar',
      pos:[GC+8000000,500000,-12000000], // très lointain (2.4 Gal)
      col:0xffffff, r:5000, type:'quasar',
      info:'⚡ 3C 273 — QUASAR\n\nLe quasar le plus brillant du ciel\nDistance: 2.44 milliards d\'années-lumière\nRedshift: z = 0.158\n\nTrou noir central: ~886 millions M☉\nLuminosité: ~4×10¹² L☉\n→ 4 000 milliards de fois le Soleil!\n\nJet relativiste: 200 000 al de long\nVisible à la vitesse de ~0.8c\n\nDécouvert 1963 · 1er quasar identifié\n\nQSO = Quasi-Stellar Object\n→ Noyau Actif de Galaxie (AGN)\n→ Matière tombant sur TN supermassif',
    },
    {
      name:'Pulsar du Crabe (PSR B0531+21)',
      pos:[GC+80000,12000,-480000], // Centre nébuleuse du Crabe
      col:0x88aaff, r:100, type:'pulsar',
      info:'💫 PULSAR DU CRABE\nPSR B0531+21\n\nÉtoile à neutrons issue de SN 1054\nDistance: ~6 500 al\n\nCaractéristiques:\n• Diamètre: ~28-30 km\n• Masse: ~1.4 M☉ dans 30 km!\n• Rotation: 30.2 tours/seconde\n• Densité: ~5×10¹⁷ kg/m³\n  → 1 cm³ = 1 milliard de tonnes\n• Champ magnétique: 8×10¹² Gauss\n  → Le + puissant de l\'Univers\n\nÉmet des impulsions régulières en:\nRadio, optique, X, gamma\n\nRalentit de 38 nanosecondes/jour',
    },
    {
      name:'SGR 1806-20 — Magnétar',
      pos:[GC+2000,-500,12000], // Proche du centre galactique
      col:0xff44ff, r:80, type:'magnetar',
      info:'🧲 SGR 1806-20 — MAGNÉTAR\n\nÉtoile à neutrons à champ magnétique\nextravagant\nDistance: ~50 000 al (près du GC)\n\nChamp magnétique: ~10¹⁵ Gauss\n→ Milliards de fois + fort qu\'un pulsar!\n→ À 1 000 km: désintégrerait les atomes\n→ À 160 000 km: effacerait toutes\n   les cartes de crédit sur Terre!\n\nFlare géant du 27 décembre 2004:\n→ Énergie: 2×10⁴⁶ J en 0.2 secondes\n→ Ionisa partiellement la haute atm.\nterrestre depuis 50 000 al!\n\nL\'objet le + magnétique connu',
    },
    {
      name:'Cygnus X-1 — Binaire X',
      pos:[GC+95000,15000,-220000],
      col:0x4488ff, r:150, type:'xrb',
      info:'☢️ CYGNUS X-1 — BINAIRE X\n\n1ère preuve solide d\'un trou noir (1972)\nDistance: ~6 070 al · Constellation: Cygne\n\nTrou noir: ~21 M☉\nÉtoile compagnon HDE 226868: O9.7Iab\n→ Supergéante bleue · 40 M☉\n\nPériode orbitale: 5.6 jours\nSéparation: ~0.2 UA\n\nDisque d\'accrétion:\n→ T ~ 10⁷ K (rayons X!)\n→ Luminosité: 2.5×10³⁷ erg/s\n→ Jet relativiste détecté\n\nStephen Hawking avait parié\nque ce n\'était PAS un TN... il a perdu!',
    },
  ];

  OBJECTS.forEach(obj=>{
    const g=new THREE.Group(); g.position.set(...obj.pos); quasarGroup.add(g);

    if(obj.type==='quasar'){
      // Quasar: point très brillant + jet
      const qm=new THREE.Mesh(new THREE.SphereGeometry(obj.r,12,12),new THREE.MeshBasicMaterial({color:0xffffff}));
      g.add(qm); registerMesh(qm,obj.name,obj.info);
      // Halo multiple
      [2,4,8].forEach((m,i)=>g.add(new THREE.Mesh(new THREE.SphereGeometry(obj.r*m,8,8),new THREE.MeshBasicMaterial({color:0xaaddff,transparent:true,opacity:[.2,.1,.04][i],side:THREE.BackSide,depthWrite:false}))));
      // Jet bipolaire
      [-1,1].forEach(dir=>{
        const pts=[new THREE.Vector3(0,0,0),new THREE.Vector3(0,dir*obj.r*50,0)];
        g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0x44aaff,transparent:true,opacity:.8})));
      });

    } else if(obj.type==='pulsar'){
      const pm=new THREE.Mesh(new THREE.SphereGeometry(obj.r,12,12),new THREE.MeshBasicMaterial({color:0x88aaff}));
      g.add(pm); registerMesh(pm,obj.name,obj.info);
      // Cônes de radiation (faisceaux)
      [-1,1].forEach(dir=>{
        const cGeo=new THREE.ConeGeometry(obj.r*3,obj.r*8,8);
        const cm=new THREE.Mesh(cGeo,new THREE.MeshBasicMaterial({color:0x88aaff,transparent:true,opacity:.35,wireframe:false}));
        cm.position.y=dir*obj.r*4; cm.rotation.z=dir>0?0:Math.PI; g.add(cm);
      });
      g.add(new THREE.Mesh(new THREE.SphereGeometry(obj.r*2.5,8,8),new THREE.MeshBasicMaterial({color:0x4466ff,transparent:true,opacity:.15,side:THREE.BackSide})));

    } else if(obj.type==='magnetar'){
      const mm=new THREE.Mesh(new THREE.SphereGeometry(obj.r,12,12),new THREE.MeshBasicMaterial({color:0xff44ff}));
      g.add(mm); registerMesh(mm,obj.name,obj.info);
      // Champ magnétique visualisé
      for(let fi=0;fi<8;fi++){
        const a=fi/8*Math.PI*2;
        const pts=[];for(let j=0;j<=30;j++){const t=j/30*Math.PI;pts.push(new THREE.Vector3(Math.sin(t)*Math.cos(a)*obj.r*5*Math.sin(t),Math.cos(t)*obj.r*8,Math.sin(t)*Math.sin(a)*obj.r*5*Math.sin(t)));}
        g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0xff44ff,transparent:true,opacity:.4})));
      }
      g.add(new THREE.Mesh(new THREE.SphereGeometry(obj.r*3,8,8),new THREE.MeshBasicMaterial({color:0xff44ff,transparent:true,opacity:.12,side:THREE.BackSide})));

    } else if(obj.type==='xrb'){
      const xm=new THREE.Mesh(new THREE.SphereGeometry(obj.r,12,12),new THREE.MeshBasicMaterial({color:0x000000}));
      g.add(xm); registerMesh(xm,obj.name,obj.info);
      // Disque d'accrétion
      const disk=SHADERS.makeAccretionDisk(obj.r*1.2,obj.r*4);
      disk.rotation.x=Math.PI/2; g.add(disk);
      // Étoile compagnon
      const comp=new THREE.Mesh(new THREE.SphereGeometry(obj.r*1.8,16,16),new THREE.MeshBasicMaterial({color:0x88bbff}));
      comp.position.x=obj.r*8; g.add(comp);
      g.add(new THREE.Mesh(new THREE.SphereGeometry(obj.r*.8,8,8),new THREE.MeshBasicMaterial({color:0x4466ff,transparent:true,opacity:.2,side:THREE.BackSide})));
    }

    const lbl=mkLabel(obj.name,'rgba(200,220,255,.80)',13,512);
    lbl.scale.set(obj.r*18,obj.r*2.2,1); lbl.position.set(0,obj.r*6,0); g.add(lbl);
  });
}

// ── ÉTOILES VOISINES ──────────────────────────────────────────
function _buildNearbyStars(){
  STARDATA.NEARBY.forEach(s=>{
    const [x,y,z]=STARDATA.radecToXYZ(s.ra,s.dec,s.dist*1200);
    const col=STARDATA.specToColor(s.spec);
    const baseR=s.dist<6?9:s.dist<20?7:5;
    const sm=new THREE.Mesh(new THREE.SphereGeometry(baseR,14,14),new THREE.MeshBasicMaterial({color:new THREE.Color(...col)}));
    sm.position.set(x,y,z); nearbyGroup.add(sm);
    registerMesh(sm,s.name,s.desc||'');
    const lbl=mkLabel(s.name,`rgba(${Math.round(col[0]*255)},${Math.round(col[1]*255)},${Math.round(col[2]*255)},0.85)`,13);
    lbl.scale.set(150,34,1); lbl.position.set(x,y+baseR+9,z); nearbyGroup.add(lbl);
  });
}

// ═══════════════════════════════════════════════════════════════
// FOCUS
// ═══════════════════════════════════════════════════════════════
function focusOn(key){
  curTarget=key;
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.target===key));
  panGoal.set(0,0,0); AUDIO.resume(); AUDIO.playNavClick();

  if(key==='free'){camGoal.set(0,0,0);radiusGoal=220;}
  else if(key==='sun'){camGoal.set(0,0,0);radiusGoal=22;}
  else if(PM[key]){PM[key].tiltNode.getWorldPosition(camGoal);radiusGoal=PM[key].r*35+12;}
  else if(key==='iss'&&issMesh){issMesh.getWorldPosition(camGoal);radiusGoal=3;}
  else if(key==='hubble'&&hubMesh){const wp=new THREE.Vector3();hubMesh.children[0]?.getWorldPosition(wp);camGoal.copy(wp);radiusGoal=2.5;}
  else if(key==='jwst'&&jwstMesh){const wp=new THREE.Vector3();jwstMesh.children[0]?.getWorldPosition(wp);camGoal.copy(wp);radiusGoal=3.5;}
  else if(key==='milkyway'){camGoal.set(GC,0,0);radiusGoal=5500000;phi=1.0;theta=0.5;}
  else if(key==='sgra'){camGoal.set(GC,0,0);radiusGoal=BHR*22;phi=1.22;theta=0.85;}
  else if(key==='alphacentauri'&&acG){camGoal.copy(acG.position);radiusGoal=600;phi=1.1;theta=0.4;}
  else if(key==='andromeda'&&andG){camGoal.copy(andG.position);radiusGoal=AND_R*3.2;phi=1.05;theta=0.5;}
  else if(key==='localgroup'){camGoal.set(AND_DIST*0.3,AND_DIST*0.1,0);radiusGoal=AND_DIST*1.5;}
  // Lunes
  else if(key.startsWith('moon-')){
    const moonNames={lune:'Lune',io:'Io',europe:'Europe',ganymede:'Ganymède',callisto:'Callisto',titan:'Titan',encelade:'Encelade',triton:'Triton'};
    const targetName=moonNames[key.replace('moon-','')];
    if(targetName){
      for(const mp of moonPivotRegistry){
        if(mp.data.name===targetName){
          const wp=new THREE.Vector3(); mp.mesh.getWorldPosition(wp);
          camGoal.copy(wp); radiusGoal=Math.max(0.8,pR(mp.data.km)*6)+2; break;
        }
      }
    }
  }
  // Systèmes stellaires
  else if(['trappist','tauceti','kepler452','51peg','eridani','gliese667'].includes(key)){
    if(stellarSysGroup){
      const sg=stellarSysGroup.children.find(c=>c.userData.systemKey===key);
      if(sg){const wp=new THREE.Vector3();sg.getWorldPosition(wp);camGoal.copy(wp);radiusGoal=80;}
    }
  }
  // Étoiles géantes
  else if(['betelgeuse','antares','rigel','deneb','muCep'].includes(key)){
    if(giantStarGroup){
      const sg=giantStarGroup.children.find(c=>c.userData.starKey===key);
      if(sg){const wp=new THREE.Vector3();sg.getWorldPosition(wp);camGoal.copy(wp);radiusGoal=sg.userData.starR*22;}
    }
  }
  // Nébuleuses
  else if(['pillars','crab','orion','rosette','horsehead','veil','ring'].includes(key)){
    if(nebulaGroup){
      const ng=nebulaGroup.children.find(c=>c.userData.nebulaKey===key);
      if(ng){const wp=new THREE.Vector3();ng.getWorldPosition(wp);camGoal.copy(wp);
        const pts=ng.children.find(c=>c instanceof THREE.Points);
        radiusGoal=pts?50000:80000;}
    }
  }
  else if(key==='quasar3c273'&&quasarGroup){
    const qg=quasarGroup.children[0];if(qg){const wp=new THREE.Vector3();qg.getWorldPosition(wp);camGoal.copy(wp);radiusGoal=80000;}
  }
  else if(key==='pulsarcrab'&&quasarGroup){
    const qg=quasarGroup.children[1];if(qg){const wp=new THREE.Vector3();qg.getWorldPosition(wp);camGoal.copy(wp);radiusGoal=2000;}
  }
  else if(key==='magnetar'&&quasarGroup){
    const qg=quasarGroup.children[2];if(qg){const wp=new THREE.Vector3();qg.getWorldPosition(wp);camGoal.copy(wp);radiusGoal=1500;}
  }
  else if(key==='cygnusx1'&&quasarGroup){
    const qg=quasarGroup.children[3];if(qg){const wp=new THREE.Vector3();qg.getWorldPosition(wp);camGoal.copy(wp);radiusGoal=3000;}
  }
  else if(key==='barnard'||key==='sirius'){
    const nm=key==='barnard'?'Barnard':'Sirius A';
    const s=STARDATA.NEARBY.find(n=>n.name.includes(nm));
    if(s){const[x,y,z]=STARDATA.radecToXYZ(s.ra,s.dec,s.dist*1200);camGoal.set(x,y,z);radiusGoal=120;}
  }
}

// ═══════════════════════════════════════════════════════════════
// UI
// ═══════════════════════════════════════════════════════════════
function _setupUI(){
  document.querySelectorAll('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>focusOn(btn.dataset.target)));
  document.getElementById('btn-faster').onclick=()=>{speed=Math.min(speed*2,1024);document.getElementById('speed-val').textContent=`×${speed}`;AUDIO.resume();};
  document.getElementById('btn-slower').onclick=()=>{speed=Math.max(speed/2,.125);document.getElementById('speed-val').textContent=`×${speed}`;AUDIO.resume();};
  document.getElementById('btn-reset').onclick=()=>{speed=1;document.getElementById('speed-val').textContent='×1';focusOn('free');};
  document.getElementById('btn-orbits').onclick=()=>{
    orbPlanetsVis=!orbPlanetsVis; orbMoonsVis=orbPlanetsVis;
    planetOrbitLines.forEach(l=>l.visible=orbPlanetsVis);
    moonOrbitLines.forEach(l=>l.visible=orbMoonsVis);
    document.getElementById('btn-orbits').classList.toggle('active',!orbPlanetsVis);
  };
  document.getElementById('btn-moons-orb').onclick=()=>{
    orbMoonsVis=!orbMoonsVis;
    moonOrbitLines.forEach(l=>l.visible=orbMoonsVis);
    document.getElementById('btn-moons-orb').classList.toggle('active',!orbMoonsVis);
  };
  document.getElementById('btn-labels').onclick=()=>{lblVis=!lblVis;Object.values(PM).forEach(p=>p.lbl&&(p.lbl.visible=lblVis));document.getElementById('btn-labels').classList.toggle('active',!lblVis);};

  // Raycasting
  const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();
  function raycast(cx,cy){
    mouse.x=(cx/window.innerWidth)*2-1; mouse.y=-(cy/window.innerHeight)*2+1;
    ray.setFromCamera(mouse,camera);
    const hits=ray.intersectObjects(clickables,false);
    if(!hits.length){document.getElementById('info').classList.remove('show');return;}
    const obj=hits[0].object;
    if(obj.userData?.name){
      document.getElementById('info-name').textContent=obj.userData.name;
      document.getElementById('info-body').innerHTML=(obj.userData.info||'').replace(/\n/g,'<br>');
      document.getElementById('info').classList.add('show');
    }
  }
  renderer.domElement.addEventListener('click',e=>raycast(e.clientX,e.clientY));
  renderer.domElement.addEventListener('touchend',e=>{if(e.changedTouches.length===1&&!isDrag)raycast(e.changedTouches[0].clientX,e.changedTouches[0].clientY);});
}

function doubleTap(cx,cy){
  const r2=new THREE.Raycaster(),m2=new THREE.Vector2();
  m2.x=(cx/window.innerWidth)*2-1;m2.y=-(cy/window.innerHeight)*2+1;
  r2.setFromCamera(m2,camera);
  const pMs=PLANETS_DATA.map(p=>PM[p.id]?.mesh).filter(Boolean);
  const hits=r2.intersectObjects(pMs,false);
  if(hits.length){const idx=pMs.indexOf(hits[0].object);if(idx>=0)focusOn(PLANETS_DATA[idx].id);}
}

// ═══════════════════════════════════════════════════════════════
// SCALE LABEL
// ═══════════════════════════════════════════════════════════════
function scLabel(r){
  if(r<6)return'🔭 Orbite terrestre basse';if(r<30)return'🌍 Proche de la Terre';
  if(r<100)return'☀️ Système Solaire intérieur';if(r<380)return'🪐 Système Solaire extérieur';
  if(r<2200)return'❄️ Ceinture de Kuiper';if(r<22000)return'☄️ Nuage de Oort';
  if(r<160000)return'⭐ Voisinage solaire';if(r<1400000)return'🌌 Voie Lactée — Bras d\'Orion';
  if(r<6500000)return'🌀 Voie Lactée complète';if(r<20000000)return'🌠 Groupe Local';
  return'🔭 Univers local observable';
}

// ═══════════════════════════════════════════════════════════════
// ANIMATION
// ═══════════════════════════════════════════════════════════════
function animate(){
  requestAnimationFrame(animate);
  T+=0.016*speed;
  const tu=T*0.5;

  allShaderMats.forEach(m=>{if(m.uniforms?.uTime)m.uniforms.uTime.value=tu;});
  if(accDisk?.material?.uniforms?.uTime)accDisk.material.uniforms.uTime.value=tu;
  if(window._sunMesh)window._sunMesh.rotation.y=T*0.018;
  if(window._coronaMat?.uniforms?.uTime)window._coronaMat.uniforms.uTime.value=tu;

  // Planètes + lunes
  for(const pd of PLANETS_DATA){
    const pm=PM[pd.id]; if(!pm)continue;
    const as=(2*Math.PI)/(pd.period/365.25);
    pm.pivot.rotation.y=T*as*0.05;
    pm.mesh.rotation.y+=(pd.rotDir||1)*0.002*speed;
    if(pm.cloudMesh)pm.cloudMesh.rotation.y+=(pd.rotDir||1)*0.0026*speed;
    for(const mp of pm.moonPivots){const ms=(2*Math.PI)/Math.abs(mp.data.period);mp.piv.rotation.y=T*ms*0.3*(mp.data.period<0?-1:1);}
  }

  // Orbiteurs (ISS, Hubble, JWST)
  const ePm=PM['earth'];
  if(ePm&&issPO){
    issPO.rotation.y=ePm.pivot.rotation.y; issPI.position.x=ePm.dist;
    issPI.rotation.y=T*(2*Math.PI/(92/(60*24*365.25)))*0.05; issMesh.rotation.y+=0.05*speed;
    hubPO.rotation.y=ePm.pivot.rotation.y; hubPI.position.x=ePm.dist;
    hubPI.rotation.y=T*(2*Math.PI/(97/(60*24*365.25)))*0.05+1.2; hubMesh.rotation.y+=0.03*speed;
    jwstPO.rotation.y=ePm.pivot.rotation.y; jwstH.position.x=L2D;
    jwstH.rotation.y=T*0.0075; jwstMesh.rotation.y+=0.01*speed;
    if(lagPivRef)lagPivRef.rotation.y=ePm.pivot.rotation.y;
  }

  // Lagrange pulse
  const pulse=0.85+Math.sin(T*2)*0.15;
  lagMs.forEach(l=>{l.mesh.scale.setScalar(pulse);l.mesh.rotation.y+=0.02*speed;});

  // Comètes keplérie
  for(const c of COMETS){
    c.phase+=c.spd*speed;
    const p3=Kepler.orbitPos(c.a,c.e,c.inc,c.om,c.node,c.phase%(Math.PI*2));
    c.mesh.position.copy(p3); c.coma.position.copy(p3);
    const prox=Math.max(0,1-p3.length()/(c.periR*8));
    c.coma.material.opacity=prox*0.22;
    const away=p3.clone().normalize();
    if(prox>0.04){
      const tb=p3.clone().addScaledVector(away,c.dust.scale.y*0.5*prox);
      c.dust.position.copy(tb); c.ion.position.copy(tb);
      const ang2d=Math.atan2(away.z,away.x);
      c.dust.material.rotation=ang2d-Math.PI*0.5; c.ion.material.rotation=ang2d-Math.PI*0.5;
      c.dust.visible=true; c.ion.visible=true;
      c.dust.material.opacity=0.82*prox; c.ion.material.opacity=0.62*prox;
    } else { c.dust.visible=false; c.ion.visible=false; }
    c.mesh.rotation.y+=0.008*speed; c.mesh.rotation.x+=0.005*speed;
  }

  // α Centauri — rotations et orbites
  if(acaMesh){ acaMesh.rotation.y+=0.006*speed; }
  if(acbPiv){
    // B orbite autour de A avec période 79.9 ans (très lente)
    acbPiv.rotation.y=T*0.00025*speed;
    if(acbMesh)acbMesh.rotation.y+=0.005*speed;
  }
  if(proxbPiv)proxbPiv.rotation.y+=0.025*speed; // Proxima b orbite rapide
  if(proxcPiv)proxcPiv.rotation.y+=0.008*speed; // Proxima c

  // Sgr A*
  if(phRing)phRing.rotation.z+=0.018*speed;
  if(accDisk)accDisk.rotation.z-=0.005*speed;

  // Exoplanètes des systèmes stellaires
  if(stellarSysGroup){
    stellarSysGroup.children.forEach(sg=>{
      const eps=sg.userData.exoplanets; if(!eps)return;
      let epIdx=0;
      sg.children.forEach(child=>{
        if(child instanceof THREE.Mesh&&child.userData?.orbit&&child.userData?.period){
          child.userData.phase=(child.userData.phase||0)+(0.001/Math.max(1,child.userData.period))*speed*80;
          child.position.set(Math.cos(child.userData.phase)*child.userData.orbit,0,Math.sin(child.userData.phase)*child.userData.orbit);
        }
      });
    });
  }

  // Nébuleuses — légère rotation lente
  if(nebulaGroup)nebulaGroup.children.forEach(ng=>{ng.rotation.y+=0.0001*speed;});

  // Quasars — rotation des disques
  if(quasarGroup)quasarGroup.children.forEach(qg=>{
    qg.children.forEach(c=>{if(c instanceof THREE.Mesh&&c.geometry instanceof THREE.RingGeometry)c.rotation.z+=0.01*speed;});
  });

  // Visibilité par niveau de zoom
  const inGal=radius>65000||['milkyway','sgra','betelgeuse','antares','rigel','deneb','muCep','trappist','tauceti','kepler452','51peg','eridani','gliese667','pillars','crab','orion','rosette','horsehead','veil','ring'].includes(curTarget);
  const inAnd=radius>5000000||curTarget==='andromeda'||curTarget==='localgroup';
  const inAC=(radius>15000&&radius<4000000)||curTarget==='alphacentauri'||curTarget==='barnard'||curTarget==='sirius';

  if(galGroup)galGroup.visible=inGal;
  if(andG)andG.visible=inAnd;
  magClouds.forEach(c=>c.group.visible=inGal);
  if(acG)acG.visible=inAC;
  nearbyGroup.visible=inAC;

  // Suivi caméra dynamique
  if(curTarget!=='free'&&PM[curTarget]){PM[curTarget].tiltNode.getWorldPosition(camGoal);}
  if(curTarget==='iss'&&issMesh)issMesh.getWorldPosition(camGoal);
  if(curTarget.startsWith('moon-')&&moonPivotRegistry.length){
    const moonNames={lune:'Lune',io:'Io',europe:'Europe',ganymede:'Ganymède',callisto:'Callisto',titan:'Titan',encelade:'Encelade',triton:'Triton'};
    const tn=moonNames[curTarget.replace('moon-','')];
    if(tn){const mp=moonPivotRegistry.find(m=>m.data.name===tn);if(mp){const wp=new THREE.Vector3();mp.mesh.getWorldPosition(wp);camGoal.copy(wp);}}
  }

  applyCamera();
  const sn=scLabel(radius);
  if(sn!==prevScaleName){document.getElementById('scale-label').textContent=sn;prevScaleName=sn;}
  renderer.render(scene,camera);
}

// ── DÉMARRAGE ────────────────────────────────────────────────
progress(3,'Démarrage...');
loadAll();