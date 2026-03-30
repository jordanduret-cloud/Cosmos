// ═══════════════════════════════════════════════════════════════
// MAIN.JS — Chargement asynchrone optimisé mobile
// ═══════════════════════════════════════════════════════════════
'use strict';

// Pause pour laisser le navigateur respirer entre les étapes lourdes
function wait(ms){ return new Promise(r=>setTimeout(r,ms)); }

const BAR    = document.getElementById('loader-bar');
const STATUS = document.getElementById('loader-status');
function progress(pct, msg){
  BAR.style.width = pct+'%';
  if(msg) STATUS.textContent = msg;
}

// ── RENDERER ─────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias:true, logarithmicDepthBuffer:true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.insertBefore(renderer.domElement, document.getElementById('hud'));

const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, window.innerWidth/window.innerHeight, 0.001, 9e10);
camera.position.set(0, 80, 220);
window.addEventListener('resize',()=>{
  renderer.setSize(window.innerWidth,window.innerHeight);
  camera.aspect=window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
});

// ── CAMÉRA CONTROLLER ────────────────────────────────────────
let theta=0.4, phi=1.15, radius=220, radiusGoal=220;
let camTarget=new THREE.Vector3(), camGoal=new THREE.Vector3();
let panOff=new THREE.Vector3(), panGoal=new THREE.Vector3();
let isDrag=false, lx=0, ly=0, shiftHeld=false;

document.addEventListener('keydown',e=>{ if(e.key==='Shift')shiftHeld=true; });
document.addEventListener('keyup',  e=>{ if(e.key==='Shift')shiftHeld=false; });
renderer.domElement.addEventListener('mousedown',e=>{ isDrag=true;lx=e.clientX;ly=e.clientY; });
document.addEventListener('mouseup',()=>isDrag=false);
document.addEventListener('mousemove',e=>{
  if(!isDrag)return;
  const dx=e.clientX-lx, dy=e.clientY-ly; lx=e.clientX; ly=e.clientY;
  if(shiftHeld){
    const r2=new THREE.Vector3().crossVectors(new THREE.Vector3(Math.sin(theta)*Math.sin(phi),Math.cos(phi),Math.cos(theta)*Math.sin(phi)),new THREE.Vector3(0,1,0)).normalize();
    panGoal.addScaledVector(r2,-dx*radius*0.001);
    panGoal.addScaledVector(new THREE.Vector3(0,1,0),dy*radius*0.001);
  } else {
    theta-=dx*0.005;
    phi=Math.max(0.04,Math.min(Math.PI-0.04,phi-dy*0.005));
  }
});
renderer.domElement.addEventListener('wheel',e=>{
  e.preventDefault();
  radiusGoal=Math.max(1.5,Math.min(5e7,radiusGoal*(e.deltaY>0?1.12:0.89)));
  AUDIO.resume();
},{passive:false});
let lastTouchDist=0,touchCount=0,lastTap=0;
renderer.domElement.addEventListener('touchstart',e=>{
  touchCount=e.touches.length;
  if(touchCount===1){isDrag=true;lx=e.touches[0].clientX;ly=e.touches[0].clientY;}
  if(touchCount===2)lastTouchDist=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
  const now=Date.now(); if(now-lastTap<300)doubleTap(e.touches[0].clientX,e.touches[0].clientY); lastTap=now;
},{passive:true});
renderer.domElement.addEventListener('touchmove',e=>{
  if(touchCount===1&&isDrag){const dx=e.touches[0].clientX-lx,dy=e.touches[0].clientY-ly;lx=e.touches[0].clientX;ly=e.touches[0].clientY;theta-=dx*0.005;phi=Math.max(0.04,Math.min(Math.PI-0.04,phi-dy*0.005));}
  if(touchCount===2){const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);radiusGoal=Math.max(1.5,Math.min(5e7,radiusGoal*(lastTouchDist/d)));lastTouchDist=d;}
},{passive:true});
renderer.domElement.addEventListener('touchend',()=>{isDrag=false;touchCount=0;});

function applyCamera(){
  radius+=(radiusGoal-radius)*0.10; camTarget.lerp(camGoal,0.10); panOff.lerp(panGoal,0.08);
  const tx=camTarget.x+panOff.x, ty=camTarget.y+panOff.y, tz=camTarget.z+panOff.z;
  camera.position.set(tx+radius*Math.sin(theta)*Math.sin(phi),ty+radius*Math.cos(phi),tz+radius*Math.cos(theta)*Math.sin(phi));
  camera.lookAt(tx,ty,tz);
  if(radius>50000){camera.near=radius*0.0005;camera.far=radius*2500;}else{camera.near=0.001;camera.far=9e10;}
  camera.updateProjectionMatrix();
}

// ── HELPERS ───────────────────────────────────────────────────
function logD(au){return 8+Math.log(1+au*2.5)/Math.log(1.9)*18;}
function pR(km){return Math.max(0.5,Math.log(km/500+1)*0.7);}
function mkOrbit(r,col=0xff4444,op=0.6,seg=96){
  const pts=[]; for(let i=0;i<=seg;i++){const a=(i/seg)*Math.PI*2;pts.push(new THREE.Vector3(Math.cos(a)*r,0,Math.sin(a)*r));}
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:col,transparent:true,opacity:op}));
}
function mkLabel(txt,col='rgba(160,200,255,.9)',sz=20){
  const c=document.createElement('canvas'); c.width=512;c.height=64;
  const x=c.getContext('2d'); x.font=`${sz}px monospace`; x.fillStyle=col; x.textAlign='center'; x.fillText(txt,256,42);
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true}));
  s.scale.set(8,2,1); return s;
}

// ── VARIABLES GLOBALES ────────────────────────────────────────
const PM={}, orbitLines=[], allShaderMats=[];
let sgraGroup=null,phRing=null,accDisk=null,BHR=40000;
let acG=null,acaMesh=null,acbMesh=null,acbPiv=null,proxMesh=null,proxbMesh=null,proxbPiv=null,acaCorona=null;
let andG=null,AND_R=GALAXY.MWR*1.15,AND_DIST=11500000;
let magClouds=[],nearbyGroup=new THREE.Group(),galGroup=null;
let curTarget='free', speed=1, orbVis=true, lblVis=true;
let T=0, prevScaleName='';
const GC=GALAXY.GC;

scene.add(nearbyGroup); nearbyGroup.visible=false;

// ── CHARGEMENT ASYNCHRONE PAR ÉTAPES ─────────────────────────
async function loadAll(){
  try{

    // ÉTAPE 1 — Scène de base (lumières + étoiles)
    progress(8,'Lumières...');
    await wait(20);
    scene.add(new THREE.PointLight(0xfff5e0,5,8000,1.4));
    scene.add(new THREE.AmbientLight(0x0d1428,0.6));

    // ÉTAPE 2 — Catalogue d'étoiles
    progress(14,'Catalogue étoiles...');
    await wait(30);
    const {geo:starGeo}=STARDATA.buildStarGeometry(); // 6000 bg + named stars
    scene.add(new THREE.Points(starGeo,SHADERS.makeStarPointsMaterial()));

    // ÉTAPE 3 — Soleil
    progress(22,'Soleil...');
    await wait(20);
    const sunMat=SHADERS.makeSunMaterial(); allShaderMats.push(sunMat);
    const sunMesh=new THREE.Mesh(new THREE.SphereGeometry(7,48,48),sunMat); scene.add(sunMesh);
    const coronaMat=SHADERS.makeCoronaMaterial(); allShaderMats.push(coronaMat);
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(15,24,24),coronaMat));
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(24,16,16),new THREE.MeshBasicMaterial({color:0xff4400,transparent:true,opacity:0.035,side:THREE.BackSide})));
    // Store for animation
    window._sunMesh=sunMesh; window._coronaMat=coronaMat;

    // ÉTAPE 4 — Planètes (une par une)
    progress(30,'Planètes...');
    for(const pd of PLANETS_DATA){
      await wait(15);
      const dist=logD(pd.au), r=pR(pd.km);
      const pivot=new THREE.Object3D(); scene.add(pivot);
      scene.add(mkOrbit(dist)); orbitLines.push(mkOrbit(dist));
      const tiltNode=new THREE.Object3D(); tiltNode.position.x=dist; tiltNode.rotation.z=(pd.tilt||0)*Math.PI/180; pivot.add(tiltNode);
      // Texture réduite sur mobile (512→256)
      const tex=TEXTURES.get(pd.id);
      const mat=new THREE.MeshStandardMaterial({map:tex,roughness:0.78,metalness:0.02,emissive:new THREE.Color(pd.emis||'#000'),emissiveIntensity:0.03});
      const mesh=new THREE.Mesh(new THREE.SphereGeometry(r,96,96),mat); tiltNode.add(mesh);
      if(pd.atmos){
        const am=new THREE.Mesh(new THREE.SphereGeometry(r*1.12,20,20),SHADERS.makeAtmosMaterial(pd.atmos,new THREE.Vector3(1,0,0),pd.atmosIntensity||1,pd.atmosFalloff||3.5));
        tiltNode.add(am); allShaderMats.push(am.material);
      }
      if(pd.clouds){
        const cTex=TEXTURES.get('earthClouds');
        const cm=new THREE.Mesh(new THREE.SphereGeometry(r*1.009,36,36),new THREE.MeshStandardMaterial({map:cTex,transparent:true,opacity:0.88,depthWrite:false,roughness:1}));
        tiltNode.add(cm); PM['earth_cloud']=cm;
      }
      if(pd.rings){
        const inn=r*1.22,out=r*2.5,geo=new THREE.RingGeometry(inn,out,80,4);
        const pos2=geo.attributes.position,uv=geo.attributes.uv;
        for(let i=0;i<pos2.count;i++){const v=new THREE.Vector3().fromBufferAttribute(pos2,i);uv.setXY(i,(v.length()-inn)/(out-inn),0);}
        const rm=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:pd.thinRings?0x889aaa:0xddc880,transparent:true,opacity:pd.thinRings?0.20:0.62,side:THREE.DoubleSide}));
        rm.rotation.x=Math.PI/2; tiltNode.add(rm);
      }
      const moonPivots=[];
      for(const m of pd.moons_list){
        const mD=r*2.5+m.dist*2.5,mR=Math.max(0.12,pR(m.km)*0.6);
        const mPts=[]; for(let i=0;i<=60;i++){const a=(i/60)*Math.PI*2;mPts.push(new THREE.Vector3(Math.cos(a)*mD,0,Math.sin(a)*mD));}
        const mOrb=new THREE.Line(new THREE.BufferGeometry().setFromPoints(mPts),new THREE.LineBasicMaterial({color:0xff8888,transparent:true,opacity:0.32}));
        mOrb.position.x=dist; pivot.add(mOrb); orbitLines.push(mOrb);
        const mPiv=new THREE.Object3D(); mPiv.position.x=dist; pivot.add(mPiv);
        const mMesh=new THREE.Mesh(new THREE.SphereGeometry(mR,14,14),new THREE.MeshStandardMaterial({color:new THREE.Color(m.color||'#aaa'),roughness:0.85}));
        mMesh.position.x=mD; mPiv.add(mMesh);
        moonPivots.push({piv:mPiv,mesh:mMesh,data:m,dist:mD});
      }
      const lbl=mkLabel(pd.name); lbl.position.set(dist,r+2.8,0); pivot.add(lbl);
      PM[pd.id]={pivot,mesh,tiltNode,data:pd,moonPivots,dist,r,cloudMesh:null,lbl};
    }
    if(PM['earth']&&PM['earth_cloud'])PM['earth'].cloudMesh=PM['earth_cloud'];

    // ÉTAPE 5 — Ceintures, Oort, comètes
    progress(52,'Ceintures et comètes...');
    await wait(30);
    _buildBelts();
    await wait(20);
    _buildOort();
    await wait(20);
    _buildComets();

    // ÉTAPE 6 — ISS, Hubble, JWST, Lagrange
    progress(62,'Orbiteurs...');
    await wait(20);
    _buildOrbiters();
    _buildLagrange();

    // ÉTAPE 7 — Voie Lactée (lourd)
    progress(70,'Voie Lactée...');
    await wait(50);
    galGroup=new THREE.Group(); scene.add(galGroup); galGroup.visible=false;
    GALAXY.buildMilkyWay(galGroup);

    // ÉTAPE 8 — Sgr A*
    progress(80,'Sgr A*...');
    await wait(50);
    const sgra=GALAXY.buildSgrA(galGroup);
    sgraGroup=sgra.group; phRing=sgra.phRing; accDisk=sgra.disk; BHR=sgra.BHR;

    // ÉTAPE 9 — Alpha Centauri
    progress(86,'Alpha Centauri...');
    await wait(50);
    _buildAlphaCen();

    // ÉTAPE 10 — Andromède
    progress(90,'Andromède...');
    await wait(60);
    const res=GALAXY.buildAndromeda(scene,AND_DIST);
    andG=res.group; AND_R=res.AND_R; andG.visible=false;
    const al=mkLabel('Andromède (M31) · 2.537 Mly','rgba(255,220,160,.85)',17);
    al.scale.set(AND_R*1.3,AND_R*0.15,1); al.position.set(0,AND_R*1.2,0); andG.add(al);

    // ÉTAPE 11 — Nuages de Magellan + étoiles voisines + géantes
    progress(95,'Étoiles géantes et finitions...');
    await wait(50);
    const mc=GALAXY.buildMagellanicClouds(scene);
    mc.forEach(c=>{magClouds.push(c);c.group.visible=false;});

    // Étoiles voisines + géantes avec taille réelle mise à l'échelle
    STARDATA.NEARBY.forEach(s=>{
      const [x,y,z]=STARDATA.radecToXYZ(s.ra,s.dec,s.dist*1200);
      const col=STARDATA.specToColor(s.spec);
      // Taille proportionnelle au rayon stellaire si disponible
      const isGiant = s.desc && (s.desc.includes('R☉') || s.desc.includes('GÉANTE') || s.desc.includes('géante'));
      const baseSize = s.dist < 6 ? 9 : s.dist < 20 ? 7 : 5;
      const sm=new THREE.Mesh(
        new THREE.SphereGeometry(baseSize, 14, 14),
        new THREE.MeshBasicMaterial({color:new THREE.Color(...col)})
      );
      sm.position.set(x,y,z); nearbyGroup.add(sm);
      sm.userData={name:s.name, info:s.desc||''};

      // Halo lumineux pour les géantes et supergéantes
      if(isGiant){
        const glow=new THREE.Mesh(new THREE.SphereGeometry(baseSize*3,10,10),
          new THREE.MeshBasicMaterial({color:new THREE.Color(...col),transparent:true,opacity:0.08,side:THREE.BackSide}));
        glow.position.set(x,y,z); nearbyGroup.add(glow);
      }

      // Label
      const lbl=mkLabel(s.name,`rgba(${Math.round(col[0]*255)},${Math.round(col[1]*255)},${Math.round(col[2]*255)},0.85)`,14);
      lbl.scale.set(150,34,1); lbl.position.set(x,y+baseSize+8,z); nearbyGroup.add(lbl);
    });

    // Étoiles géantes/supergéantes remarquables dans le voisinage galactique
    // Affichées à une échelle intermédiaire (visibles entre SS et galaxie)
    const GIANT_SCALE = 800; // distance en unités scène
    STARDATA.NAMED_STARS.filter(s=>s[6]>20).forEach((s,i)=>{
      const [x,y,z]=STARDATA.radecToXYZ(s[0],s[1],Math.min(s[5],3000)*GIANT_SCALE/3000*2.5);
      const col=STARDATA.specToColor(s[3]);
      // Taille visuelle proportionnelle au vrai rayon (mais limitée)
      const visualR = Math.max(6, Math.min(35, Math.log(s[6])*4));
      const sm=new THREE.Mesh(
        new THREE.SphereGeometry(visualR,16,16),
        new THREE.MeshBasicMaterial({color:new THREE.Color(...col)})
      );
      sm.position.set(x,y,z);
      sm.userData={name:s[4], info:s[7]||''};
      nearbyGroup.add(sm);

      // Halo
      const glow=new THREE.Mesh(new THREE.SphereGeometry(visualR*4,10,10),
        new THREE.MeshBasicMaterial({color:new THREE.Color(...col),transparent:true,opacity:0.07,side:THREE.BackSide}));
      glow.position.set(x,y,z); nearbyGroup.add(glow);

      // Label avec rayon stellaire
      const radius_info = s[6]>100 ? ` · ${Math.round(s[6])} R☉` : '';
      const lbl=mkLabel(s[4]+radius_info,`rgba(${Math.round(col[0]*255)},${Math.round(col[1]*255)},${Math.round(col[2]*255)},0.82)`,13);
      lbl.scale.set(200,36,1); lbl.position.set(x,y+visualR+12,z); nearbyGroup.add(lbl);
    });

    // C'EST PRÊT !
    progress(100,'Prêt !');
    await wait(400);
    document.getElementById('loader').classList.add('fade');
    setTimeout(()=>document.getElementById('loader').remove(),900);

    // Setup UI
    _setupUI();
    animate();
    if('serviceWorker'in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
    document.addEventListener('click',()=>AUDIO.start(),{once:true});
    document.addEventListener('touchstart',()=>AUDIO.start(),{once:true});

  } catch(err){
    STATUS.textContent='Erreur: '+err.message;
    console.error(err);
  }
}

// ── CONSTRUCTEURS MODULAIRES ──────────────────────────────────
function _buildBelts(){
  function belt(inAU,outAU,N,col,op,sp=1.5){
    const geo=new THREE.BufferGeometry(),pos=new Float32Array(N*3);
    for(let i=0;i<N;i++){const r=logD(inAU+Math.random()*(outAU-inAU))+(Math.random()-0.5)*1.5,a=Math.random()*Math.PI*2;pos[i*3]=Math.cos(a)*r;pos[i*3+1]=(Math.random()-0.5)*sp;pos[i*3+2]=Math.sin(a)*r;}
    geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
    scene.add(new THREE.Points(geo,new THREE.PointsMaterial({color:new THREE.Color(col),size:0.3,transparent:true,opacity:op,sizeAttenuation:true})));
  }
  belt(2.2,3.5,3000,'#c8b89a',0.55);
  belt(30,55,4000,'#88aacc',0.6,6);
  const l=mkLabel('Ceinture de Kuiper','rgba(136,170,204,.55)',15);l.scale.set(20,3,1);l.position.set(logD(42)*0.72,4,-logD(42)*0.72);scene.add(l);
}

function _buildOort(){
  function layer(N,rMin,rMax,flatY,size,op){
    const geo=new THREE.BufferGeometry(),pos=new Float32Array(N*3),cols=new Float32Array(N*3);
    for(let i=0;i<N;i++){
      const r=rMin+Math.random()*(rMax-rMin),th=Math.random()*Math.PI*2,ph=Math.acos(2*Math.random()-1);
      pos[i*3]=r*Math.sin(ph)*Math.cos(th); pos[i*3+1]=r*Math.sin(ph)*Math.sin(th)*flatY; pos[i*3+2]=r*Math.cos(ph);
      const icy=Math.random()>0.4;
      if(icy){cols[i*3]=0.55+Math.random()*0.4;cols[i*3+1]=0.72+Math.random()*0.28;cols[i*3+2]=1;}
      else{cols[i*3]=0.9;cols[i*3+1]=0.55;cols[i*3+2]=0.25;}
    }
    geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
    geo.setAttribute('color',new THREE.BufferAttribute(cols,3));
    scene.add(new THREE.Points(geo,new THREE.PointsMaterial({size,vertexColors:true,transparent:true,opacity:op,sizeAttenuation:true})));
  }
  layer(14000,555,650,0.32,1.05,0.88);
  layer(22000,660,900,1.0,0.82,0.55);
  layer(8000, 900,1100,1.0,0.60,0.28);
  for(let s=0;s<3;s++)scene.add(new THREE.Mesh(new THREE.SphereGeometry(585+s*55,12,12),new THREE.MeshBasicMaterial({color:new THREE.Color(0.04,0.06,0.18),transparent:true,opacity:0.02,side:THREE.BackSide,depthWrite:false})));
  const l=mkLabel('Nuage de Oort  ·  ~1 milliard de comètes','rgba(130,165,255,.5)',15);l.scale.set(60,7,1);l.position.set(0,840,0);scene.add(l);
  // Light-day ring
  const ldR=540,dashes=[];
  for(let i=0;i<=200;i++){const a=(i/200)*Math.PI*2;if(Math.floor(i/4)%2===0)dashes.push(new THREE.Vector3(Math.cos(a)*ldR,0,Math.sin(a)*ldR));else if(dashes.length>1){scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([...dashes]),new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:0.16})));dashes.length=0;}}
  const l2=mkLabel('1 jour-lumière — 173 UA','rgba(255,255,255,.3)',14);l2.scale.set(34,5,1);l2.position.set(ldR*0.72,5,-ldR*0.72);scene.add(l2);
}

const COMETS=[];
function _buildComets(){
  const cTex=TEXTURES.make(32,128,(ctx,W,H)=>{const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'rgba(220,240,255,0)');g.addColorStop(0.1,'rgba(200,225,255,.85)');g.addColorStop(0.55,'rgba(150,200,255,.3)');g.addColorStop(1,'rgba(100,170,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);});
  for(let i=0;i<16;i++){
    const pR2=logD(0.2+Math.random()*12),aR=460+Math.random()*340,a=(pR2+aR)/2,e=(aR-pR2)/(aR+pR2);
    const cm=new THREE.Mesh(new THREE.SphereGeometry(0.22+Math.random()*0.2,6,6),new THREE.MeshStandardMaterial({color:0xcce8ff,emissive:0x3366aa,emissiveIntensity:1.3})); scene.add(cm);
    const coma=new THREE.Mesh(new THREE.SphereGeometry(1.5,6,6),new THREE.MeshBasicMaterial({color:0x88ccff,transparent:true,opacity:0.1,side:THREE.BackSide,depthWrite:false})); scene.add(coma);
    const dL=10+Math.random()*14;
    const dust=new THREE.Sprite(new THREE.SpriteMaterial({map:cTex,transparent:true,opacity:0.75,color:new THREE.Color(0.95,0.95,0.85)}));dust.scale.set(2.4,dL,1);scene.add(dust);
    const ion=new THREE.Sprite(new THREE.SpriteMaterial({map:cTex,transparent:true,opacity:0.55,color:new THREE.Color(0.4,0.65,1)}));ion.scale.set(0.8,dL*1.3,1);scene.add(ion);
    COMETS.push({a,e,inc:(Math.random()-0.5)*Math.PI,om:Math.random()*Math.PI*2,node:Math.random()*Math.PI*2,phase:Math.random()*Math.PI*2,spd:0.0002+Math.random()*0.0006,periR:pR2,mesh:cm,coma,dust,ion});
  }
}

let issMesh=null,hubMesh=null,jwstMesh=null,issPI=null,issPO=null,hubPI=null,hubPO=null,jwstPO=null,jwstH=null,L2D=0;
function _buildOrbiters(){
  const earthR2=pR(6371),earthDist2=logD(1);
  const issR=earthR2*2.5+0.55;
  issPO=new THREE.Object3D();scene.add(issPO);
  issPI=new THREE.Object3D();issPO.add(issPI);
  issMesh=new THREE.Mesh(new THREE.OctahedronGeometry(0.18,0),new THREE.MeshStandardMaterial({color:0xddeeff,emissive:0x445566,emissiveIntensity:0.5,roughness:0.3,metalness:0.8}));
  issMesh.position.x=issR;issPI.add(issMesh);
  const io=mkOrbit(issR,0x00ffcc,0.55);issPO.add(io);orbitLines.push(io);
  const il=mkLabel('ISS','rgba(0,255,200,.88)',14);il.scale.set(2.2,0.8,1);il.position.set(issR,0.4,0);issPI.add(il);

  const hubR=earthR2*2.5+0.42;
  hubPO=new THREE.Object3D();scene.add(hubPO);hubPI=new THREE.Object3D();hubPO.add(hubPI);
  hubMesh=new THREE.Group();
  const hm=new THREE.MeshStandardMaterial({color:0xccddff,emissive:0x223355,emissiveIntensity:0.6,roughness:0.4,metalness:0.7});
  hubMesh.add(new THREE.Mesh(new THREE.BoxGeometry(0.35,0.06,0.06),hm));
  hubMesh.add(new THREE.Mesh(new THREE.BoxGeometry(0.06,0.06,0.44),hm));
  hubMesh.position.x=hubR;hubPI.add(hubMesh);
  const ho=mkOrbit(hubR,0x44ffee,0.5);hubPO.add(ho);orbitLines.push(ho);
  const hl=mkLabel('Hubble','rgba(100,220,255,.88)',13);hl.scale.set(2,0.72,1);hl.position.set(hubR,0.42,0);hubPI.add(hl);

  L2D=logD(1.010);
  jwstPO=new THREE.Object3D();scene.add(jwstPO);
  jwstH=new THREE.Object3D();jwstH.position.x=L2D;jwstPO.add(jwstH);
  jwstMesh=new THREE.Group();
  const jm=new THREE.MeshStandardMaterial({color:0xffe0a0,emissive:0xaa6600,emissiveIntensity:0.7,roughness:0.3,metalness:0.6});
  jwstMesh.add(new THREE.Mesh(new THREE.BoxGeometry(0.42,0.02,0.24),jm));
  jwstMesh.add(new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.13,0.016,6),new THREE.MeshStandardMaterial({color:0xffd700,emissive:0xaa8800,emissiveIntensity:0.85,roughness:0.1,metalness:0.9})));
  [0.28,-0.28].forEach(x=>{const p=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.01,0.24),new THREE.MeshStandardMaterial({color:0x334488,roughness:0.5}));p.position.x=x;jwstMesh.add(p);});
  jwstMesh.position.x=0.35;jwstH.add(jwstMesh);
  const jpts=[];for(let i=0;i<=80;i++){const a=(i/80)*Math.PI*2;jpts.push(new THREE.Vector3(Math.cos(a)*0.35,Math.sin(a)*0.14,Math.sin(a)*0.35));}
  const jo=new THREE.Line(new THREE.BufferGeometry().setFromPoints(jpts),new THREE.LineBasicMaterial({color:0xffcc44,transparent:true,opacity:0.5}));jwstH.add(jo);orbitLines.push(jo);
  const jl=mkLabel('JWST','rgba(255,210,80,.9)',13);jl.scale.set(1.8,0.7,1);jl.position.set(0.35,0.38,0);jwstH.add(jl);
}

const lagMs=[];
function _buildLagrange(){
  const lagPiv=new THREE.Object3D();scene.add(lagPiv);window._lagPiv=lagPiv;
  [{id:'L1',r:logD(0.990),a:0,col:'#ff8844',info:'L1 · 0.990 UA\nSOHO, DSCOVR'},
   {id:'L2',r:logD(1.010),a:0,col:'#ffdd44',info:'L2 · 1.010 UA\nJWST, Planck'},
   {id:'L3',r:logD(1),a:Math.PI,col:'#ff4488',info:'L3 · instable'},
   {id:'L4',r:logD(1),a:Math.PI/3,col:'#44ff88',info:'L4 · +60° Troie'},
   {id:'L5',r:logD(1),a:-Math.PI/3,col:'#44ff88',info:'L5 · -60° Troie'}
  ].forEach(lp=>{
    const lx=Math.cos(lp.a)*lp.r,lz=Math.sin(lp.a)*lp.r;
    const m=new THREE.Mesh(new THREE.OctahedronGeometry(0.22,0),new THREE.MeshBasicMaterial({color:new THREE.Color(lp.col),transparent:true,opacity:0.9}));
    m.position.set(lx,0,lz);lagPiv.add(m);
    const l=mkLabel(lp.id,lp.col,16);l.scale.set(1.5,0.6,1);l.position.set(lx,0.65,lz);lagPiv.add(l);
    lagMs.push({mesh:m,data:lp});
  });
}

function _buildAlphaCen(){
  acG=new THREE.Group();acG.position.set(38000,2000,52000);scene.add(acG);acG.visible=false;
  acaMesh=new THREE.Mesh(new THREE.SphereGeometry(8.5,24,24),new THREE.MeshBasicMaterial({color:0xffee88}));acG.add(acaMesh);
  acaCorona=SHADERS.makeCoronaMaterial();
  acG.add(new THREE.Mesh(new THREE.SphereGeometry(14,16,16),acaCorona));
  acbPiv=new THREE.Object3D();acG.add(acbPiv);
  acbMesh=new THREE.Mesh(new THREE.SphereGeometry(7.5,24,24),new THREE.MeshBasicMaterial({color:0xffbb66}));acbMesh.position.x=88;acbPiv.add(acbMesh);
  const pts=[];for(let i=0;i<=60;i++){const a=(i/60)*Math.PI*2;pts.push(new THREE.Vector3(Math.cos(a)*46,Math.sin(a)*12,Math.sin(a)*46));}
  acG.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0xff4444,transparent:true,opacity:0.38})));
  const proxPos=new THREE.Vector3(14000,0,11500);
  proxMesh=new THREE.Mesh(new THREE.SphereGeometry(2.8,16,16),new THREE.MeshBasicMaterial({color:0xff4422}));proxMesh.position.copy(proxPos);acG.add(proxMesh);
  proxbPiv=new THREE.Object3D();proxbPiv.position.copy(proxPos);acG.add(proxbPiv);
  proxbMesh=new THREE.Mesh(new THREE.SphereGeometry(0.85,10,10),new THREE.MeshStandardMaterial({color:0x4466aa,emissive:0x001122,roughness:0.7}));proxbMesh.position.x=12;proxbPiv.add(proxbMesh);
  proxbPiv.add(mkOrbit(12,0xff8888,0.4));
  const ll=mkLabel('α Centauri · Système triple · 4.37 al','rgba(255,225,155,.72)',13);ll.scale.set(380,48,1);ll.position.set(0,38,0);acG.add(ll);
}

// ── FOCUS ─────────────────────────────────────────────────────
function focusOn(key){
  curTarget=key;
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.target===key));
  panGoal.set(0,0,0); AUDIO.resume(); AUDIO.playNavClick();
  if(key==='free'){camGoal.set(0,0,0);radiusGoal=220;}
  else if(key==='sun'){camGoal.set(0,0,0);radiusGoal=22;}
  else if(PM[key]){PM[key].tiltNode.getWorldPosition(camGoal);radiusGoal=PM[key].r*35+12;}
  else if(key==='iss'&&issMesh){issMesh.getWorldPosition(camGoal);radiusGoal=3;}
  else if(key==='hubble'&&hubMesh){hubMesh.children[0]?.getWorldPosition(camGoal);radiusGoal=2.5;}
  else if(key==='jwst'&&jwstMesh){jwstMesh.children[0]?.getWorldPosition(camGoal);radiusGoal=3.5;}
  else if(key==='milkyway'){camGoal.set(GC,0,0);radiusGoal=5500000;phi=1.0;theta=0.5;}
  else if(key==='sgra'){camGoal.set(GC,0,0);radiusGoal=BHR*22;phi=1.22;theta=0.85;}
  else if(key==='alphacentauri'&&acG){camGoal.copy(acG.position);radiusGoal=600;phi=1.1;theta=0.4;}
  else if(key==='andromeda'&&andG){camGoal.copy(andG.position);radiusGoal=AND_R*3.2;phi=1.05;theta=0.5;}
  else if(key==='localgroup'){camGoal.set(AND_DIST*0.3,AND_DIST*0.1,0);radiusGoal=AND_DIST*1.5;}
  else if(key==='barnard'||key==='sirius'){
    const name=key==='barnard'?'Barnard':'Sirius A';
    const s=STARDATA.NEARBY.find(n=>n.name.includes(name));
    if(s){const[x,y,z]=STARDATA.radecToXYZ(s.ra,s.dec,s.dist*1200);camGoal.set(x,y,z);radiusGoal=120;}
  }
}

// ── UI SETUP ──────────────────────────────────────────────────
function _setupUI(){
  document.querySelectorAll('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>focusOn(btn.dataset.target)));
  document.getElementById('btn-faster').onclick=()=>{speed=Math.min(speed*2,1024);document.getElementById('speed-val').textContent=`×${speed}`;AUDIO.resume();};
  document.getElementById('btn-slower').onclick=()=>{speed=Math.max(speed/2,0.125);document.getElementById('speed-val').textContent=`×${speed}`;AUDIO.resume();};
  document.getElementById('btn-reset').onclick=()=>{speed=1;document.getElementById('speed-val').textContent='×1';focusOn('free');};
  document.getElementById('btn-orbits').onclick=()=>{orbVis=!orbVis;orbitLines.forEach(l=>l.visible=orbVis);document.getElementById('btn-orbits').classList.toggle('active',!orbVis);};
  document.getElementById('btn-labels').onclick=()=>{lblVis=!lblVis;Object.values(PM).forEach(p=>p.lbl&&(p.lbl.visible=lblVis));document.getElementById('btn-labels').classList.toggle('active',!lblVis);};

  const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();
  function raycast(cx,cy){
    mouse.x=(cx/window.innerWidth)*2-1;mouse.y=-(cy/window.innerHeight)*2+1;
    ray.setFromCamera(mouse,camera);
    const pMs=PLANETS_DATA.map(p=>PM[p.id]?.mesh).filter(Boolean);
    const lagMeshes=lagMs.map(l=>l.mesh);
    const extras=[issMesh,...(hubMesh?.children||[]),...(jwstMesh?.children||[]),...(proxbMesh?[proxbMesh]:[])].filter(Boolean);
    const hits=ray.intersectObjects([...pMs,...lagMeshes,...extras],true);
    if(!hits.length){document.getElementById('info').classList.remove('show');return;}
    const obj=hits[0].object;
    let name='',info='';
    const pi=pMs.indexOf(obj);
    if(pi>=0){name=PLANETS_DATA[pi].name;info=PLANETS_DATA[pi].info;}
    else if(obj===issMesh){name='🛰 ISS';info='Station Spatiale Internationale\nAlt: ~408 km · 27 600 km/h\nPériode: 92 min · Lancée: 1998';}
    else if(hubMesh?.children.includes(obj)){name='🔭 Hubble';info='Télescope Spatial Hubble\nAlt: ~540 km · Lancé: 1990\nMiroir: 2.4 m';}
    else if(jwstMesh?.children.includes(obj)){name='🌌 JWST';info='James Webb Space Telescope\nPoint L2 · 1.5 M km\nLancé: 2021 · Miroir: 6.5 m';}
    else if(obj===proxbMesh){name='Proxima b';info='Exoplanète candidate habitable\nProxima Centauri · 4.24 al\nPériode: 11.2 jours';}
    else{const li=lagMeshes.indexOf(obj);if(li>=0){name=lagMs[li].data.id;info=lagMs[li].data.info;}}
    if(name){document.getElementById('info-name').textContent=name;document.getElementById('info-body').innerHTML=info.replace(/\n/g,'<br>');document.getElementById('info').classList.add('show');}
  }
  renderer.domElement.addEventListener('click',e=>raycast(e.clientX,e.clientY));
  renderer.domElement.addEventListener('touchend',e=>{if(e.changedTouches.length===1&&!isDrag)raycast(e.changedTouches[0].clientX,e.changedTouches[0].clientY);});
}

function doubleTap(cx,cy){
  const ray2=new THREE.Raycaster(),m2=new THREE.Vector2();
  m2.x=(cx/window.innerWidth)*2-1;m2.y=-(cy/window.innerHeight)*2+1;
  ray2.setFromCamera(m2,camera);
  const pMs=PLANETS_DATA.map(p=>PM[p.id]?.mesh).filter(Boolean);
  const hits=ray2.intersectObjects(pMs,true);
  if(hits.length){const idx=pMs.indexOf(hits[0].object);if(idx>=0)focusOn(PLANETS_DATA[idx].id);}
}

// ── SCALE LABEL ───────────────────────────────────────────────
function scLabel(r){
  if(r<6)return'🔭 Orbite terrestre basse';
  if(r<30)return'🌍 Proche de la Terre';
  if(r<100)return'☀️ Système Solaire intérieur';
  if(r<380)return'🪐 Système Solaire extérieur';
  if(r<2200)return'❄️ Ceinture de Kuiper';
  if(r<22000)return'☄️ Nuage de Oort';
  if(r<160000)return'⭐ Voisinage solaire';
  if(r<1400000)return'🌌 Voie Lactée — Bras d\'Orion';
  if(r<6500000)return'🌀 Voie Lactée complète';
  if(r<20000000)return'🌠 Groupe Local';
  return'🔭 Univers local';
}

// ── BOUCLE D'ANIMATION ────────────────────────────────────────
function animate(){
  requestAnimationFrame(animate);
  T+=0.016*speed;
  const tu=T*0.5;

  allShaderMats.forEach(m=>{if(m.uniforms?.uTime)m.uniforms.uTime.value=tu;});
  if(accDisk?.material?.uniforms?.uTime)accDisk.material.uniforms.uTime.value=tu;
  if(window._sunMesh)window._sunMesh.rotation.y=T*0.018;
  if(window._coronaMat?.uniforms?.uTime)window._coronaMat.uniforms.uTime.value=tu;

  for(const pd of PLANETS_DATA){
    const pm=PM[pd.id]; if(!pm)continue;
    const as=(2*Math.PI)/(pd.period/365.25);
    pm.pivot.rotation.y=T*as*0.05;
    pm.mesh.rotation.y+=(pd.rotDir||1)*0.002*speed;
    if(pm.cloudMesh)pm.cloudMesh.rotation.y+=(pd.rotDir||1)*0.0026*speed;
    for(const mp of pm.moonPivots){const ms=(2*Math.PI)/Math.abs(mp.data.period);mp.piv.rotation.y=T*ms*0.3*(mp.data.period<0?-1:1);}
  }

  const ePm=PM['earth'];
  if(ePm&&issPO){
    issPO.rotation.y=ePm.pivot.rotation.y; issPI.position.x=ePm.dist;
    issPI.rotation.y=T*(2*Math.PI/(92/(60*24*365.25)))*0.05; issMesh.rotation.y+=0.05*speed;
    hubPO.rotation.y=ePm.pivot.rotation.y; hubPI.position.x=ePm.dist;
    hubPI.rotation.y=T*(2*Math.PI/(97/(60*24*365.25)))*0.05+1.2; hubMesh.rotation.y+=0.03*speed;
    jwstPO.rotation.y=ePm.pivot.rotation.y; jwstH.position.x=L2D;
    jwstH.rotation.y=T*0.0075; jwstMesh.rotation.y+=0.01*speed;
    if(window._lagPiv)window._lagPiv.rotation.y=ePm.pivot.rotation.y;
  }

  const pulse=0.85+Math.sin(T*2)*0.15;
  lagMs.forEach(l=>{l.mesh.scale.setScalar(pulse);l.mesh.rotation.y+=0.02*speed;});

  for(const c of COMETS){
    c.phase+=c.spd*speed;
    const p3=Kepler.orbitPos(c.a,c.e,c.inc,c.om,c.node,c.phase%(Math.PI*2));
    c.mesh.position.copy(p3);c.coma.position.copy(p3);
    const prox=Math.max(0,1-p3.length()/(c.periR*8));
    c.coma.material.opacity=prox*0.18;
    const away=p3.clone().normalize(),tb=p3.clone().addScaledVector(away,c.dust.scale.y*0.5*prox);
    c.dust.position.copy(tb);c.ion.position.copy(tb);
    const ang=Math.atan2(away.x,away.z);
    c.dust.material.rotation=ang+Math.PI/2;c.ion.material.rotation=ang+Math.PI/2;
    c.dust.visible=prox>0.05;c.ion.visible=prox>0.05;
    c.dust.material.opacity=prox>0.05?0.75*prox:0;c.ion.material.opacity=prox>0.05?0.55*prox:0;
    c.mesh.rotation.x+=0.03*speed;c.mesh.rotation.z+=0.02*speed;
  }

  if(acaMesh)acaMesh.rotation.y+=0.006*speed;
  if(acbMesh)acbMesh.rotation.y+=0.005*speed;
  if(acbPiv)acbPiv.rotation.y=T*0.001;
  if(proxbPiv)proxbPiv.rotation.y=T*0.018;
  if(acaCorona?.uniforms?.uTime)acaCorona.uniforms.uTime.value=tu;
  if(phRing)phRing.rotation.z+=0.018*speed;

  const inGal=radius>65000||curTarget==='milkyway'||curTarget==='sgra';
  const inAnd=radius>5000000||curTarget==='andromeda'||curTarget==='localgroup';
  const inAC=(radius>15000&&radius<4000000)||curTarget==='alphacentauri'||curTarget==='barnard'||curTarget==='sirius';
  if(galGroup)galGroup.visible=inGal;
  if(andG)andG.visible=inAnd;
  magClouds.forEach(c=>c.group.visible=inGal);
  if(acG)acG.visible=inAC;
  nearbyGroup.visible=inAC;

  if(curTarget!=='free'&&PM[curTarget])PM[curTarget].tiltNode.getWorldPosition(camGoal);
  if(curTarget==='iss'&&issMesh)issMesh.getWorldPosition(camGoal);

  applyCamera();

  const sn=scLabel(radius);
  if(sn!==prevScaleName){document.getElementById('scale-label').textContent=sn;prevScaleName=sn;}

  renderer.render(scene,camera);
}

// ── DÉMARRAGE ─────────────────────────────────────────────────
progress(3,'Démarrage...');
loadAll();
