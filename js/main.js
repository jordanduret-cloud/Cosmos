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
renderer.setPixelRatio(Math.min(devicePixelRatio, 3));  // PC: full res
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
const PM={}, planetOrbitLines=[], moonOrbitLines=[], allShaderMats=[];
const orbitLines = { planet: planetOrbitLines, moon: moonOrbitLines,
  all(){ return [...planetOrbitLines,...moonOrbitLines]; },
  setVisible(v){ planetOrbitLines.forEach(l=>l.visible=v); moonOrbitLines.forEach(l=>l.visible=v); }
};
let sgraGroup=null,phRing=null,accDisk=null,BHR=40000;
let acG=null,acaMesh=null,acbMesh=null,acbPiv=null,proxMesh=null,proxbMesh=null,proxbPiv=null,acaCorona=null;
let andG=null,AND_R=GALAXY.MWR*1.15,AND_DIST=11500000;
let magClouds=[],nearbyGroup=new THREE.Group(),galGroup=null;
let curTarget='free', speed=1, orbPlanetsVis=true, orbMoonsVis=true, lblVis=true;
let T=0, prevScaleName='';
const GC=GALAXY.GC;
// Moon meshes registry for raycasting
const moonMeshRegistry = []; // {mesh, name, info}

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
      const orb=mkOrbit(dist); scene.add(orb); planetOrbitLines.push(orb);
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
        mOrb.position.x=dist; pivot.add(mOrb); moonOrbitLines.push(mOrb);
        const mPiv=new THREE.Object3D(); mPiv.position.x=dist; pivot.add(mPiv);
        const mMesh=new THREE.Mesh(new THREE.SphereGeometry(mR,16,16),new THREE.MeshStandardMaterial({color:new THREE.Color(m.color||'#aaa'),roughness:0.85}));
        mMesh.position.x=mD; mPiv.add(mMesh);
        // Register moon for raycasting with full info
        mMesh.userData={name:m.name, info:m.info||m.name};
        moonMeshRegistry.push({mesh:mMesh, name:m.name, info:m.info||''});
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
    progress(84,'Alpha Centauri...');
    await wait(50);
    _buildAlphaCen();

    // ÉTAPE 9b — Systèmes stellaires (TRAPPIST-1, Tau Ceti, etc.)
    progress(87,'Systèmes stellaires et exoplanètes...');
    await wait(60);
    _buildStellarSystems();

    // ÉTAPE 9c — Étoiles géantes (Bételgeuse, Antarès, Rigel)
    progress(89,'Étoiles géantes...');
    await wait(60);
    _buildGiantStars();

    // ÉTAPE 9c — Étoiles remarquables (Bételgeuse, Antarès, Rigel...)
    progress(89,'Étoiles remarquables...');
    await wait(50);
    _buildRemarkableStars();

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
  const io=mkOrbit(issR,0x00ffcc,0.55);issPO.add(io);planetOrbitLines.push(io);
  const il=mkLabel('ISS','rgba(0,255,200,.88)',14);il.scale.set(2.2,0.8,1);il.position.set(issR,0.4,0);issPI.add(il);

  const hubR=earthR2*2.5+0.42;
  hubPO=new THREE.Object3D();scene.add(hubPO);hubPI=new THREE.Object3D();hubPO.add(hubPI);
  hubMesh=new THREE.Group();
  const hm=new THREE.MeshStandardMaterial({color:0xccddff,emissive:0x223355,emissiveIntensity:0.6,roughness:0.4,metalness:0.7});
  hubMesh.add(new THREE.Mesh(new THREE.BoxGeometry(0.35,0.06,0.06),hm));
  hubMesh.add(new THREE.Mesh(new THREE.BoxGeometry(0.06,0.06,0.44),hm));
  hubMesh.position.x=hubR;hubPI.add(hubMesh);
  const ho=mkOrbit(hubR,0x44ffee,0.5);hubPO.add(ho);planetOrbitLines.push(ho);
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
  const jo=new THREE.Line(new THREE.BufferGeometry().setFromPoints(jpts),new THREE.LineBasicMaterial({color:0xffcc44,transparent:true,opacity:0.5}));jwstH.add(jo);planetOrbitLines.push(jo);
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

// ── REGISTRE DES SYSTÈMES STELLAIRES CLIQUABLES ──────────────
// Tous les meshes cliquables dans la Voie Lactée
const stellarMeshes = [];  // { mesh, name, info }

function registerStellar(mesh, name, info){
  mesh.userData = { name, info };
  stellarMeshes.push({ mesh, name, info });
  return mesh;
}

function _buildAlphaCen(){
  // Position réelle dans la Voie Lactée (4.37 al du Soleil)
  // En coordonnées galactiques: l=315.8°, b=-0.68°
  // On place acG proche du marqueur SS dans galGroup
  acG=new THREE.Group();
  acG.position.set(28000, -500, 18000);  // dans le bras d'Orion, près du SS
  scene.add(acG); acG.visible=false;

  // ── α Centauri A — G2V comme le Soleil (1.227 R☉) ──────────
  // Taille visuelle: A est 22% plus grand que le Soleil
  const acaR = 9.2;  // proportionnel au Soleil (7 unités) × 1.227
  acaMesh=new THREE.Mesh(
    new THREE.SphereGeometry(acaR,32,32),
    new THREE.MeshBasicMaterial({color:0xffee88})
  );
  // Halo corona jaune
  acaCorona=SHADERS.makeCoronaMaterial();
  const acaCoronaMesh=new THREE.Mesh(new THREE.SphereGeometry(acaR*1.9,20,20),acaCorona);
  acG.add(acaMesh); acG.add(acaCoronaMesh);
  registerStellar(acaMesh,'α Centauri A (G2V)',
    'Type spectral: G2V · Similaire au Soleil\nMasse: 1.100 M☉ · Rayon: 1.227 R☉\nLuminosité: 1.519 L☉\nTempérature: 5 790 K\nÂge: ~6.5 milliards d\'années\nDistance: 4.37 années-lumière\nBinaire avec α Cen B (période: 79.9 ans)'
  );

  // Label A
  const lblA=mkLabel('α Cen A  (G2V)','rgba(255,238,120,0.90)',14);
  lblA.scale.set(160,36,1); lblA.position.set(0,acaR+8,0); acG.add(lblA);

  // ── α Centauri B — K1V (0.865 R☉ → légèrement plus petit) ──
  // Orbite binaire: demi-grand axe ~23 UA, excentricité 0.52
  acbPiv=new THREE.Object3D(); acG.add(acbPiv);
  const acbR = 6.5;  // 0.865 × 7 unités
  acbMesh=new THREE.Mesh(
    new THREE.SphereGeometry(acbR,28,28),
    new THREE.MeshBasicMaterial({color:0xffaa55})  // plus orangé que A
  );
  acbMesh.position.x=90;
  acbPiv.add(acbMesh);
  // Halo corona orangée
  const acbCoronaMesh=new THREE.Mesh(
    new THREE.SphereGeometry(acbR*1.8,16,16),
    SHADERS.makeCoronaMaterial()
  );
  acbCoronaMesh.position.x=90; acbPiv.add(acbCoronaMesh);
  registerStellar(acbMesh,'α Centauri B (K1V)',
    'Type spectral: K1V · Naine orange\nMasse: 0.907 M☉ · Rayon: 0.865 R☉\nLuminosité: 0.500 L☉\nTempérature: 5 260 K\nÂge: ~6.5 milliards d\'années\nOrbite autour de α Cen A: 79.9 ans\nExoplanète α Cen Bb controversée'
  );
  const lblB=mkLabel('α Cen B  (K1V)','rgba(255,180,90,0.88)',14);
  lblB.scale.set(150,34,1); lblB.position.set(90,acbR+8,0); acbPiv.add(lblB);

  // Orbite elliptique AB (e=0.52)
  {
    const pts=[]; const a=46, b=a*Math.sqrt(1-0.52*0.52);
    for(let i=0;i<=80;i++){const ang=(i/80)*Math.PI*2; pts.push(new THREE.Vector3(Math.cos(ang)*a,Math.sin(ang)*12,Math.sin(ang)*b));}
    acG.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0xff6644,transparent:true,opacity:0.35})));
  }

  // ── Proxima Centauri — M5Ve naine rouge (0.141 R☉) ──────────
  // 0.237 al plus loin que AB → ~15 000 unités scène
  const proxPos=new THREE.Vector3(13500,800,11200);
  const proxR = 1.0;  // 0.141 × 7 ≈ 1 unité (petite mais visible)
  proxMesh=new THREE.Mesh(
    new THREE.SphereGeometry(proxR,14,14),
    new THREE.MeshBasicMaterial({color:0xff3311})
  );
  proxMesh.position.copy(proxPos); acG.add(proxMesh);
  // Halo rougeâtre
  const proxGlow=new THREE.Mesh(
    new THREE.SphereGeometry(proxR*4,10,10),
    new THREE.MeshBasicMaterial({color:0xff2200,transparent:true,opacity:0.12,side:THREE.BackSide})
  );
  proxGlow.position.copy(proxPos); acG.add(proxGlow);
  registerStellar(proxMesh,'Proxima Centauri (M5Ve)',
    'Type spectral: M5Ve · Naine rouge\nMasse: 0.122 M☉ · Rayon: 0.141 R☉\nLuminosité: 0.00155 L☉\nTempérature: 3 042 K\nÂge: ~4.85 milliards d\'années\nDistance: 4.243 al (la + proche du Soleil)\nÉtoile à éruptions (flares UV intenses)\nOrbite AB: ~550 000 ans (très large)\n\nExoplanètes:\n• Proxima b (2016): 1.3 M⊕ · 11.2 j · zone habitable\n• Proxima c (2020): 7 M⊕ · 5.2 ans · confirmaté partiel\n• Proxima d (2022): 0.26 M⊕ · 5.1 j · très proche'
  );
  const lblP=mkLabel('Proxima Centauri  (M5Ve · 4.24 al)','rgba(255,110,60,0.88)',14);
  lblP.scale.set(330,40,1); lblP.position.copy(proxPos).add(new THREE.Vector3(0,12,0)); acG.add(lblP);

  // ── Proxima b/c/d ────────────────────────────────────────────
  proxbPiv=new THREE.Object3D(); proxbPiv.position.copy(proxPos); acG.add(proxbPiv);
  // Proxima b (zone habitable)
  proxbMesh=new THREE.Mesh(
    new THREE.SphereGeometry(0.85,12,12),
    new THREE.MeshStandardMaterial({color:0x3355aa,emissive:0x001133,roughness:0.8})
  );
  proxbMesh.position.x=12; proxbPiv.add(proxbMesh);
  proxbPiv.add(mkOrbit(12,0xff6644,0.45));
  registerStellar(proxbMesh,'Proxima b',
    'Exoplanète de Proxima Centauri\nMasse min: ~1.3 M⊕ (super-Terre?)\nPériode: 11.2 jours\nDistance étoile: 0.048 UA\nZone habitable confirmée\nFlux: ~65% du flux solaire\nRotation probablement synchrone\n\n⚠️ Exposée aux éruptions UV\nde Proxima Centauri'
  );
  // Proxima c
  const proxcMesh=new THREE.Mesh(new THREE.SphereGeometry(1.2,10,10),new THREE.MeshStandardMaterial({color:0x886633,roughness:0.7}));
  proxcMesh.position.x=22; proxbPiv.add(proxcMesh);
  proxbPiv.add(mkOrbit(22,0xaa5533,0.30));
  registerStellar(proxcMesh,'Proxima c',
    'Exoplanète de Proxima Centauri\nMasse: ~7 M⊕ (super-Terre/mini-Neptune)\nPériode: 5.2 ans · 1.489 UA\nFroide: température ~38 K\nConfirmation partielle (2020)'
  );

  // Label système
  const lbl=mkLabel('Système α Centauri  ·  Triple  ·  4.37 al','rgba(255,225,155,0.72)',13);
  lbl.scale.set(380,48,1); lbl.position.set(0,42,0); acG.add(lbl);
}

// ── SYSTÈMES STELLAIRES DANS LA VOIE LACTÉE ──────────────────
// Positionnés dans galGroup, visibles à l'échelle galactique
let stellarSystemsGroup = null;

function _buildStellarSystems(){
  stellarSystemsGroup = new THREE.Group();
  galGroup.add(stellarSystemsGroup);

  // Données: [name, x_gc, y_gc, z_gc (en unités scène), starColor, starR, info, exoplanets[]]
  // Positions basées sur coordonnées galactiques réelles
  const SYSTEMS = [

    // ── TRAPPIST-1 — 39.5 al · ultra-cool M8V ────────────────
    {
      name:'TRAPPIST-1',
      pos:[GC+20000, -3000, 35000],
      col:0xff2200, starR:0.55,  // M8V: 0.121 R☉ → très petite
      specType:'M8V · Naine rouge ultra-froide',
      info:'TRAPPIST-1 · M8V · 39.5 années-lumière\nMasse: 0.089 M☉ · Rayon: 0.121 R☉\nTempérature: 2 559 K · Très vieille (~7.6 Ga)\n\nFameux pour ses 7 exoplanètes rocheuses\ndont 3 en zone habitable !',
      exoplanets:[
        {name:'TRAPPIST-1b',  r:1.12, orb:5,  period:1.51,  col:0xaa6633, info:'Rocheuse · 1.12 R⊕ · 1.51 jours\nZone chaude · T~400K · Sans eau liquide probable'},
        {name:'TRAPPIST-1c',  r:1.10, orb:7.5,period:2.42,  col:0xaa7744, info:'Rocheuse · 1.10 R⊕ · 2.42 jours\nÉtudiée par JWST · Peu ou pas d\'atmosphère CO₂'},
        {name:'TRAPPIST-1d',  r:0.79, orb:10, period:4.05,  col:0x5577aa, info:'Rocheuse · 0.79 R⊕ · 4.05 jours\nBord intérieur zone habitable\nMasse: 0.388 M⊕'},
        {name:'TRAPPIST-1e',  r:0.92, orb:13, period:6.10,  col:0x4466cc, info:'🌟 PRIORITÉ HABITABILITÉ\nRocheuse · 0.92 R⊕ · 6.10 jours\nZone habitable centrale\nFlux similaire à la Terre · Eau liquide possible'},
        {name:'TRAPPIST-1f',  r:1.04, orb:17, period:9.21,  col:0x3355bb, info:'Rocheuse · 1.04 R⊕ · 9.21 jours\nZone habitable · Eau liquide possible\nPlus froide que e · Glaces possibles'},
        {name:'TRAPPIST-1g',  r:1.13, orb:21, period:12.35, col:0x336699, info:'Rocheuse · 1.13 R⊕ · 12.35 jours\nBord extérieur zone habitable\nProbablement glacée'},
        {name:'TRAPPIST-1h',  r:0.76, orb:26, period:18.77, col:0x667788, info:'Rocheuse · 0.76 R⊕ · 18.77 jours\nHors zone habitable · Très froide\nGlacée comme Europe (Jupiter)'},
      ]
    },

    // ── TAU CETI — 11.9 al · G8V similaire au Soleil ─────────
    {
      name:'Tau Ceti',
      pos:[GC-8000, 1500, -22000],
      col:0xffdd88, starR:5.5,  // G8V: 0.793 R☉
      specType:'G8V · Naine jaune-orangée',
      info:'Tau Ceti · G8V · 11.9 années-lumière\nMasse: 0.783 M☉ · Rayon: 0.793 R☉\nTempérature: 5 344 K\nCible historique SETI (Project Ozma 1960)\nDisque de débris important (10× Soleil)\nMétallicité faible [Fe/H]=-0.50',
      exoplanets:[
        {name:'τ Ceti e',r:1.7, orb:9,  period:162,  col:0x4477bb, info:'Super-Terre · 1.7 R⊕ · 162 jours\nZone habitable interne · ~3.93 M⊕'},
        {name:'τ Ceti f',r:1.9, orb:13, period:636,  col:0x5588cc, info:'Super-Terre · 1.9 R⊕ · 636 jours\nZone habitable externe · ~3.93 M⊕'},
        {name:'τ Ceti g',r:1.8, orb:6,  period:20.0, col:0xaa7733, info:'Super-Terre · 1.8 R⊕ · 20 jours\nTrop chaude pour la vie'},
        {name:'τ Ceti h',r:1.8, orb:4,  period:49.4, col:0x997733, info:'Super-Terre · 1.8 R⊕ · 49 jours\nBord chaud zone habitable'},
      ]
    },

    // ── KEPLER-452 — 1 400 al · G2V (jumeau solaire) ─────────
    {
      name:'Kepler-452',
      pos:[GC+180000, 5000, -95000],
      col:0xffee99, starR:7.5,  // G2V: 1.11 R☉
      specType:'G2V · Quasi-jumeau solaire',
      info:'Kepler-452 · G2V · 1 400 années-lumière\nMasse: ~1.04 M☉ · Rayon: 1.11 R☉\nÂge: 6 milliards d\'années (1.5 Ga de plus que Soleil)\nTempérature: 5 757 K\n\nNommé "Cousin de la Terre" par la NASA\nDécouvert par Kepler (2015)',
      exoplanets:[
        {name:'Kepler-452b',r:2.8, orb:10, period:384.8, col:0x4488bb, info:'🌟 "Cousin de la Terre"\nSuper-Terre · 2.8 R⊕ · 384.8 jours\nZone habitable de son étoile G2\nMasse estimée: ~5 M⊕\nFlux stellaire: ~1.1 fois la Terre\n\nDécouvert Kepler 2015\nPremier analogue Terre-Soleil trouvé'},
      ]
    },

    // ── 51 PEGASI — 50.9 al · G2IV ───────────────────────────
    {
      name:'51 Pegasi',
      pos:[GC+15000, 2000, -45000],
      col:0xffee88, starR:6.0,
      specType:'G2IV · Sous-géante jaune',
      info:'51 Pegasi · G2IV · 50.9 années-lumière\nMasse: 1.11 M☉ · Rayon: 1.24 R☉\nHistorique: 1ère exoplanète découverte\nautour d\'une étoile de type solaire (1995)\nNobel 2019 → Mayor & Queloz',
      exoplanets:[
        {name:'51 Peg b (Dimidium)',r:2.5, orb:8, period:4.23, col:0xff8833, info:'1er "Jupiter chaud" découvert (1995)\nMasse: ~0.47 MJ · Rayon: ~1.2 RJ\nPériode: 4.23 jours · 0.052 UA\nTempérature ~1200 K · Pas habitable\nNobel de Physique 2019\npour sa découverte'},
      ]
    },

    // ── HD 40307g — 41.8 al · K2.5V ──────────────────────────
    {
      name:'HD 40307',
      pos:[GC-18000, -1000, -36000],
      col:0xffcc77, starR:5.2,
      specType:'K2.5V · Naine orange',
      info:'HD 40307 · K2.5V · 41.8 années-lumière\nMasse: 0.77 M☉ · Rayon: 0.72 R☉\nTempérature: 4 977 K\nSystème de 6 super-Terres',
      exoplanets:[
        {name:'HD 40307g',r:2.4, orb:14, period:197.8, col:0x4488cc, info:'Super-Terre · 2.4 R⊕ · 197.8 jours\nZone habitable · Masse: ~7.1 M⊕\nPeut avoir une rotation non-synchrone\n→ Conditions plus propices à la vie'},
        {name:'HD 40307b',r:1.8, orb:5,  period:4.31,  col:0xaa6633, info:'Super-Terre · 1.8 R⊕ · 4.3 jours\nTrès chaude · proche de l\'étoile'},
        {name:'HD 40307c',r:2.0, orb:7,  period:9.62,  col:0x997744, info:'Super-Terre · 2.0 R⊕ · 9.6 jours'},
      ]
    },

    // ── EPSILON ERIDANI — 10.5 al · K2V ──────────────────────
    {
      name:'ε Eridani',
      pos:[GC-9000, 500, -9500],
      col:0xffbb66, starR:5.8,
      specType:'K2V · Naine orange active',
      info:'ε Eridani (Ran) · K2V · 10.5 années-lumière\nMasse: 0.820 M☉ · Rayon: 0.735 R☉\nTempérature: 5 072 K · Jeune (0.4-0.8 Ga)\nAnneau de débris multiple (like notre SS jeune)\nCible SETI favoris depuis les années 1960',
      exoplanets:[
        {name:'ε Eri b (Ægir)',r:2.0, orb:12, period:2502, col:0xff8833, info:'Jupiter froid · ~0.78 MJ\nPériode: 6.85 ans · 3.39 UA\nExcentricité: 0.70 (orbite elliptique)\nConfirmé 2000 (controversé puis confirmé)'},
      ]
    },

    // ── GLIESE 667C — 23.6 al · M1.5V ───────────────────────
    {
      name:'Gliese 667C',
      pos:[GC-14000, -2500, -22000],
      col:0xff5533, starR:2.2,
      specType:'M1.5V · Naine rouge (système triple)',
      info:'Gliese 667C · M1.5V · 23.6 années-lumière\nMasse: 0.33 M☉ · Rayon: 0.42 R☉\nPartie d\'un système triple stellaire\n(Gliese 667A + 667B sont des naines K)',
      exoplanets:[
        {name:'Gl 667Cc',r:1.5, orb:7,  period:28.1,  col:0x4477cc, info:'Super-Terre en zone habitable\nMasse: ~3.8 M⊕ · Période: 28.1 jours\nZone habitable de la naine rouge\nFlux ~0.88 × Terre · Habitable possible'},
        {name:'Gl 667Ce',r:1.3, orb:10, period:62.2,  col:0x3366bb, info:'Super-Terre · Zone habitable ext.\nMasse: ~2.5 M⊕ · 62.2 jours'},
        {name:'Gl 667Cf',r:1.4, orb:5,  period:39.0,  col:0x4488bb, info:'Super-Terre · Zone habitable\nMasse: ~2.7 M⊕ · 39.0 jours'},
      ]
    },

    // ── BARNARD'S STAR — 5.96 al · M4Ve ─────────────────────
    {
      name:"Étoile de Barnard",
      pos:[GC+3000, 800, 5000],
      col:0xff3300, starR:0.8,  // M4Ve: 0.196 R☉
      specType:'M4Ve · Naine rouge · Mouvement propre record',
      info:'Étoile de Barnard · M4Ve · 5.96 années-lumière\nMasse: 0.144 M☉ · Rayon: 0.196 R☉\nTempérature: 3 134 K · Âge: ~10 Ga\n\nMouvement propre le plus rapide du ciel\n(10.36″/an → traverse la Lune en 180 ans)\n2ème étoile la plus proche du Soleil\nÉtoile à éruptions fréquentes',
      exoplanets:[
        {name:"Barnard b (candidat)",r:1.0, orb:8, period:232.8, col:0x667788, info:'Candidat exoplanète (non confirmé)\nSuper-Terre froide · ~3.2 M⊕\nPériode: 232.8 jours · 0.40 UA\nHors zone habitable · T~170 K\n(Annoncé 2018, controversé depuis)'},
      ]
    },

  ];

  SYSTEMS.forEach(sys=>{
    const g=new THREE.Group(); g.position.set(...sys.pos); stellarSystemsGroup.add(g);
    g.userData={systemName:sys.name};

    // Étoile centrale
    const starMesh=new THREE.Mesh(
      new THREE.SphereGeometry(sys.starR,20,20),
      new THREE.MeshBasicMaterial({color:sys.col})
    );
    g.add(starMesh);
    registerStellar(starMesh, sys.name, sys.info);

    // Halo de l'étoile
    const starGlow=new THREE.Mesh(
      new THREE.SphereGeometry(sys.starR*3.5,12,12),
      new THREE.MeshBasicMaterial({color:sys.col,transparent:true,opacity:0.08,side:THREE.BackSide})
    );
    g.add(starGlow);

    // Label étoile
    const lblStar=mkLabel(sys.name,`rgba(255,220,160,0.82)`,13);
    lblStar.scale.set(Math.max(150,sys.name.length*14),34,1);
    lblStar.position.set(0,sys.starR+10,0); g.add(lblStar);

    // Exoplanètes orbitales
    sys.exoplanets.forEach((ep,ei)=>{
      const epOrbit=mkOrbit(ep.orb,0xff6644,0.28,48);
      g.add(epOrbit);

      const epMesh=new THREE.Mesh(
        new THREE.SphereGeometry(ep.r*0.35,10,10),
        new THREE.MeshStandardMaterial({color:ep.col,roughness:0.8,emissive:new THREE.Color(ep.col).multiplyScalar(0.08)})
      );
      // Phase initiale décalée
      const phase0 = (ei/sys.exoplanets.length)*Math.PI*2;
      epMesh.position.set(Math.cos(phase0)*ep.orb, 0, Math.sin(phase0)*ep.orb);
      g.add(epMesh);
      registerStellar(epMesh, ep.name, ep.info);

      // Stocker pour animation orbitale
      epMesh.userData.orbit=ep.orb;
      epMesh.userData.period=ep.period;
      epMesh.userData.phase=phase0;
    });

    // Stocker le groupe pour animation
    g.userData.exoplanets=sys.exoplanets;
  });
}

// ── ÉTOILES REMARQUABLES AVEC NÉBULEUSES ─────────────────────
let remarkableStarsGroup = null;

function _buildRemarkableStars(){
  remarkableStarsGroup = new THREE.Group(); scene.add(remarkableStarsGroup);
  remarkableStarsGroup.visible = false;

  // Positions en unités scène (voisinage galactique intermédiaire)
  const STARS = [
    {
      name:'Bételgeuse (α Orionis)',
      pos:[55000, 3000, -85000],
      starR: 42,  // 887 R☉ → ×6 le Soleil (7 u) → ~42
      col: 0xff4422,
      nebulaCol: 0xff3311,
      nebulaSize: 380,
      info:`🔴 BÉTELGEUSE — SUPERGÉANTE ROUGE\n\nType: M1-M2 Ia (supergéante rouge)\nMasse: ~16.5-19 M☉\nRayon: ~887 R☉ (si au centre du SS → jusqu'à Jupiter!)\nLuminosité: ~100 000 L☉\nTempérature: 3 500 K\nDistance: ~700 années-lumière\nÂge: ~8-8.5 millions d'années\n\n"La Grande Atténuation" (2019-2020):\n• Étoile a dramatiquement faibli (magnitude +1.6)\n• Éjection de masse + refroidissement local\n• Alarme mondiale: supernova imminente?\n• Conclusion: éruption massive de poussières\n\nFin de vie imminente (à l'échelle astronomique):\n• Explosera en supernova dans <100 000 ans\n• Visible de jour depuis la Terre!\n• Laissera une étoile à neutrons ou trou noir\n\nSurface irrégulière et pulsations:\n• Diamètre varie de 700 à 1000 R☉\n• Cellules de convection géantes (taille du SS)\n• Imagée directement par VLTI/Hubble`,
      desc:'Supergéante rouge · 887 R☉ · 700 al\nCandidat supernova <100 000 ans'
    },
    {
      name:'Antarès (α Scorpii)',
      pos:[-42000, -2000, -82000],
      starR: 40,  // 883 R☉
      col: 0xff3300,
      nebulaCol: 0xff2200,
      nebulaSize: 350,
      info:`🔴 ANTARÈS — LE RIVAL DE MARS\n\nType: M0.5 Iab (supergéante rouge)\nMasse: ~11-14.3 M☉\nRayon: ~883 R☉ (si au centre du SS → jusqu'à Mars!)\nLuminosité: ~57 500 L☉\nTempérature: 3 570 K\nDistance: ~550 années-lumière\n\nNom: "Anti-Arès" = rival de Mars\n→ Couleur rouge similaire à la planète Mars\n→ Visible à l'œil nu en été depuis l'hémisphère nord\n\nSystème binaire:\n• Antarès A: la supergéante rouge\n• Antarès B: étoile bleue-verte B2.5 V\n  - Distante de 550 UA (~80 ans-lumière de A)\n  - Difficile à voir car éclipsée par A\n  - Masse: ~7 M☉\n\nNébuleuse de réflexion bleue autour de B:\n→ Illuminée par Antarès B\n\nFin de vie:\n• Supernova dans quelques centaines de milliers d'années\n• Brillante depuis la Terre (magnitude −4?)`,
      desc:'Supergéante rouge · 883 R☉ · 550 al\nRival de Mars en couleur'
    },
    {
      name:'Rigel (β Orionis)',
      pos:[75000, 8000, -115000],
      starR: 22,  // 78 R☉
      col: 0x8899ff,
      nebulaCol: 0x4466ff,
      nebulaSize: 250,
      info:`💙 RIGEL — SUPERGÉANTE BLEUE-BLANCHE\n\nType: B8 Ia (supergéante bleue-blanche)\nMasse: ~17-23 M☉\nRayon: ~78 R☉ (×78 le Soleil)\nLuminosité: ~120 000 L☉ (une des + brillantes connues!)\nTempérature: ~12 100 K\nDistance: ~860 années-lumière\n\nMalgré son nom β (bêta), Rigel est\nplus brillante qu'Α Orionis (Bételgeuse)!\n→ Magnitude apparente: 0.12 (7ème étoile la + brillante)\n\nNébuleuse de la Sorcière (IC 2118):\n→ Nuage de gaz et poussières illuminé par Rigel\n→ À ~2.5° de Rigel\n→ Visible aux longues expositions\n\nSystème multiple:\n• Rigel A: la supergéante\n• Rigel B: binaire spectroscopique (B9 V)\n  - Distante de ~2 200 UA\n  - Rigel Ba + Bb: deux étoiles séparées de 0.1″\n\nFin de vie:\n• Supernova de type Ib/Ic probable\n• Dans ~10 millions d'années\n• Dépend de la perte de masse`,
      desc:'Supergéante bleue · 78 R☉ · 860 al\n120 000 L☉ · Parmi les + lumineuses'
    },
    {
      name:'Canopus (α Carinae)',
      pos:[-25000, -8000, 60000],
      starR: 18,  // 71 R☉
      col: 0xfff0cc,
      nebulaCol: 0xffeeaa,
      nebulaSize: 180,
      info:`✨ CANOPUS — 2ÈME ÉTOILE LA PLUS BRILLANTE\n\nType: A9 II (supergéante blanche)\nMasse: ~8-9 M☉\nRayon: ~71 R☉\nLuminosité: ~10 600 L☉\nTempérature: ~7 350 K\nDistance: ~310 années-lumière\n\n2ème étoile la plus brillante du ciel\n(après Sirius)\nMagnitude apparente: −0.74\n\nUtilisé comme référence de navigation:\n→ Systèmes de guidage inertiel des fusées\n→ Navigation par étoiles (horizon méridional)\n→ Constellation de la Carène\n\nCéphéide?: légères pulsations détectées\n\nÉtoile de l'hémisphère sud:\n→ Invisible depuis la plupart de l'Europe\n→ Circompolaire depuis l'Australie`,
      desc:'Supergéante blanche · 71 R☉ · 310 al\n2ème étoile la + brillante du ciel'
    },
    {
      name:'Déneb (α Cygni)',
      pos:[20000, 12000, -95000],
      starR: 18,  // 203 R☉
      col: 0xddeeff,
      nebulaCol: 0xaaccff,
      nebulaSize: 200,
      info:`💎 DÉNEB — LA LOINTAINE ET PUISSANTE\n\nType: A2 Ia (supergéante blanche)\nMasse: ~19 M☉\nRayon: ~203 R☉\nLuminosité: ~196 000 L☉ (×196 000 le Soleil!)\nTempérature: ~8 525 K\nDistance: ~2 600 années-lumière\n\nMalgré sa grande distance, brille à magnitude 1.25!\n→ Si Sirius était à cette distance → magnitude −9\n   (20× plus brillante que la Lune!)\n\nTriangle d'été (Triangle estival):\n→ Forme avec Véga et Altaïr\n→ Visible toutes les nuits d'été/automne\n\nNébuleuse North America (NGC 7000):\n→ À 3° de Déneb\n→ Illuminée par Déneb\n→ Forme ressemblant au continent américain du Nord\n\nFin de vie: supernova dans quelques Ma\nUne des + brillantes connues du voisinage galactique`,
      desc:'Supergéante blanche · 203 R☉ · 2 600 al\n196 000 L☉ · Triangle d\'été'
    },
  ];

  STARS.forEach(s=>{
    const g = new THREE.Group(); g.position.set(...s.pos); remarkableStarsGroup.add(g);

    // Nébuleuse volumétrique (sphère translucide layered)
    for(let layer=0; layer<5; layer++){
      const nebR = s.nebulaSize*(0.4+layer*0.18);
      const nebOpacity = 0.055 - layer*0.009;
      const nebMesh = new THREE.Mesh(
        new THREE.SphereGeometry(nebR, 20, 20),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(s.nebulaCol),
          transparent: true, opacity: nebOpacity,
          side: THREE.BackSide, depthWrite: false
        })
      );
      g.add(nebMesh);
    }

    // Halo lumineux de l'étoile (corona)
    const coronaMesh = new THREE.Mesh(
      new THREE.SphereGeometry(s.starR*4, 16, 16),
      new THREE.MeshBasicMaterial({color:new THREE.Color(s.col),transparent:true,opacity:0.06,side:THREE.BackSide})
    );
    g.add(coronaMesh);

    // Corps stellaire
    const starMesh = new THREE.Mesh(
      new THREE.SphereGeometry(s.starR, 32, 32),
      new THREE.MeshBasicMaterial({color:new THREE.Color(s.col)})
    );
    g.add(starMesh);
    // Enregistrer pour raycasting
    starMesh.userData = {name: s.name, info: s.info};
    stellarMeshes.push({mesh: starMesh, name: s.name, info: s.info});

    // Label
    const lbl = mkLabel(s.name+'\n'+s.desc, 'rgba(255,220,160,0.82)', 13);
    lbl.scale.set(Math.max(200, s.name.length*14), 42, 1);
    lbl.position.set(0, s.starR+18, 0); g.add(lbl);
  });
}

// ── ÉTOILES GÉANTES / SUPERGÉANTES ───────────────────────────
let giantStarGroup = null;

function _buildGiantStars(){
  giantStarGroup = new THREE.Group();
  scene.add(giantStarGroup);
  giantStarGroup.visible = false;

  const GIANTS_DEF = [
    {
      key:'betelgeuse', name:'Bételgeuse (α Orionis)',
      pos:[GC-35000, 2000, -320000],
      starR:420, col:0xff3300, emissiveCol:0x660800, coronaCol:'#ff2200',
      specType:'M1Ia · Supergéante rouge',
      info:`🔴 BÉTELGEUSE — SUPERGÉANTE ROUGE\n\nType: M1-M2 Ia (variable semi-régulière)\nMasse: ~20 M☉ · Rayon: 764–887 R☉\n→ Engloutirait l'orbite de Jupiter!\nLuminosité: ~100 000 L☉\nTempérature: 3 500 K\nDistance: ~700 années-lumière\n\nGrand évanouissement 2019-2020:\n-40% luminosité → éruption massière\n\nDestin: Supernova dans <100 000 ans\nVisible en plein jour depuis la Terre!\n\nTaches convectives géantes détectées\n(plusieurs fois la taille de la Terre)\nVents stellaires: 10⁻⁶ M☉/an`,
      nebRadius:2200, nebCol:0xff4400, nebN:15000,
      comp:null,
    },
    {
      key:'antares', name:'Antarès (α Scorpii)',
      pos:[GC-55000, -8000, -248000],
      starR:400, col:0xff2200, emissiveCol:0x550500, coronaCol:'#ff1100',
      specType:'M0.5Iab · Supergéante rouge + compagnon B2.5V',
      info:`🔴 ANTARÈS — LE CŒUR DU SCORPION\n\nType: M0.5Iab + B2.5V (binaire)\nMasse: ~11-12 M☉ · Rayon: 883 R☉\n→ Engloutirait l'orbite de Mars!\nLuminosité: ~57 500 L☉\nTempérature: 3 660 K\nDistance: ~550 années-lumière\n\nNom: "Anti-Arès" → rival de Mars (couleur rouge)\n\nCompagnon Antarès B:\n• Type B2.5V · séparation ~529 UA\n• Période: ~2 562 ans\n• Noyé dans la nébuleuse rouge d'Antarès\n\nNébuleuse de réflexion étendue:\n• ~5 années-lumière · couleur jaune-vert\n\nDestin: Supernova dans ~10 000-40 000 ans`,
      nebRadius:2000, nebCol:0xff3300, nebN:12000,
      comp:{col:0x8899ff, r:28, dist:800},
    },
    {
      key:'rigel', name:'Rigel (β Orionis)',
      pos:[GC-20000, 8000, -390000],
      starR:120, col:0xaabbff, emissiveCol:0x223366, coronaCol:'#6688ff',
      specType:'B8Ia · Supergéante bleue-blanche',
      info:`💙 RIGEL — LA SUPERGÉANTE BLEUE D'ORION\n\nType: B8Ia\nMasse: 17-23 M☉ · Rayon: 78 R☉\nLuminosité: 120 000 L☉(!)\n→ L'une des + lumineuses de la Galaxie\n→ Si à distance de Sirius: brillerait comme 1/4 Lune\n\nTempérature: 11 000-12 000 K\nDistance: ~860 années-lumière\n\nMagnitude absolue: -7.84\n7ème étoile la plus brillante du ciel\n\nSystème multiple:\n• Rigel B (B9V) + Rigel C\n• Séparation Rigel B-C: 2 200 UA\n\nNébuleuse de la Sorcière (IC 2118):\n• Nébuleuse de réflexion 3°×1°\n• Éclairée par Rigel (bleu-blanc)\n\nDestin: Supernova dans ~1 million d'années`,
      nebRadius:800, nebCol:0x3355cc, nebN:8000,
      comp:{col:0xddeeff, r:20, dist:500},
    },
  ];

  GIANTS_DEF.forEach(gd=>{
    const g=new THREE.Group();
    g.position.set(...gd.pos);
    g.userData={starKey:gd.key, starR:gd.starR};
    giantStarGroup.add(g);

    // Texture procédurale de surface
    const isRed=gd.col===0xff3300||gd.col===0xff2200;
    const starTex=TEXTURES.make(512,256,(ctx,W,H)=>{
      const id=ctx.createImageData(W,H);
      for(let y=0;y<H;y++) for(let x=0;x<W;x++){
        const u=x/W*6,v=y/H*3;
        const n=NOISE.fbm(u,v,7,gd.starR);
        const conv=NOISE.warpedFbm(u*0.5,v*0.5,4,42);
        const i=(y*W+x)*4;
        if(isRed){
          id.data[i]=Math.min(255,198+n*57+conv*18);
          id.data[i+1]=Math.min(255,58+n*32+conv*12);
          id.data[i+2]=Math.min(255,8+n*10);
        } else {
          id.data[i]=Math.min(255,138+n*42);
          id.data[i+1]=Math.min(255,162+n*40);
          id.data[i+2]=Math.min(255,232+n*22);
        }
        id.data[i+3]=255;
      }
      ctx.putImageData(id,0,0);
      // Limb darkening
      const cxL=W/2,cyL=H/2;
      const grad=ctx.createRadialGradient(cxL,cyL,W*0.05,cxL,cyL,W*0.48);
      grad.addColorStop(0,'rgba(0,0,0,0)');grad.addColorStop(0.7,'rgba(0,0,0,0)');grad.addColorStop(1,'rgba(0,0,0,0.58)');
      ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
    });

    const starMesh=new THREE.Mesh(new THREE.SphereGeometry(gd.starR,64,64),new THREE.MeshStandardMaterial({map:starTex,emissive:new THREE.Color(gd.emissiveCol),emissiveIntensity:0.4,roughness:0.9}));
    g.add(starMesh);
    registerStellar(starMesh, gd.name, gd.info);

    // Lumière
    g.add(new THREE.PointLight(gd.col, 3.0, gd.starR*30, 1.5));

    // Atmosphère/corona
    const coronaMat2=SHADERS.makeAtmosMaterial(gd.coronaCol, new THREE.Vector3(0,0,1), 1.8, 2.5);
    g.add(new THREE.Mesh(new THREE.SphereGeometry(gd.starR*1.25,32,32),coronaMat2));

    // Halos
    [1.6,2.2,3.5].forEach((m,i)=>{g.add(new THREE.Mesh(new THREE.SphereGeometry(gd.starR*m,16,16),new THREE.MeshBasicMaterial({color:gd.col,transparent:true,opacity:[0.12,0.06,0.025][i],side:THREE.BackSide,depthWrite:false})));});

    // Nébuleuse / vents stellaires
    {
      const nGeo=new THREE.BufferGeometry(),nPos=new Float32Array(gd.nebN*3),nCols=new Float32Array(gd.nebN*3);
      const nr=(gd.nebCol>>16)/255, ng=((gd.nebCol>>8)&0xff)/255, nb=(gd.nebCol&0xff)/255;
      for(let i=0;i<gd.nebN;i++){
        const phi2=Math.acos(2*Math.random()-1),th2=Math.random()*Math.PI*2;
        const rad=gd.starR*1.8+Math.random()*(gd.nebRadius-gd.starR*1.8);
        const fil=0.6+0.4*Math.abs(Math.sin(th2*3+phi2*2));
        nPos[i*3]=Math.sin(phi2)*Math.cos(th2)*rad*fil;
        nPos[i*3+1]=Math.sin(phi2)*Math.sin(th2)*rad*0.85;
        nPos[i*3+2]=Math.cos(phi2)*rad*fil;
        const b2=0.28+Math.random()*0.45*(1-rad/gd.nebRadius);
        nCols[i*3]=nr*b2;nCols[i*3+1]=ng*b2;nCols[i*3+2]=nb*b2;
      }
      nGeo.setAttribute('position',new THREE.BufferAttribute(nPos,3));
      nGeo.setAttribute('color',new THREE.BufferAttribute(nCols,3));
      g.add(new THREE.Points(nGeo,new THREE.PointsMaterial({size:gd.nebRadius*0.042,vertexColors:true,transparent:true,opacity:0.48,sizeAttenuation:true,depthWrite:false,blending:THREE.AdditiveBlending})));
      g.add(new THREE.Mesh(new THREE.SphereGeometry(gd.nebRadius*0.9,16,16),new THREE.MeshBasicMaterial({color:gd.col,transparent:true,opacity:0.035,side:THREE.DoubleSide,depthWrite:false})));
    }

    // Compagnon binaire
    if(gd.comp){
      const cMesh=new THREE.Mesh(new THREE.SphereGeometry(gd.comp.r,20,20),new THREE.MeshBasicMaterial({color:gd.comp.col}));
      cMesh.position.x=gd.comp.dist; g.add(cMesh);
      const cGlow=new THREE.Mesh(new THREE.SphereGeometry(gd.comp.r*2.5,12,12),new THREE.MeshBasicMaterial({color:gd.comp.col,transparent:true,opacity:0.08,side:THREE.BackSide}));
      cGlow.position.x=gd.comp.dist; g.add(cGlow);
      const cPts=[];for(let i=0;i<=80;i++){const a=(i/80)*Math.PI*2;cPts.push(new THREE.Vector3(Math.cos(a)*gd.comp.dist,Math.sin(a)*gd.comp.dist*0.15,Math.sin(a)*gd.comp.dist));}
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(cPts),new THREE.LineBasicMaterial({color:0x445566,transparent:true,opacity:0.3})));
    }

    // Label
    const lbl2=mkLabel(gd.name,'rgba(255,220,180,0.85)',14);
    lbl2.scale.set(gd.starR*3.5,gd.starR*0.45,1);
    lbl2.position.set(0,gd.starR*1.5,0); g.add(lbl2);
  });
}

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
  else if(key==='trappist'&&stellarSystemsGroup){
    const s=stellarSystemsGroup.children.find(c=>c.userData.systemName==='TRAPPIST-1');
    if(s){const wp=new THREE.Vector3();s.getWorldPosition(wp);camGoal.copy(wp);radiusGoal=80;}
  }
  else if(key==='tauceti'&&stellarSystemsGroup){
    const s=stellarSystemsGroup.children.find(c=>c.userData.systemName==='Tau Ceti');
    if(s){const wp=new THREE.Vector3();s.getWorldPosition(wp);camGoal.copy(wp);radiusGoal=80;}
  }
  else if(key==='kepler452'&&stellarSystemsGroup){
    const s=stellarSystemsGroup.children.find(c=>c.userData.systemName==='Kepler-452');
    if(s){const wp=new THREE.Vector3();s.getWorldPosition(wp);camGoal.copy(wp);radiusGoal=150;}
  }
  else if(key==='andromeda'&&andG){camGoal.copy(andG.position);radiusGoal=AND_R*3.2;phi=1.05;theta=0.5;}
  else if(key==='localgroup'){camGoal.set(AND_DIST*0.3,AND_DIST*0.1,0);radiusGoal=AND_DIST*1.5;}
  // ── Lunes ──
  else if(key.startsWith('moon-')){
    const moonName=key.replace('moon-','');
    const moonMap={
      'lune':'Lune','io':'Io','europe':'Europe',
      'ganymede':'Ganymède','callisto':'Callisto',
      'titan':'Titan','encelade':'Encelade','triton':'Triton'
    };
    const targetName=moonMap[moonName];
    if(targetName){
      // Chercher le mesh de la lune dans tous les pivots
      for(const pd of PLANETS_DATA){
        const pm=PM[pd.id]; if(!pm) continue;
        for(const mp of pm.moonPivots){
          if(mp.data.name===targetName){
            const wp=new THREE.Vector3();
            mp.mesh.getWorldPosition(wp);
            camGoal.copy(wp);
            radiusGoal=Math.max(0.8,pR(mp.data.km)*6)+2;
            break;
          }
        }
      }
    }
  }
  // ── Étoiles géantes ──
  else if(key==='betelgeuse'&&giantStarGroup){
    const g=giantStarGroup.children.find(c=>c.userData.starKey==='betelgeuse');
    if(g){const wp=new THREE.Vector3();g.getWorldPosition(wp);camGoal.copy(wp);radiusGoal=g.userData.starR*25;}
  }
  else if(key==='antares'&&giantStarGroup){
    const g=giantStarGroup.children.find(c=>c.userData.starKey==='antares');
    if(g){const wp=new THREE.Vector3();g.getWorldPosition(wp);camGoal.copy(wp);radiusGoal=g.userData.starR*25;}
  }
  else if(key==='rigel'&&giantStarGroup){
    const g=giantStarGroup.children.find(c=>c.userData.starKey==='rigel');
    if(g){const wp=new THREE.Vector3();g.getWorldPosition(wp);camGoal.copy(wp);radiusGoal=g.userData.starR*20;}
  }
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
  document.getElementById('btn-orbits').onclick=()=>{
    // Toggle TOUTES les orbites (planètes + lunes)
    orbPlanetsVis=!orbPlanetsVis;
    planetOrbitLines.forEach(l=>l.visible=orbPlanetsVis);
    moonOrbitLines.forEach(l=>l.visible=orbPlanetsVis);
    orbMoonsVis=orbPlanetsVis;
    document.getElementById('btn-orbits').classList.toggle('active',!orbPlanetsVis);
  };
  document.getElementById('btn-moons-orb').onclick=()=>{
    // Toggle uniquement orbites des lunes
    orbMoonsVis=!orbMoonsVis;
    moonOrbitLines.forEach(l=>l.visible=orbMoonsVis);
    document.getElementById('btn-moons-orb').classList.toggle('active',!orbMoonsVis);
  };
  document.getElementById('btn-labels').onclick=()=>{lblVis=!lblVis;Object.values(PM).forEach(p=>p.lbl&&(p.lbl.visible=lblVis));document.getElementById('btn-labels').classList.toggle('active',!lblVis);};

  const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();
  function raycast(cx,cy){
    mouse.x=(cx/window.innerWidth)*2-1;mouse.y=-(cy/window.innerHeight)*2+1;
    ray.setFromCamera(mouse,camera);
    const pMs=PLANETS_DATA.map(p=>PM[p.id]?.mesh).filter(Boolean);
    const lagMeshes=lagMs.map(l=>l.mesh);
    const stellarMeshList=stellarMeshes.map(s=>s.mesh);
    const moonMeshList=moonMeshRegistry.map(m=>m.mesh);
    const extras=[issMesh,...(hubMesh?.children||[]),...(jwstMesh?.children||[]),...(proxbMesh?[proxbMesh]:[])].filter(Boolean);
    const hits=ray.intersectObjects([...pMs,...lagMeshes,...extras,...stellarMeshList,...moonMeshList],true);
    if(!hits.length){document.getElementById('info').classList.remove('show');return;}
    const obj=hits[0].object;
    let name='',info='';
    const pi=pMs.indexOf(obj);
    if(pi>=0){name=PLANETS_DATA[pi].name;info=PLANETS_DATA[pi].info;}
    else if(obj===issMesh){name='🛰 ISS';info='Station Spatiale Internationale\nAlt: ~408 km · 27 600 km/h\nPériode: 92 min · Lancée: 1998';}
    else if(hubMesh?.children.includes(obj)){name='🔭 Hubble';info='Télescope Spatial Hubble\nAlt: ~540 km · Lancé: 1990\nMiroir: 2.4 m';}
    else if(jwstMesh?.children.includes(obj)){name='🌌 JWST';info='James Webb Space Telescope\nPoint L2 · 1.5 M km\nLancé: 2021 · Miroir: 6.5 m';}
    else if(obj===proxbMesh){name='Proxima b';info='Exoplanète candidate habitable\nProxima Centauri · 4.24 al\nPériode: 11.2 jours';}
    else if(obj.userData?.name){name=obj.userData.name;info=obj.userData.info||'';}
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
    c.mesh.position.copy(p3); c.coma.position.copy(p3);
    const distSun=p3.length();
    const prox=Math.max(0,1-distSun/(c.periR*8));
    c.coma.material.opacity=prox*0.22;
    // Queue toujours pointée à l'opposé du Soleil
    const awayFromSun=p3.clone().normalize();
    if(prox>0.04){
      const tailLen=c.dust.scale.y;
      const tailBase=p3.clone().addScaledVector(awayFromSun,tailLen*0.5*prox);
      c.dust.position.copy(tailBase); c.ion.position.copy(tailBase);
      // Angle 2D anti-soleil (sprites orientés correctement)
      const ang2d=Math.atan2(awayFromSun.z,awayFromSun.x);
      c.dust.material.rotation=ang2d-Math.PI*0.5;
      c.ion.material.rotation =ang2d-Math.PI*0.5;
      c.dust.visible=true; c.ion.visible=true;
      c.dust.material.opacity=0.82*prox;
      c.ion.material.opacity =0.62*prox;
    } else {
      c.dust.visible=false; c.ion.visible=false;
    }
    // Seul le noyau tourne sur lui-même (réaliste)
    c.mesh.rotation.y+=0.008*speed;
    c.mesh.rotation.x+=0.005*speed;
  }

  if(acaMesh)acaMesh.rotation.y+=0.006*speed;
  if(acbMesh)acbMesh.rotation.y+=0.005*speed;
  if(acbPiv)acbPiv.rotation.y=T*0.001;
  if(proxbPiv)proxbPiv.rotation.y=T*0.018;
  if(acaCorona?.uniforms?.uTime)acaCorona.uniforms.uTime.value=tu;
  if(phRing)phRing.rotation.z+=0.018*speed;

  // Animation orbitale des exoplanètes dans les systèmes stellaires
  if(stellarSystemsGroup){
    stellarSystemsGroup.children.forEach(sysGroup=>{
      const epData=sysGroup.userData.exoplanets;
      if(!epData) return;
      let epIdx=0;
      sysGroup.children.forEach(child=>{
        if(child.userData?.orbit && child instanceof THREE.Mesh){
          const ep=epData[epIdx++];
          if(!ep) return;
          // Vitesse angulaire proportionnelle à la période (loi de Kepler)
          child.userData.phase=(child.userData.phase||0)+(0.001/Math.max(1,ep.period))*speed*50;
          child.position.set(
            Math.cos(child.userData.phase)*ep.orb,
            0,
            Math.sin(child.userData.phase)*ep.orb
          );
        }
      });
    });
  }

  const inGal=radius>65000||curTarget==='milkyway'||curTarget==='sgra';
  const inAnd=radius>5000000||curTarget==='andromeda'||curTarget==='localgroup';
  const inAC=(radius>15000&&radius<4000000)||curTarget==='alphacentauri'||curTarget==='barnard'||curTarget==='sirius';
  if(galGroup)galGroup.visible=inGal;
  if(andG)andG.visible=inAnd;
  magClouds.forEach(c=>c.group.visible=inGal);
  if(acG)acG.visible=inAC;
  nearbyGroup.visible=inAC;
  if(stellarSystemsGroup)stellarSystemsGroup.visible=inGal;
  if(giantStarGroup)giantStarGroup.visible=inGal;
  if(remarkableStarsGroup)remarkableStarsGroup.visible=(radius>8000||inAC);

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