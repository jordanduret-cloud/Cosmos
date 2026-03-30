// ═══════════════════════════════════════════════════════════════
// GALAXY.JS — Haute résolution PC : Voie Lactée, Sgr A*, Andromède
// ═══════════════════════════════════════════════════════════════
'use strict';

window.GALAXY = (function(){

  const GC  = 1800000;
  const MWR = 3100000;
  const MWT = 80000;

  function sr(s){ return Math.abs((Math.sin(s*127.1)*43758.5453)%1); }

  function makePoints(N, posFn, colFn, sizeFn, opacity){
    const pos=new Float32Array(N*3), cols=new Float32Array(N*3), sizes=new Float32Array(N), alphas=new Float32Array(N);
    for(let i=0;i<N;i++){
      const p=posFn(i); pos[i*3]=p[0];pos[i*3+1]=p[1];pos[i*3+2]=p[2];
      const c=colFn(i); cols[i*3]=Math.min(1,c[0]);cols[i*3+1]=Math.min(1,c[1]);cols[i*3+2]=Math.min(1,c[2]);
      sizes[i]=sizeFn(i);
      alphas[i]=opacity*(0.55+sr(i+1000)*0.45);
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',   new THREE.BufferAttribute(pos,3));
    geo.setAttribute('aColor',     new THREE.BufferAttribute(cols,3));
    geo.setAttribute('aSize',      new THREE.BufferAttribute(sizes,1));
    geo.setAttribute('aAlpha',     new THREE.BufferAttribute(alphas,1));
    return geo;
  }

  // Spirale logarithmique réaliste
  function spiralPoint(a0, t, scatter, seed){
    const b=0.28, r0=14000;
    const theta=a0+t*4.5;
    const r=r0*Math.exp(b*t*1.1)*(0.75+sr(seed)*0.5);
    return [GC+Math.cos(theta)*r+(sr(seed+1)-0.5)*r*scatter, 0, Math.sin(theta)*r+(sr(seed+2)-0.5)*r*scatter];
  }

  function buildMilkyWay(parent){
    // 4 bras principaux — haute densité PC
    const ARMS=[
      {a:0.00,  N:40000, col:(t,r)=>[0.38+r*0.38, 0.50+t*0.22, 0.94+r*0.05]},  // Persée — bleu-blanc
      {a:1.57,  N:40000, col:(t,r)=>[0.90+r*0.08, 0.62+t*0.22, 0.28+t*0.12]},  // Sagittaire — orangé
      {a:3.14,  N:36000, col:(t,r)=>[0.52+r*0.32, 0.46+r*0.30, 0.92+r*0.06]},  // Norma-Cygne — violet
      {a:4.71,  N:38000, col:(t,r)=>[0.94+r*0.05, 0.60+t*0.22, 0.22+r*0.10]},  // Scutum-Centaure — jaune
    ];

    ARMS.forEach((arm,ai)=>{
      const geo=makePoints(arm.N,
        (i)=>{
          const t=Math.pow(sr(i*3+ai*1000),0.58);
          const yH=MWT*(1-t*0.55)*(sr(i*7+1)-0.5);
          const p=spiralPoint(arm.a,t,0.12,i*5+ai*777);
          return[p[0],p[1]+yH,p[2]];
        },
        (i)=>arm.col(Math.pow(sr(i*3+ai*1000),0.58),sr(i*11+2)),
        ()=>1800+sr(i=>i)*700,
        0.62
      );
      parent.add(new THREE.Points(geo,SHADERS.makeGalaxyMaterial()));
    });

    // Bras d'Orion — notre bras local (plus fin)
    {
      const geo=makePoints(15000,
        (i)=>{
          const t=Math.pow(sr(i*3+5000),0.55);
          const theta=-0.35+t*1.8+(sr(i*7)-0.5)*0.3;
          const b=0.28,r0=24000;
          const r=r0*Math.exp(b*t*0.8)*(0.8+sr(i*11)*0.35);
          return[GC+Math.cos(theta)*r+(sr(i*13)-0.5)*r*0.10,MWT*0.8*(1-t*0.5)*(sr(i*19)-0.5),Math.sin(theta)*r+(sr(i*17)-0.5)*r*0.10];
        },
        (i)=>sr(i*5)<0.5?[0.55+sr(i*9)*0.35,0.68+sr(i*13)*0.22,0.96+sr(i*17)*0.04]:[0.88,0.90,0.98],
        ()=>1500+sr(Math.random()*9999)*600,
        0.58
      );
      parent.add(new THREE.Points(geo,SHADERS.makeGalaxyMaterial()));
    }

    // Régions HII — nébuleuses d'émission rose/rouge
    {
      const geo=makePoints(12000,
        (i)=>{
          const arm=Math.floor(sr(i*3)*4)*Math.PI*0.5;
          const t=sr(i*5);
          const p=spiralPoint(arm,t*0.88+0.06,0.08,i*7+8888);
          return[p[0],p[1]+MWT*0.45*(sr(i*11)-0.5),p[2]];
        },
        (i)=>sr(i*9)<0.55?[0.95+sr(i*13)*0.05,0.20+sr(i*17)*0.28,0.38+sr(i*19)*0.28]:[0.18,0.52+sr(i*11)*0.25,1.0],
        ()=>3200+sr(Math.random()*9999)*1400,
        0.42
      );
      parent.add(new THREE.Points(geo,SHADERS.makeGalaxyMaterial()));
    }

    // Étoiles inter-bras — Population II vieilles
    {
      const geo=makePoints(50000,
        (i)=>{
          const r=(3000+sr(i*3)*MWR)*Math.sqrt(sr(i*5));
          const a=sr(i*7)*Math.PI*2;
          return[GC+Math.cos(a)*r,MWT*2.5*(sr(i*11)-0.5)*Math.exp(-r/MWR*1.5),Math.sin(a)*r];
        },
        (i)=>{const b=0.12+sr(i*13)*0.26;return[b*0.88,b*0.78,b*0.55];},
        ()=>820+sr(Math.random()*9999)*380,
        0.30
      );
      parent.add(new THREE.Points(geo,SHADERS.makeGalaxyMaterial()));
    }

    // Bulbe central — barre galactique
    {
      const geo=makePoints(30000,
        (i)=>{
          const r=sr(i*3)*350000, th=sr(i*5)*Math.PI*2, ph=Math.acos(2*sr(i*7)-1);
          const bar=1.0+(Math.abs(Math.cos(th*2))*1.5);
          return[GC+Math.sin(ph)*Math.cos(th)*r*bar*0.68,Math.sin(ph)*Math.sin(th)*r*0.38,Math.cos(ph)*r];
        },
        (i)=>{const h=0.5+sr(i*11)*0.5;return[h,h*0.65,h*0.24];},
        ()=>2800+sr(Math.random()*9999)*1200,
        0.92
      );
      parent.add(new THREE.Points(geo,SHADERS.makeGalaxyMaterial()));
    }

    // Amas du noyau stellaire (très dense, autour de Sgr A*)
    {
      const geo=makePoints(8000,
        (i)=>{
          const r=sr(i*3)*28000, th=sr(i*5)*Math.PI*2, ph=Math.acos(2*sr(i*7)-1);
          return[GC+Math.sin(ph)*Math.cos(th)*r,Math.sin(ph)*Math.sin(th)*r*0.45,Math.cos(ph)*r];
        },
        (i)=>{const h=0.72+sr(i*9)*0.28;return[h,h*0.74,h*0.38];},
        ()=>3800+sr(Math.random()*9999)*1600,
        0.96
      );
      parent.add(new THREE.Points(geo,SHADERS.makeGalaxyMaterial()));
    }

    // Halo galactique
    {
      const geo=makePoints(10000,
        (i)=>{
          const r=MWR*(0.4+sr(i*3)*0.9), th=sr(i*5)*Math.PI*2, ph=Math.acos(2*sr(i*7)-1);
          return[GC+Math.sin(ph)*Math.cos(th)*r,Math.sin(ph)*Math.sin(th)*r*0.58,Math.cos(ph)*r];
        },
        (i)=>{const b=0.12+sr(i*11)*0.22;return[b*0.85,b*0.72,b*0.45];},
        ()=>2200+sr(Math.random()*9999)*900,
        0.20
      );
      parent.add(new THREE.Points(geo,SHADERS.makeGalaxyMaterial()));
    }

    // 45 amas globulaires
    for(let gc=0;gc<45;gc++){
      const r=120000+sr(gc*3)*1600000, th=sr(gc*5)*Math.PI*2, ph=Math.acos(2*sr(gc*7)-1);
      const cx=GC+Math.sin(ph)*Math.cos(th)*r, cy=Math.sin(ph)*Math.sin(th)*r*0.65, cz=Math.cos(ph)*r;
      const geo=makePoints(250,
        (i)=>{const dr=sr(i*3)*18000,ta=sr(i*5)*Math.PI*2,pa=Math.acos(2*sr(i*7)-1);return[cx+Math.sin(pa)*Math.cos(ta)*dr,cy+Math.sin(pa)*Math.sin(ta)*dr,cz+Math.cos(pa)*dr];},
        ()=>[0.98,0.90,0.58], ()=>4500, 0.75
      );
      parent.add(new THREE.Points(geo,SHADERS.makeGalaxyMaterial()));
    }

    // Marqueur du Système Solaire
    parent.add(new THREE.Mesh(new THREE.SphereGeometry(10000,8,8),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.92})));
    const pts=[];for(let i=0;i<=120;i++){const a=(i/120)*Math.PI*2;pts.push(new THREE.Vector3(GC+Math.cos(a)*26000,0,Math.sin(a)*26000));}
    parent.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0x88ddff,transparent:true,opacity:0.72})));
  }

  // ── SGR A* — TROU NOIR HAUTE QUALITÉ ─────────────────────────
  function buildSgrA(parent){
    const BHR=38000;
    const g=new THREE.Group(); g.position.set(GC,0,0); parent.add(g);

    // Event horizon
    g.add(new THREE.Mesh(new THREE.SphereGeometry(BHR,64,64),new THREE.MeshBasicMaterial({color:0x000000})));

    // Photon sphere
    const phRing=new THREE.Mesh(new THREE.TorusGeometry(BHR*1.5,BHR*0.14,48,160),new THREE.MeshBasicMaterial({color:0xff8800,transparent:true,opacity:0.92}));
    phRing.rotation.x=Math.PI/2; g.add(phRing);

    // ISCO (innermost stable orbit)
    g.add(new THREE.Mesh(new THREE.TorusGeometry(BHR*3,BHR*0.06,16,80),new THREE.MeshBasicMaterial({color:0xff5500,transparent:true,opacity:0.52})));

    // Disque d'accrétion — shader physique
    const disk=SHADERS.makeAccretionDisk(BHR*1.22,BHR*5.8);
    disk.rotation.x=Math.PI/2; g.add(disk);

    // Anneau chaud interne (plus brillant, plus fin)
    const innerDisk=SHADERS.makeAccretionDisk(BHR*1.22,BHR*2.2);
    innerDisk.rotation.x=Math.PI/2;
    if(innerDisk.material?.uniforms) innerDisk.material.uniforms.uInnerR={value:BHR*1.22};
    g.add(innerDisk);

    // Halo de gaz chaud
    {
      const geo=makePoints(15000,
        (i)=>{const r=BHR*(1.25+sr(i*3)*4.5),a=sr(i*5)*Math.PI*2,y=(sr(i*7)-0.5)*BHR*0.28;return[Math.cos(a)*r,y,Math.sin(a)*r];},
        (i)=>{const heat=1-Math.min(1,(sr(i*3)*BHR*3.5)/(BHR*4.5));return[1,heat*0.52,heat*0.08];},
        ()=>BHR*0.055, 0.9
      );
      g.add(new THREE.Points(geo,SHADERS.makeGalaxyMaterial()));
    }

    // Anneau extérieur refroidi
    {
      const geo=makePoints(8000,
        (i)=>{const r=BHR*(5+sr(i*3)*4),a=sr(i*5)*Math.PI*2,y=(sr(i*7)-0.5)*BHR*0.4;return[Math.cos(a)*r,y,Math.sin(a)*r];},
        (i)=>{const h=0.32+sr(i*9)*0.28;return[h,h*0.26,0];},
        ()=>BHR*0.072, 0.55
      );
      g.add(new THREE.Points(geo,SHADERS.makeGalaxyMaterial()));
    }

    // Jets relativistes bipolaires
    [-1,1].forEach(dir=>{
      const pts=[new THREE.Vector3(0,0,0),new THREE.Vector3(0,dir*BHR*18,0)];
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0x44aaff,transparent:true,opacity:0.78})));
      const geo=makePoints(1500,
        (i)=>{const t=sr(i*3),y2=dir*t*BHR*17,sp=t*BHR*3.2,a=sr(i*5)*Math.PI*2;return[Math.cos(a)*sp*sr(i*7),y2,Math.sin(a)*sp*sr(i*9)];},
        (i)=>{const t=sr(i*3);return[0.22+t*0.38,0.58+t*0.32,1.0];},
        ()=>BHR*0.092, 0.65
      );
      g.add(new THREE.Points(geo,SHADERS.makeGalaxyMaterial()));
    });

    // Labels
    function glbl(txt,y,col,sx,sy){
      const c=document.createElement('canvas');c.width=512;c.height=56;
      const x=c.getContext('2d');x.font='16px monospace';x.fillStyle=col;x.textAlign='center';x.fillText(txt,256,38);
      const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true}));
      s.scale.set(sx,sy,1);s.position.set(0,y,0);g.add(s);
    }
    glbl('Sgr A*  ·  4.15 millions M☉  ·  Rs ≈ 12 millions km', BHR*7,  'rgba(255,178,76,0.88)', BHR*10, BHR*1.1);
    glbl('Horizon des événements', BHR*2.6, 'rgba(255,118,38,0.78)', BHR*6.5, BHR*0.88);
    glbl('Sphère photonique  (1.5 × Rs)', -BHR*3.2,'rgba(255,168,42,0.62)', BHR*7, BHR*0.80);
    glbl('ISCO  (3 × Rs — orbite stable min.)', -BHR*5.5,'rgba(255,88,22,0.50)', BHR*8, BHR*0.75);

    return{group:g, phRing, disk, BHR};
  }

  // ── ANDROMÈDE HAUTE RÉSOLUTION ────────────────────────────────
  function buildAndromeda(parent, AND_DIST){
    const AND_R=MWR*1.15, AND_T=MWT*1.4;
    const g=new THREE.Group();
    g.position.set(AND_DIST*0.58, AND_DIST*0.28, AND_DIST*0.76);
    parent.add(g);
    const TILT=1.35;

    function andArm(a0,N,cFn){
      const geo=makePoints(N,
        (i)=>{
          const t=Math.pow(sr(i*3+a0*100),0.55);
          const b=0.28,r0=10000;
          const th=a0+t*4.0+(sr(i*7)-0.5)*0.55;
          const r=(r0+t*AND_R*0.95)*(0.8+sr(i*11)*0.42);
          const x2=Math.cos(th)*r+(sr(i*13)-0.5)*r*0.18;
          const z2=Math.sin(th)*r+(sr(i*13)-0.5)*r*0.18;
          const y2=AND_T*(1-t*0.5)*(sr(i*17)-0.5);
          return[x2, y2*Math.cos(TILT)-z2*Math.sin(TILT), y2*Math.sin(TILT)+z2*Math.cos(TILT)];
        },
        cFn,
        ()=>2300+sr(Math.random()*9999)*950,
        0.66
      );
      g.add(new THREE.Points(geo,SHADERS.makeGalaxyMaterial()));
    }

    andArm(0,    30000, (i)=>sr(i*5)<0.5?[0.40+sr(i*9)*0.38,0.50+sr(i*13)*0.22,0.94+sr(i*17)*0.05]:[0.88,0.90,0.98]);
    andArm(1.57, 30000, (i)=>sr(i*5)<0.5?[0.90+sr(i*9)*0.08,0.62+sr(i*13)*0.20,0.28+sr(i*17)*0.12]:[0.98,0.88,0.62]);
    andArm(3.14, 30000, (i)=>sr(i*5)<0.5?[0.52+sr(i*9)*0.30,0.46+sr(i*13)*0.28,0.92+sr(i*17)*0.06]:[0.80,0.85,0.98]);
    andArm(4.71, 28000, (i)=>sr(i*5)<0.5?[0.94+sr(i*9)*0.05,0.62+sr(i*13)*0.20,0.24+sr(i*17)*0.10]:[1.0,0.90,0.65]);

    // Fond inter-bras
    {
      const geo=makePoints(32000,
        (i)=>{
          const r=(4000+sr(i*3)*AND_R)*Math.sqrt(sr(i*5));
          const a=sr(i*7)*Math.PI*2,x2=Math.cos(a)*r,z2=Math.sin(a)*r,y2=(sr(i*9)-0.5)*AND_T*2.5;
          return[x2, y2*Math.cos(TILT)-z2*Math.sin(TILT), y2*Math.sin(TILT)+z2*Math.cos(TILT)];
        },
        (i)=>{const b=0.10+sr(i*13)*0.25;return[b*0.85,b*0.76,b*0.55];},
        ()=>980+sr(Math.random()*9999)*420, 0.28
      );
      g.add(new THREE.Points(geo,SHADERS.makeGalaxyMaterial()));
    }

    // Bulbe dense
    {
      const geo=makePoints(22000,
        (i)=>{
          const r=sr(i*3)*380000,th=sr(i*5)*Math.PI*2,ph=Math.acos(2*sr(i*7)-1);
          const x2=Math.sin(ph)*Math.cos(th)*r,z2=Math.cos(ph)*r,y2=Math.sin(ph)*Math.sin(th)*r*0.38;
          return[x2, y2*Math.cos(TILT)-z2*Math.sin(TILT), y2*Math.sin(TILT)+z2*Math.cos(TILT)];
        },
        (i)=>{const h=0.5+sr(i*11)*0.5;return[h*0.88,h*0.58,h*0.18];},
        ()=>3000+sr(Math.random()*9999)*1200, 0.93
      );
      g.add(new THREE.Points(geo,SHADERS.makeGalaxyMaterial()));
    }

    // Halo
    {
      const geo=makePoints(6000,
        (i)=>{const r=AND_R*(0.4+sr(i*3)*0.7),th=sr(i*5)*Math.PI*2,ph=Math.acos(2*sr(i*7)-1);return[Math.sin(ph)*Math.cos(th)*r,Math.sin(ph)*Math.sin(th)*r*0.55,Math.cos(ph)*r];},
        (i)=>{const b=0.10+sr(i*11)*0.20;return[b*0.82,b*0.70,b*0.42];},
        ()=>2400+sr(Math.random()*9999)*900, 0.17
      );
      g.add(new THREE.Points(geo,SHADERS.makeGalaxyMaterial()));
    }

    // Galaxies satellites M32 et M110
    [[AND_R*.28,AND_R*.08,AND_R*.12,AND_R*.045,3500,[0.9,0.76,0.5]],
     [-AND_R*.22,-AND_R*.10,AND_R*.18,AND_R*.075,4500,[0.72,0.65,0.48]]
    ].forEach(([cx,cy,cz,rad,N2,col])=>{
      const geo=makePoints(N2,(i)=>{const r=sr(i*3)*rad,a=sr(i*5)*Math.PI*2;return[cx+Math.cos(a)*r,cy+(sr(i*7)-0.5)*rad*0.4,cz+Math.sin(a)*r];},()=>col,()=>rad*0.065,0.65);
      g.add(new THREE.Points(geo,SHADERS.makeGalaxyMaterial()));
    });

    return{group:g, AND_R, AND_T};
  }

  // ── NUAGES DE MAGELLAN ────────────────────────────────────────
  function buildMagellanicClouds(parent){
    const clouds=[
      {pos:[-780000,-1150000,1150000],R:520000,N:9000,col:[0.92,0.85,0.58],label:'Grand Nuage de Magellan · 160 000 al'},
      {pos:[-1150000,-950000,1260000],R:315000,N:4500,col:[0.80,0.80,0.68],label:'Petit Nuage de Magellan · 200 000 al'},
    ];
    return clouds.map(c=>{
      const g=new THREE.Group(); g.position.set(...c.pos); parent.add(g);
      const geo=makePoints(c.N,(i)=>{const r=sr(i*3)*c.R,a=sr(i*5)*Math.PI*2;return[Math.cos(a)*r,(sr(i*7)-0.5)*c.R*0.62,Math.sin(a)*r];},()=>c.col,()=>c.R*0.066,0.74);
      g.add(new THREE.Points(geo,SHADERS.makeGalaxyMaterial()));
      const lc=document.createElement('canvas');lc.width=512;lc.height=56;
      const lx=lc.getContext('2d');lx.font='15px monospace';lx.fillStyle='rgba(255,240,168,.68)';lx.textAlign='center';lx.fillText(c.label,256,38);
      const ls=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(lc),transparent:true}));
      ls.scale.set(c.R*1.5,c.R*0.20,1);ls.position.set(0,c.R*1.0,0);g.add(ls);
      return{group:g,...c};
    });
  }

  return{buildMilkyWay, buildSgrA, buildAndromeda, buildMagellanicClouds, GC, MWR, MWT, makePoints};
})();
