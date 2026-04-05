// ═══════════════════════════════════════════════════════════════
// STARDATA.JS — Catalogue HD étendu + étoiles géantes/supergéantes
// ═══════════════════════════════════════════════════════════════
'use strict';

window.STARDATA = (function(){

  const SPEC_COLORS = {
    'O': [0.60, 0.70, 1.00],
    'B': [0.68, 0.78, 1.00],
    'A': [0.88, 0.90, 1.00],
    'F': [1.00, 0.97, 0.88],
    'G': [1.00, 0.92, 0.70],
    'K': [1.00, 0.75, 0.42],
    'M': [1.00, 0.50, 0.25],
    'L': [0.85, 0.25, 0.08],
    'W': [0.50, 0.80, 1.00],
    'C': [1.00, 0.35, 0.15],
  };

  function specToColor(spec){
    const t = spec?.[0]?.toUpperCase() || 'G';
    return SPEC_COLORS[t] || [1,1,1];
  }

  function magToBrightness(mag){
    return Math.pow(10, (0 - mag) / 2.5) * 0.15;
  }

  function radecToXYZ(ra_h, dec_deg, dist=1){
    const ra  = ra_h * (Math.PI*2 / 24);
    const dec = dec_deg * Math.PI / 180;
    return [
      dist * Math.cos(dec) * Math.cos(ra),
      dist * Math.sin(dec),
      dist * Math.cos(dec) * Math.sin(ra)
    ];
  }

  // ── CATALOGUE COMPLET — étoiles nommées + géantes + supergéantes ──
  // [ra_h, dec_deg, magnitude, spectral, nom, dist_al, rayon_soleil, info]
  const NAMED_STARS = [
    // ── TRÈS PROCHES ──
    [14.660,-60.835,-0.27,'K2Ib', 'Rigil Kentaurus (α Cen A)', 4.37,  1.2,  'Naine jaune G2V · Binaire avec α Cen B · 4.37 al'],
    [ 6.752,-16.716,-1.46,'A1V',  'Sirius A',        8.6,   1.7,  'Étoile la plus brillante du ciel · A1V · 2.1 M☉'],
    [19.846,  8.868, 0.76,'A7V',  'Altaïr',         17,    1.8,  'A7V · Rotation très rapide (9h) · 1.8 R☉'],
    [ 7.657,  5.225, 0.40,'F5IV', 'Procyon A',       11.4,  2.0,  'Sous-géante F5 · 1.5 M☉ · Binaire'],
    [18.615, 38.783, 0.03,'A0V',  'Véga',            25,    2.4,  'Standard de magnitude 0 · A0V · 2.1 M☉'],
    [13.792, 49.313, 0.05,'K2III','Arcturus',        37,   25.4,  'Géante orange · K2III · 25 R☉ · 1.1 M☉'],
    [ 6.037, 45.998, 0.08,'G8III','Capella A',       43,   11.9,  'Géante jaune G8III · 11.9 R☉ · Binaire spectroscopique'],
    [ 5.278, -8.201, 0.50,'M1Ia', 'Bételgeuse',     700,  887,   'SUPERGÉANTE ROUGE · M1Ia · 887 R☉\nSi au centre du SS, engloutirait Jupiter !\nCandidat supernova dans <100 000 ans'],
    [ 5.919,  7.407, 0.14,'B8Ia', 'Rigel',          860,   78,   'SUPERGÉANTE BLEUE · B8Ia · 78 R☉\n17 M☉ · Luminosité: 120 000 L☉'],
    [16.490,-26.432, 0.96,'B2III','Antarès',        550,  883,   'SUPERGÉANTE ROUGE · M0.5Iab · 883 R☉\nRivale de Mars en couleur (son nom!)\nBinaire avec Antarès B (B2V)'],
    [ 1.162,-57.237, 0.50,'B0.5IV','Achernar',      139,   6.8,  'Naine bleue B · 6.8 R☉ · Rotation très rapide\nAphatissée aux pôles'],
    [12.443,-63.099, 1.25,'M3II', 'Gacrux',          88,   84,   'Géante rouge · Croix du Sud · 84 R☉'],
    [ 2.530, 89.264, 1.97,'F7Ib', 'Polaris',        433,   46,   'Étoile du Nord · Céphéide · 46 R☉\nDist: 433 al · Utilisée en navigation'],
    [20.690, 45.280, 1.25,'A2Ia', 'Déneb',         2600,  203,   'SUPERGÉANTE BLANCHE · A2Ia · 203 R☉\n196 000 L☉ · Une des + lumineuses connues'],
    [ 7.577, 31.889, 1.16,'K0III','Pollux',          34,    8.8,  'Géante orange K · Exoplanète confirmée\n8.8 R☉ · Planète Pollux b (2.3 MJ)'],
    [10.139, 11.967, 1.35,'B8IV', 'Régulus A',       77,    3.1,  'Étoile α du Lion · B8IV · 3.1 R☉\nRotation en 15h → très aplatie'],
    [11.897, 53.695, 1.81,'A0III','Dubhe',          123,   17.0,  'Grande Ourse · Géante A · 17 R☉'],
    [18.349,-36.761, 1.85,'B3III','Kaus Australis',  143,   6.8,  'Sagittaire · B3III · 6.8 R☉'],
    [22.961,-29.621, 1.17,'A3V',  'Fomalhaut A',      25,   1.8,  'A3V · Disque de débris détecté\nExoplanète Fomalhaut b · 25 al'],
    [ 4.598, 16.509, 0.85,'K5III','Aldébaran',        65,   44,   'Géante rouge K5III · 44 R☉\nŒil du Taureau · 1.7 M☉'],
    [ 5.438,-57.473,-0.62,'F0Ib', 'Canopus',         310,   71,   'SUPERGÉANTE BLANCHE · F0Ib · 71 R☉\n2ème étoile la + brillante · 310 al'],

    // ── SUPERGÉANTES REMARQUABLES ──
    [2.821, 57.815, 2.27,'B1Ia', 'Mirfak (α Per)',  592,   68,   'SUPERGÉANTE BLEUE · B1Ia · 68 R☉\n5 000 L☉ × Soleil'],
    [5.627, 28.608, 1.65,'B7III','Elnath',          131,   4.7,  'Géante bleue B7III · Taureau/Cocher'],
    [22.960,-29.622, 1.16,'B2II', 'ε PsA',           25,   2.0,  'Étoile chaude B2II proche'],
    [17.560,-37.103, 1.62,'F2II', 'ε Sco',           65,   12,   'Supergéante jaune-blanc · Scorpion'],
    [6.399,-52.696,-0.74,'A9II', 'Canopus',         310,   71,   'SUPERGÉANTE · 2ème plus brillante'],

    // ── GÉANTES ROUGES EXCEPTIONNELLES ──
    [2.296, 89.264, 2.02,'K2III','Kochab',          130,   42,   'Géante orange · Petite Ourse · 42 R☉'],
    [14.751,-15.998, 2.75,'M6III','Groombridge',     170,  180,   'Géante rouge M6III · 180 R☉'],
    [22.902, 30.227, 2.38,'K2Ib', 'Enif (ε Peg)',    690,  185,   'Supergéante orange · 185 R☉ · Pégase'],
    [20.370,-60.255, 1.94,'B2IV', 'Pavo (α Pav)',    183,   5,    'Étoile bleue brillante · Paon'],
    [14.178,-26.114, 1.04,'M7III','ε Oct',            50,   34,   'Géante rouge M7 brillante du ciel austral'],

    // ── ÉTOILES VARIABLES ET CÉPHÉIDES ──
    [5.278, -8.201, 0.42,'M1Ia', 'μ Cep (Étoile grenat)',  3000, 1650, 'UNE DES + GRANDES ÉTOILES CONNUES\nHypergéante rouge · ~1 650 R☉\nSi au centre du SS: jusqu\'à Saturne !'],
    [3.402, 49.861, 3.52,'M2Iab','VV Cephei A',    5000, 1900,  'HYPERGÉANTE ROUGE · ~1 900 R☉\nUne des plus grandes étoiles connues\nBinaire avec une étoile B'],
    [20.299, 40.257, 3.74,'M2Ia', 'RW Cep',         3500, 1535,  'Hypergéante rouge · 1 535 R☉'],

    // ── AUTRES REMARQUABLES ──
    [5.603,-1.202, 2.77,'O9Ib', 'ζ Ori (Alnitak)', 800,  20,   'Ceinture d\'Orion · O9Ib · 20 R☉\nNébuleuse de la Flamme à proximité'],
    [5.590,-1.943, 2.23,'B0III','ε Ori (Alnilam)', 2000,  32,   'Ceinture d\'Orion (centrale) · 32 R☉\n275 000 L☉'],
    [5.679,-1.943, 2.24,'B0IV', 'δ Ori (Mintaka)', 900,  16,   'Ceinture d\'Orion · Premier ° à passer au méridien'],
    [21.309, 62.585, 2.45,'K0II', 'Alderamin',        49,   4.9,  'Étoile polaire dans 7 500 ans · K0II'],
    [17.622,-37.103, 1.62,'B2IV', 'Shaula (λ Sco)',  700,   6.5,  'Queue du Scorpion · Binaire · B2IV'],
    [16.836,-34.293, 2.29,'F3Ib', 'η Oph',           84,   10,   'Supergéante F · Ophiuchus'],
    [7.401,-29.303, 2.00,'B2Ia', 'δ CMa (Wezen)',  1600,  215,   'Supergéante jaune · 215 R☉\n50 000 L☉ · Grand Chien'],
  ];

  // ── ÉTOILES VOISINES DÉTAILLÉES ─────────────────────────────
  const NEARBY = [
    { name:'α Centauri A',   dist:4.37,  ra:14.66, dec:-60.83, spec:'G2V',   mag:0.0,   desc:'Naine jaune G2V · 1.1 M☉ · 1.2 R☉\nBinaire avec α Cen B · 4.37 al\nLa + proche du Soleil (système)' },
    { name:'α Centauri B',   dist:4.37,  ra:14.66, dec:-60.83, spec:'K1V',   mag:1.33,  desc:'Naine orange K1V · 0.9 M☉ · 0.86 R☉\nCompagnon d\'α Cen A' },
    { name:'Proxima',        dist:4.24,  ra:14.30, dec:-62.68, spec:'M5Ve',  mag:11.1,  desc:'Plus proche étoile du Soleil · 4.24 al\nNaine rouge M5V · 0.12 M☉\nExoplanète Proxima b (zone habitable)' },
    { name:'Étoile de Barnard',dist:5.96,ra:17.96, dec:4.69,  spec:'M4Ve',  mag:9.5,   desc:'2ème étoile la + proche · 5.96 al\nMouvement propre le + rapide du ciel\nNaine rouge M4V · 0.16 M☉' },
    { name:'Wolf 359',       dist:7.86,  ra:10.92, dec:7.01,  spec:'M6Ve',  mag:13.5,  desc:'3ème plus proche · 7.86 al\nNaine rouge très froide · 0.09 M☉' },
    { name:'Sirius A',       dist:8.60,  ra:6.75,  dec:-16.72,spec:'A1V',   mag:-1.46, desc:'Étoile la + brillante du ciel\nA1V · 2.1 M☉ · 1.7 R☉ · 8.6 al\nBinaire avec Sirius B (naine blanche)' },
    { name:'Sirius B',       dist:8.60,  ra:6.75,  dec:-16.72,spec:'DA2',   mag:8.3,   desc:'Naine blanche · Compagnon de Sirius\n1 M☉ dans un rayon de 0.0084 R☉\nDensité: ~1 tonne/cm³' },
    { name:'Ross 128',       dist:10.9,  ra:11.79, dec:0.80,  spec:'M4V',   mag:11.1,  desc:'Naine rouge paisible · 10.9 al\nRoss 128 b: exoplanète tempérée possible' },
    { name:'Procyon A',      dist:11.4,  ra:7.66,  dec:5.22,  spec:'F5IV-V',mag:0.40,  desc:'Sous-géante F5 · 1.5 M☉ · 2.0 R☉\nBinaire avec Procyon B (naine blanche)\n11.4 al' },
    { name:'61 Cygni A',     dist:11.4,  ra:21.10, dec:38.75, spec:'K5V',   mag:5.2,   desc:'Première étoile mesurée (parallaxe 1838)\nNaine orange K5 · 0.7 M☉ · 11.4 al' },
    { name:'Tau Ceti',       dist:11.9,  ra:1.73,  dec:-15.94,spec:'G8V',   mag:3.5,   desc:'Similaire au Soleil · G8V · 0.78 M☉\nSystème de 5+ exoplanètes · 11.9 al\nCible SETI historique' },
    { name:'ε Eridani',      dist:10.5,  ra:3.55,  dec:-9.46, spec:'K2V',   mag:3.7,   desc:'Naine orange K2 · 0.82 M☉\nExoplanète géante confirmée · 10.5 al\nAnneau de débris détecté' },
    { name:'Bételgeuse',     dist:700,   ra:5.278, dec:-8.201,spec:'M1Ia',  mag:0.50,  desc:'SUPERGÉANTE ROUGE · M1Ia · 887 R☉\nSi au centre du SS: engloutirait Jupiter\nCandidat supernova dans <100 000 ans\n700 al' },
    { name:'Antarès',        dist:550,   ra:16.49, dec:-26.43,spec:'M0Iab', mag:0.96,  desc:'SUPERGÉANTE ROUGE · M0Iab · 883 R☉\nRivale de Mars en couleur rouge\n550 al · Binaire (Antarès B: B2V)' },
    { name:'μ Cephei',       dist:3000,  ra:21.727,dec:58.78, spec:'M2Ia',  mag:4.08,  desc:'HYPERGÉANTE ROUGE · ~1 650 R☉\nUne des + grandes étoiles connues\n"Étoile Grenat" de Herschel · 3000 al' },
  ];

  // ── DONNÉES ÉTOILES GÉANTES (pour affichage 3D spécial) ──────
  const GIANTS = NAMED_STARS.filter(s => s[6] > 50).map(s => ({
    name: s[4], dist: s[5], ra: s[0], dec: s[1],
    spec: s[3], mag: s[2], radius: s[6], info: s[7]
  }));

  // ── GÉNÉRATION FOND ÉTOILÉ (catalogue procédural) ─────────────
  function generateBackgroundStars(N=6000){
    const SPEC_DIST=[['M',.76,6,9.5],['K',.12,4.5,8.5],['G',.07,3.5,7.5],['F',.03,2.5,6.5],['A',.01,1.5,5.5],['B',.008,.5,4.5],['O',.002,-1,3]];
    const stars=[];
    const rng=(s,i)=>{const x=Math.sin(s*127.1+i*311.7)*43758.5453;return x-Math.floor(x);};
    for(let i=0;i<N;i++){
      const ra=rng(1,i*3)*24, dec=(rng(2,i*3+1)*2-1)*90;
      const [x,y,z]=radecToXYZ(ra,dec,4500+rng(3,i)*4000);
      let spec='M', cumul=0;
      const r=rng(4,i);
      for(const[t,f,mn,mx]of SPEC_DIST){cumul+=f;if(r<cumul){spec=t;break;}}
      const[,, mn,mx]=SPEC_DIST.find(s=>s[0]===spec)||['G',0,3,8];
      const mag=mn+rng(5,i)*(mx-mn);
      const brightness=Math.max(0.05,magToBrightness(mag));
      const col=specToColor(spec);
      const jitter=0.06;
      stars.push({x,y,z,r:col[0]+(rng(6,i)-.5)*jitter,g:col[1]+(rng(7,i)-.5)*jitter,b:col[2]+(rng(8,i)-.5)*jitter,brightness,mag,spec,size:0.8+brightness*3.5});
    }
    return stars;
  }

  function buildStarGeometry(){
    const bg=generateBackgroundStars(6000);
    const allStars=[...bg];

    // Ajouter toutes les étoiles nommées
    for(const [ra,dec,mag,spec,name,dist,,info] of NAMED_STARS){
      const d=Math.min(dist*0.8,3500);
      const[x,y,z]=radecToXYZ(ra,dec,d);
      const col=specToColor(spec);
      const brightness=Math.max(0.3,magToBrightness(mag))*2.5;
      allStars.push({x,y,z,r:col[0],g:col[1],b:col[2],brightness,mag,spec,name,size:1.5+brightness*4});
    }

    const N2=allStars.length;
    const pos=new Float32Array(N2*3), cols=new Float32Array(N2*3), sizes=new Float32Array(N2), bri=new Float32Array(N2);
    allStars.forEach((s,i)=>{
      pos[i*3]=s.x;pos[i*3+1]=s.y;pos[i*3+2]=s.z;
      cols[i*3]=Math.min(1,s.r);cols[i*3+1]=Math.min(1,s.g);cols[i*3+2]=Math.min(1,s.b);
      sizes[i]=s.size; bri[i]=s.brightness;
    });
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',   new THREE.BufferAttribute(pos,3));
    geo.setAttribute('aColor',     new THREE.BufferAttribute(cols,3));
    geo.setAttribute('aSize',      new THREE.BufferAttribute(sizes,1));
    geo.setAttribute('aBrightness',new THREE.BufferAttribute(bri,1));
    return{geo,stars:allStars};
  }

  return{buildStarGeometry,NAMED_STARS,NEARBY,GIANTS,specToColor,magToBrightness,radecToXYZ};
})();