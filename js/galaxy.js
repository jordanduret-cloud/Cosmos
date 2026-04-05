// ═══════════════════════════════════════════════════════════════
// GALAXY.JS — Voie Lactée photoréaliste + Andromède + Sgr A*
// Couleurs basées sur la population stellaire réelle
// Spirales logarithmiques précises (Reid et al. 2014)
// ═══════════════════════════════════════════════════════════════
'use strict';

window.GALAXY = (function(){

  const GC  = 1800000;   // Centre galactique (scène)
  const MWR = 3100000;   // Rayon MW
  const MWT = 75000;     // Épaisseur disque

  // Générateur pseudo-aléatoire déterministe
  function sr(s){ const x=Math.sin(s*127.1+74.3)*43758.5453; return x-Math.floor(x); }
  function sr2(a,b){ return sr(a*311.7+b*127.1); }

  // ── COULEURS STELLAIRES RÉALISTES ────────────────────────────
  // Basées sur la photométrie réelle des bras spiraux
  // Les bras sont BLEUS (jeunes étoiles O/B chaudes + nébuleuses)
  // Inter-bras sont JAUNE-ORANGÉ (vieilles étoiles K/G)
  // Bulbe est JAUNE-ROUGE (Population II ancienne)

  function colorYoungHot(i){    // O/B stars — bleu très pur
    const v=0.85+sr(i*7)*0.15;
    return [v*0.55+sr(i*11)*0.1, v*0.70+sr(i*13)*0.1, v];
  }
  function colorMainSeqA(i){    // A stars — blanc-bleu
    const v=0.90+sr(i*7)*0.10;
    return [v*0.82, v*0.88, v];
  }
  function colorSunLike(i){     // F/G stars — blanc-jaune
    return [0.98+sr(i*7)*0.02, 0.92+sr(i*11)*0.06, 0.70+sr(i*13)*0.15];
  }
  function colorOldOrange(i){   // K stars — orange doux
    return [1.0, 0.70+sr(i*7)*0.15, 0.35+sr(i*11)*0.15];
  }
  function colorRedGiant(i){    // M giants — rouge-orangé
    return [1.0, 0.48+sr(i*7)*0.18, 0.18+sr(i*11)*0.15];
  }
  function colorHII(i){         // Nébuleuses HII — rose/magenta
    return [0.95+sr(i*7)*0.05, 0.22+sr(i*11)*0.18, 0.55+sr(i*13)*0.20];
  }
  function colorHIIBlue(i){     // Nébuleuses OB — bleu électrique
    return [0.12+sr(i*7)*0.15, 0.52+sr(i*11)*0.25, 1.0];
  }
  function colorDust(i){        // Nuages de poussière — brun sombre
    return [0.38+sr(i*7)*0.12, 0.25+sr(i*11)*0.10, 0.15+sr(i*13)*0.08];
  }

  // ── CONSTRUCTION DES POINTS ──────────────────────────────────
  function buildGeo(N, posFn, colFn, sizeFn){
    const pos=new Float32Array(N*3), cols=new Float32Array(N*3), sizes=new Float32Array(N), alphas=new Float32Array(N);
    for(let i=0;i<N;i++){
      const p=posFn(i); pos[i*3]=p[0]; pos[i*3+1]=p[1]; pos[i*3+2]=p[2];
      const c=colFn(i); cols[i*3]=Math.min(1,c[0]); cols[i*3+1]=Math.min(1,c[1]); cols[i*3+2]=Math.min(1,c[2]);
      sizes[i]=sizeFn(i);
      alphas[i]=0.5+sr(i+9999)*0.5;
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',   new THREE.BufferAttribute(pos,3));
    geo.setAttribute('aColor',     new THREE.BufferAttribute(cols,3));
    geo.setAttribute('aSize',      new THREE.BufferAttribute(sizes,1));
    geo.setAttribute('aAlpha',     new THREE.BufferAttribute(alphas,1));
    return geo;
  }

  function addPoints(parent, N, posFn, colFn, sizeFn){
    const geo = buildGeo(N, posFn, colFn, sizeFn);
    parent.add(new THREE.Points(geo, SHADERS.makeGalaxyMaterial()));
  }

  // ── SPIRALE LOGARITHMIQUE ────────────────────────────────────
  // r = r_min * exp(b * theta) — b=0.28 pour la Voie Lactée
  function logSpiral(armAngle, t, seed, scatter=0.10){
    const b = 0.28;
    const r_min = 12000;
    const theta = armAngle + t * 4.8;
    const r = r_min * Math.exp(b * t) * (0.82 + sr(seed) * 0.36);
    const sc = r * scatter;
    return [
      GC + Math.cos(theta) * r + (sr(seed+1)-0.5)*sc,
      (sr(seed+2)-0.5) * MWT * (1 - t*0.6),
      Math.sin(theta) * r + (sr(seed+3)-0.5)*sc
    ];
  }

  // ── VOIE LACTÉE ──────────────────────────────────────────────
  function buildMilkyWay(parent){

    // ── BRAS PRINCIPAUX ─────────────────────────────────────────
    // 4 bras: Persée (0°), Sagittaire (90°), Norma-Cygne (180°), Scutum (270°)
    // Chaque bras = 3 couches superposées:
    //   1. Étoiles O/B jeunes et chaudes (bleu vif) — sur le bras
    //   2. Étoiles F/G (blanc-jaune) — légèrement dispersées
    //   3. Régions HII rose-magenta — knots le long du bras

    const ARM_CONFIGS = [
      { angle: 0.00,  name: 'Perseus',   N_hot:22000, N_warm:18000, N_hii:6000 },
      { angle: 1.571, name: 'Sagittarius',N_hot:22000, N_warm:18000, N_hii:6000 },
      { angle: 3.142, name: 'Norma',      N_hot:20000, N_warm:16000, N_hii:5000 },
      { angle: 4.712, name: 'Scutum',     N_hot:21000, N_warm:17000, N_hii:5500 },
    ];

    ARM_CONFIGS.forEach((arm, ai)=>{
      const seed_off = ai * 10000;

      // Couche 1 — Étoiles O/B chaudes (BLEU VIF) — noyau du bras
      addPoints(parent, arm.N_hot,
        (i)=>{
          const t = Math.pow(sr(i*3+seed_off), 0.5);
          return logSpiral(arm.angle, t, i+seed_off, 0.07);
        },
        (i)=>{
          const t = Math.pow(sr(i*3+seed_off), 0.5);
          // Plus loin du centre = plus rouge (étoiles vieillissent)
          return t < 0.4 ? colorYoungHot(i+seed_off) : colorMainSeqA(i+seed_off);
        },
        (i)=> 1600 + sr(i+seed_off)*900
      );

      // Couche 2 — Étoiles F/G (blanc-jaune) — enveloppe du bras
      addPoints(parent, arm.N_warm,
        (i)=>{
          const t = Math.pow(sr(i*7+seed_off+1), 0.55);
          return logSpiral(arm.angle, t, i*3+seed_off+5000, 0.18);
        },
        (i)=> sr(i*5+seed_off) < 0.5 ? colorSunLike(i+seed_off) : colorMainSeqA(i+seed_off),
        (i)=> 900 + sr(i+seed_off)*600
      );

      // Couche 3 — Régions HII (ROSE/MAGENTA et BLEU) — knots brillants
      addPoints(parent, arm.N_hii,
        (i)=>{
          // Les régions HII forment des groupes le long du bras
          const t = sr(i*11+seed_off)*0.85 + 0.05;
          const p = logSpiral(arm.angle, t, i*7+seed_off+2000, 0.04);
          // Légèrement au-dessus du plan (nébuleuses récentes)
          p[1] += (sr(i*13+seed_off)-0.5) * MWT * 0.3;
          return p;
        },
        (i)=> sr(i*17+seed_off) < 0.6 ? colorHII(i+seed_off) : colorHIIBlue(i+seed_off),
        (i)=> 3500 + sr(i+seed_off)*2500   // grandes taches lumineuses
      );
    });

    // ── BRAS D'ORION — notre spur local ─────────────────────────
    // Entre Persée et Sagittaire, ~26 000 al du centre
    addPoints(parent, 14000,
      (i)=>{
        const t = Math.pow(sr(i*3+50000), 0.52);
        const theta = -0.30 + t * 1.6 + (sr(i*7+50000)-0.5)*0.25;
        const b=0.28, r0=23000;
        const r = r0 * Math.exp(b*t*0.75) * (0.85+sr(i*11+50000)*0.30);
        return [
          GC + Math.cos(theta)*r + (sr(i*13+50000)-0.5)*r*0.08,
          (sr(i*17+50000)-0.5)*MWT*0.7*(1-t*0.5),
          Math.sin(theta)*r + (sr(i*19+50000)-0.5)*r*0.08
        ];
      },
      (i)=> sr(i*5+50000)<0.45 ? colorYoungHot(i+50000) : colorMainSeqA(i+50000),
      (i)=> 1400 + sr(i+50000)*700
    );

    // ── NUAGES DE POUSSIÈRE ──────────────────────────────────────
    // Extinctions sombres entre les bras — donnent profondeur
    addPoints(parent, 20000,
      (i)=>{
        const arm = Math.floor(sr(i*3+60000)*4)*Math.PI*0.5 + 0.7; // entre les bras
        const t = sr(i*5+60000)*0.9 + 0.05;
        const p = logSpiral(arm, t, i*7+60000, 0.22);
        return p;
      },
      (i)=> colorDust(i+60000),
      (i)=> 2200 + sr(i+60000)*1200
    );

    // ── ÉTOILES INTER-BRAS (fond diffus chaud) ──────────────────
    // Population vieille — orangé/rouge, dispersée uniformément
    addPoints(parent, 60000,
      (i)=>{
        const r = (4000 + sr(i*3+70000)*MWR) * Math.sqrt(sr(i*5+70000));
        const a = sr(i*7+70000) * Math.PI * 2;
        const yH = MWT*2.8*(sr(i*11+70000)-0.5)*Math.exp(-r/MWR*1.4);
        return [GC+Math.cos(a)*r, yH, Math.sin(a)*r];
      },
      (i)=>{
        // Mix réaliste: 70% K orange, 20% G jaune, 10% M rouge
        const r=sr(i*13+70000);
        if(r<0.70) return colorOldOrange(i+70000);
        if(r<0.90) return colorSunLike(i+70000);
        return colorRedGiant(i+70000);
      },
      (i)=> 650 + sr(i+70000)*350
    );

    // ── BULBE CENTRAL ────────────────────────────────────────────
    // Barre galactique (~27° par rapport à la ligne de visée)
    addPoints(parent, 35000,
      (i)=>{
        const r = sr(i*3+80000)*380000;
        const th = sr(i*5+80000)*Math.PI*2;
        const ph = Math.acos(2*sr(i*7+80000)-1);
        // Barre: étirée à ~27° (angle observationnel réel)
        const bar_stretch = 1.0 + Math.abs(Math.cos(th*2+0.47))*1.6;
        return [
          GC + Math.sin(ph)*Math.cos(th)*r*bar_stretch*0.65,
          Math.sin(ph)*Math.sin(th)*r*0.36,
          Math.cos(ph)*r
        ];
      },
      (i)=>{
        // Bulbe = Population II vieille, chaud orangé-rouge
        const heat = 0.5 + sr(i*11+80000)*0.5;
        const t = sr(i*13+80000);
        if(t<0.4) return [heat*0.98, heat*0.62, heat*0.22];  // orangé
        if(t<0.7) return [heat*0.95, heat*0.55, heat*0.18];  // rouge-orangé
        return [heat*0.90, heat*0.42, heat*0.14];              // rouge profond
      },
      (i)=> 2600 + sr(i+80000)*1400
    );

    // ── AMAS NUCLÉAIRE (cœur dense, juste autour Sgr A*) ────────
    addPoints(parent, 10000,
      (i)=>{
        const r = Math.pow(sr(i*3+90000),2)*32000;
        const th = sr(i*5+90000)*Math.PI*2;
        const ph = Math.acos(2*sr(i*7+90000)-1);
        return [GC+Math.sin(ph)*Math.cos(th)*r, Math.sin(ph)*Math.sin(th)*r*0.42, Math.cos(ph)*r];
      },
      (i)=>{const h=0.75+sr(i*11+90000)*0.25; return [h, h*0.70, h*0.35];},
      (i)=> 3500 + sr(i+90000)*2000
    );

    // ── HALO GALACTIQUE ──────────────────────────────────────────
    // Étoiles métal-pauvres, légèrement bleutées
    addPoints(parent, 12000,
      (i)=>{
        const r = MWR*(0.38+sr(i*3+95000)*0.95);
        const th = sr(i*5+95000)*Math.PI*2;
        const ph = Math.acos(2*sr(i*7+95000)-1);
        return [GC+Math.sin(ph)*Math.cos(th)*r, Math.sin(ph)*Math.sin(th)*r*0.55, Math.cos(ph)*r];
      },
      (i)=>{const b=0.10+sr(i*11+95000)*0.20; return [b*0.82, b*0.75, b*0.60];},
      (i)=> 2000 + sr(i+95000)*1000
    );

    // ── AMAS GLOBULAIRES (50) ────────────────────────────────────
    for(let gc=0;gc<50;gc++){
      const r=110000+sr(gc*3)*1800000;
      const th=sr(gc*5)*Math.PI*2, ph=Math.acos(2*sr(gc*7)-1);
      const cx=GC+Math.sin(ph)*Math.cos(th)*r;
      const cy=Math.sin(ph)*Math.sin(th)*r*0.62;
      const cz=Math.cos(ph)*r;
      addPoints(parent, 280,
        (i)=>{const dr=sr(i*3+gc*1000)*20000,ta=sr(i*5+gc*1000)*Math.PI*2,pa=Math.acos(2*sr(i*7+gc*1000)-1);return[cx+Math.sin(pa)*Math.cos(ta)*dr,cy+Math.sin(pa)*Math.sin(ta)*dr,cz+Math.cos(pa)*dr];},
        (i)=>{const h=0.82+sr(i*9+gc*1000)*0.18; return[h, h*0.82, h*0.52];},
        ()=> 4200 + sr(gc*17)*1800
      );
    }

    // ── MARQUEUR SYSTÈME SOLAIRE ─────────────────────────────────
    parent.add(new THREE.Mesh(new THREE.SphereGeometry(11000,8,8),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.9})));
    {
      const pts=[]; for(let i=0;i<=120;i++){const a=(i/120)*Math.PI*2; pts.push(new THREE.Vector3(GC+Math.cos(a)*26000,0,Math.sin(a)*26000));}
      parent.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0x66ccff,transparent:true,opacity:0.65})));
    }
  }

  // ── SGR A* ───────────────────────────────────────────────────
  function buildSgrA(parent){
    const BHR = 38000;
    const g = new THREE.Group(); g.position.set(GC,0,0); parent.add(g);

    // Horizon des événements — sphère noire pure
    g.add(new THREE.Mesh(new THREE.SphereGeometry(BHR,64,64),new THREE.MeshBasicMaterial({color:0x000000})));

    // Sphère photonique (1.5 Rs)
    const phRing = new THREE.Mesh(
      new THREE.TorusGeometry(BHR*1.5, BHR*0.12, 64, 200),
      new THREE.MeshBasicMaterial({color:0xff9900, transparent:true, opacity:0.95})
    );
    phRing.rotation.x = Math.PI/2; g.add(phRing);

    // ISCO (3 Rs)
    g.add(new THREE.Mesh(new THREE.TorusGeometry(BHR*3, BHR*0.055, 24, 120),new THREE.MeshBasicMaterial({color:0xff5500,transparent:true,opacity:0.55})));

    // Disque d'accrétion — shader physique (Keplerian + Doppler)
    const disk = SHADERS.makeAccretionDisk(BHR*1.22, BHR*5.8);
    disk.rotation.x = Math.PI/2; g.add(disk);

    // Particules du disque chaud (gradient thermique)
    addPoints(g, 18000,
      (i)=>{const r=BHR*(1.25+sr(i*3)*4.5), a=sr(i*5)*Math.PI*2, y=(sr(i*7)-0.5)*BHR*0.22; return[Math.cos(a)*r,y,Math.sin(a)*r];},
      (i)=>{
        const r_norm = sr(i*3)*4.5/(4.5);
        const heat = Math.pow(1-r_norm*0.8, 2.5);
        // Blanc → orange → rouge en s'éloignant
        return [1.0, heat*0.55+(1-heat)*0.25, heat*0.10];
      },
      (i)=> BHR*0.048
    );

    // Anneau de refroidissement externe
    addPoints(g, 8000,
      (i)=>{const r=BHR*(5.5+sr(i*3)*4.5), a=sr(i*5)*Math.PI*2, y=(sr(i*7)-0.5)*BHR*0.45; return[Math.cos(a)*r,y,Math.sin(a)*r];},
      (i)=>{const h=0.30+sr(i*9)*0.25; return[h, h*0.22, 0];},
      (i)=> BHR*0.070
    );

    // Jets relativistes bipolaires
    [-1,1].forEach(dir=>{
      const pts=[new THREE.Vector3(0,0,0), new THREE.Vector3(0,dir*BHR*20,0)];
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0x44aaff,transparent:true,opacity:0.82})));
      addPoints(g, 2000,
        (i)=>{const t=sr(i*3), y=dir*t*BHR*19, sp=t*BHR*3.5, a=sr(i*5)*Math.PI*2; return[Math.cos(a)*sp*sr(i*7),y,Math.sin(a)*sp*sr(i*9)];},
        (i)=>{const t=sr(i*3); return[0.20+t*0.40, 0.55+t*0.35, 1.0];},
        ()=> BHR*0.088
      );
    });

    function glbl(txt, y, col, sw, sh){
      const c=document.createElement('canvas'); c.width=600; c.height=58;
      const x=c.getContext('2d'); x.font='15px monospace'; x.fillStyle=col; x.textAlign='center'; x.fillText(txt,300,40);
      const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true}));
      s.scale.set(sw,sh,1); s.position.set(0,y,0); g.add(s);
    }
    glbl('Sgr A*  ·  4.15 × 10⁶ M☉  ·  Rs ≈ 12 Mkm',  BHR*7.5, 'rgba(255,180,80,0.90)',  BHR*11, BHR*1.1);
    glbl('Horizon des événements',                        BHR*2.8, 'rgba(255,120,40,0.80)',  BHR*7,  BHR*0.88);
    glbl('Sphère photonique  (r = 1.5 Rs)',              -BHR*3.5, 'rgba(255,165,45,0.65)',  BHR*8,  BHR*0.80);
    glbl('ISCO  (r = 3 Rs — dernière orbite stable)',    -BHR*5.8, 'rgba(255,90,25,0.52)',   BHR*9,  BHR*0.75);

    return { group:g, phRing, disk, BHR };
  }

  // ── ANDROMÈDE (M31) ──────────────────────────────────────────
  // Vue à ~77° du plan (quasi de profil) — structure réaliste
  function buildAndromeda(parent, AND_DIST){
    const AND_R = MWR * 1.18;
    const AND_T = MWT * 1.35;
    const g = new THREE.Group();
    g.position.set(AND_DIST*0.58, AND_DIST*0.28, AND_DIST*0.76);
    parent.add(g);

    // Inclinaison observée: ~77° par rapport à la face-on
    const TILT = 1.344; // radians

    function andSpiral(a0, t, seed, scatter=0.12){
      const b=0.26, r0=9000;
      const theta = a0 + t*4.2;
      const r = r0*Math.exp(b*t)*(0.80+sr(seed)*0.40);
      const sc = r*scatter;
      const x = Math.cos(theta)*r + (sr(seed+1)-0.5)*sc;
      const z = Math.sin(theta)*r + (sr(seed+2)-0.5)*sc;
      const y = AND_T*(1-t*0.55)*(sr(seed+3)-0.5);
      // Appliquer inclinaison
      return [x, y*Math.cos(TILT)-z*Math.sin(TILT), y*Math.sin(TILT)+z*Math.cos(TILT)];
    }

    // 4 bras principaux d'Andromède
    [0, 1.571, 3.142, 4.712].forEach((a0, ai)=>{
      const so = ai*15000;

      // Étoiles bleues chaudes — noyau des bras
      addPoints(g, 28000,
        (i)=>{ const t=Math.pow(sr(i*3+so),0.52); return andSpiral(a0,t,i+so,0.08); },
        (i)=>{
          const t=Math.pow(sr(i*3+so),0.52);
          return t<0.45 ? colorYoungHot(i+so) : colorMainSeqA(i+so);
        },
        (i)=> 1700+sr(i+so)*950
      );

      // Étoiles F/G — enveloppe
      addPoints(g, 20000,
        (i)=>{ const t=Math.pow(sr(i*7+so+5000),0.56); return andSpiral(a0,t,i*3+so+5000,0.20); },
        (i)=> sr(i*5+so)<0.55 ? colorSunLike(i+so) : colorMainSeqA(i+so),
        (i)=> 950+sr(i+so)*550
      );

      // Régions HII
      addPoints(g, 5500,
        (i)=>{ const t=sr(i*11+so)*0.82+0.06; return andSpiral(a0,t,i*7+so+8000,0.05); },
        (i)=> sr(i*17+so)<0.58 ? colorHII(i+so) : colorHIIBlue(i+so),
        (i)=> 3800+sr(i+so)*2200
      );
    });

    // Fond inter-bras — Population II orangée
    addPoints(g, 40000,
      (i)=>{
        const r=(3000+sr(i*3+60000)*AND_R)*Math.sqrt(sr(i*5+60000));
        const a=sr(i*7+60000)*Math.PI*2;
        const x=Math.cos(a)*r, z=Math.sin(a)*r, y=(sr(i*9+60000)-0.5)*AND_T*2.5;
        return [x, y*Math.cos(TILT)-z*Math.sin(TILT), y*Math.sin(TILT)+z*Math.cos(TILT)];
      },
      (i)=>{
        const r=sr(i*13+60000);
        if(r<0.65) return colorOldOrange(i+60000);
        if(r<0.85) return colorSunLike(i+60000);
        return colorRedGiant(i+60000);
      },
      (i)=> 680+sr(i+60000)*380
    );

    // Bulbe d'Andromède
    addPoints(g, 28000,
      (i)=>{
        const r=sr(i*3+70000)*420000, th=sr(i*5+70000)*Math.PI*2, ph=Math.acos(2*sr(i*7+70000)-1);
        const x=Math.sin(ph)*Math.cos(th)*r, z=Math.cos(ph)*r, y=Math.sin(ph)*Math.sin(th)*r*0.36;
        return [x, y*Math.cos(TILT)-z*Math.sin(TILT), y*Math.sin(TILT)+z*Math.cos(TILT)];
      },
      (i)=>{
        const h=0.5+sr(i*11+70000)*0.5;
        return [h*0.95, h*0.62, h*0.22];
      },
      (i)=> 2800+sr(i+70000)*1400
    );

    // Halo d'Andromède
    addPoints(g, 8000,
      (i)=>{const r=AND_R*(0.35+sr(i*3+80000)*0.80), th=sr(i*5+80000)*Math.PI*2, ph=Math.acos(2*sr(i*7+80000)-1); return[Math.sin(ph)*Math.cos(th)*r, Math.sin(ph)*Math.sin(th)*r*0.50, Math.cos(ph)*r];},
      (i)=>{const b=0.08+sr(i*11+80000)*0.18; return[b*0.80,b*0.72,b*0.58];},
      (i)=> 2100+sr(i+80000)*1000
    );

    // Satellites M32 (elliptique compacte) et M110 (naine elliptique)
    const SATELLITES = [
      { cx:AND_R*0.26, cy:AND_R*0.10, cz:AND_R*0.13, r:AND_R*0.042, N:4000, col:[0.92,0.78,0.52] },
      { cx:-AND_R*0.20, cy:-AND_R*0.12, cz:AND_R*0.20, r:AND_R*0.080, N:5500, col:[0.72,0.66,0.50] },
    ];
    SATELLITES.forEach(s=>{
      addPoints(g, s.N,
        (i)=>{const r=sr(i*3)*s.r, a=sr(i*5)*Math.PI*2; return[s.cx+Math.cos(a)*r, s.cy+(sr(i*7)-0.5)*s.r*0.38, s.cz+Math.sin(a)*r];},
        ()=>s.col,
        ()=>s.r*0.068
      );
    });

    return { group:g, AND_R, AND_T };
  }

  // ── NUAGES DE MAGELLAN ────────────────────────────────────────
  function buildMagellanicClouds(parent){
    const clouds = [
      { pos:[-780000,-1150000,1150000], R:520000, N:11000,
        colFn:(i)=>{const r=sr(i*13); return r<0.5?colorYoungHot(i):colorSunLike(i);},
        label:'Grand Nuage de Magellan  ·  160 000 al' },
      { pos:[-1150000,-950000,1260000], R:315000, N:5500,
        colFn:(i)=> colorSunLike(i),
        label:'Petit Nuage de Magellan  ·  200 000 al' },
    ];
    return clouds.map(c=>{
      const g=new THREE.Group(); g.position.set(...c.pos); parent.add(g);
      addPoints(g, c.N,
        (i)=>{const r=sr(i*3)*c.R, a=sr(i*5)*Math.PI*2; return[Math.cos(a)*r,(sr(i*7)-0.5)*c.R*0.60,Math.sin(a)*r];},
        c.colFn,
        (i)=> c.R*0.062+sr(i)*c.R*0.025
      );
      const lc=document.createElement('canvas'); lc.width=512; lc.height=56;
      const lx=lc.getContext('2d'); lx.font='14px monospace'; lx.fillStyle='rgba(255,238,168,.70)'; lx.textAlign='center'; lx.fillText(c.label,256,38);
      const ls=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(lc),transparent:true}));
      ls.scale.set(c.R*1.6,c.R*0.22,1); ls.position.set(0,c.R*1.05,0); g.add(ls);
      return { group:g, ...c };
    });
  }

  return { buildMilkyWay, buildSgrA, buildAndromeda, buildMagellanicClouds, GC, MWR, MWT, buildGeo, addPoints };
})();