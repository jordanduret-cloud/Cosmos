// ═══════════════════════════════════════════════════════════════
// STARDATA.JS — Real star catalog (HD subset)
// Sources: Yale Bright Star Catalogue, Hipparcos
// Format per star: [RA_hours, Dec_deg, magnitude, spectralType, name?]
// ═══════════════════════════════════════════════════════════════
'use strict';

window.STARDATA = (function(){

  // Spectral type → RGB color (blackbody approximation)
  const SPEC_COLORS = {
    'O': [0.62, 0.72, 1.00],  // blue-white, very hot
    'B': [0.70, 0.78, 1.00],  // blue-white
    'A': [0.88, 0.90, 1.00],  // white
    'F': [1.00, 0.97, 0.88],  // yellow-white
    'G': [1.00, 0.92, 0.70],  // yellow (like Sun)
    'K': [1.00, 0.75, 0.42],  // orange
    'M': [1.00, 0.50, 0.25],  // red
    'L': [0.85, 0.25, 0.08],  // deep red (brown dwarf)
    'W': [0.50, 0.80, 1.00],  // Wolf-Rayet blue
    'C': [1.00, 0.35, 0.15],  // carbon star red
  };

  function specToColor(spec){
    const t = spec?.[0]?.toUpperCase() || 'G';
    return SPEC_COLORS[t] || [1,1,1];
  }

  // Convert apparent magnitude to relative brightness (visual)
  function magToBrightness(mag){
    return Math.pow(10, (0 - mag) / 2.5) * 0.15;
  }

  // Convert RA/Dec to Cartesian (unit sphere)
  function radecToXYZ(ra_h, dec_deg, dist=1){
    const ra  = ra_h * (Math.PI*2 / 24);
    const dec = dec_deg * Math.PI / 180;
    return [
      dist * Math.cos(dec) * Math.cos(ra),
      dist * Math.sin(dec),
      dist * Math.cos(dec) * Math.sin(ra)
    ];
  }

  // ── NAMED BRIGHT STARS (subset of real catalog) ─────────────
  // [ra_hours, dec_degrees, magnitude, spectral, commonName, distLy]
  const NAMED_STARS = [
    [6.752, -16.716,  -1.46, 'A1V',  'Sirius',         8.6  ],
    [6.399, -52.696,  -0.74, 'F0Ib', 'Canopus',        310  ],
    [14.660, -60.835, -0.27, 'K2Ib', 'Rigil Kentaurus',4.37 ],
    [19.846,  8.868,   0.76, 'A7V',  'Altaïr',         17   ],
    [4.598,  16.509,   0.85, 'K5III','Aldébaran',       65   ],
    [5.919,  7.407,    0.14, 'B8Ia', 'Rigel',           860  ],
    [7.655,  5.225,    0.40, 'K1III','Procyon',         11.4 ],
    [5.278, -8.201,    0.45, 'B0Ia', 'Bételgeuse',      700  ],
    [20.690, 45.280,   0.77, 'A2Ia', 'Déneb',          2600  ],
    [12.443, -63.099,  1.25, 'B0.5III','Gacrux',        88   ],
    [14.064, 64.378,   2.08, 'K0III','Kochab',          130  ],
    [2.530,  89.264,   1.97, 'F7Ib', 'Polaris',         433  ],
    [1.162, -57.237,   0.50, 'B0.5IV','Achernar',       139  ],
    [5.438, -57.473,  -0.62, 'cK2Ib','Canopus',         310  ],
    [18.615, 38.783,   0.03, 'A0V',  'Véga',            25   ],
    [16.490, -26.432,  0.96, 'B2.5V','Antarès',         550  ],
    [7.577,  31.889,   1.16, 'G8III','Pollux',           34   ],
    [7.452,  31.889,   1.58, 'A2IV', 'Castor',           51   ],
    [14.245, 19.182,   2.65, 'G0IV', 'Muphrid',         37   ],
    [13.792, 49.313,   0.05, 'K2IIIp','Arcturus',        37   ],
    [21.309,  62.585,  2.45, 'K0II', 'Alderamin',        49   ],
    [10.139, 11.967,   1.35, 'A4II', 'Régulus',          77   ],
    [2.119,  23.463,   0.87, 'K0IIb','Mirfak',           592  ],
    [11.062, 61.751,   1.77, 'B3V',  'Mérakh',           79   ],
    [11.897, 53.695,   1.81, 'K0III','Dubhe',            123  ],
    [18.349,  -36.761, 1.85, 'B3III','Kaus Australis',  143   ],
    [20.370, -60.255,  1.94, 'K0.5IIb','Pavo',           183  ],
    [22.960,  -29.622, 1.16, 'B2II', 'Fomalhaut voisin',25   ],
    [22.961,  -29.621, 1.17, 'A3V',  'Fomalhaut',        25   ],
    [6.037,  45.998,   0.08, 'G5III','Capella',          43   ],
    [5.532,   28.608,  0.87, 'B7III','Elnath',          131   ],
    [3.038,   4.090,   2.04, 'B5V',  'Menkar',          220   ],
    [23.055,  15.206,  2.83, 'G8Ib', 'Sadalsuud',       610   ],
  ];

  // ── GENERATE 8000 BACKGROUND STARS PROCEDURALLY ─────────────
  // Using real statistics: IMF-weighted spectral distribution
  function generateBackgroundStars(N=8000){
    const SPEC_DIST = [
      ['M', 0.76, 6.0, 9.5],  // [type, fraction, magMin, magMax]
      ['K', 0.12, 4.5, 8.5],
      ['G', 0.07, 3.5, 7.5],
      ['F', 0.03, 2.5, 6.5],
      ['A', 0.01, 1.5, 5.5],
      ['B', 0.008,0.5, 4.5],
      ['O', 0.002,-1.0,3.0],
    ];
    const stars = [];
    const rng = (seed, i) => { const x=Math.sin(seed*127.1+i*311.7)*43758.5453; return x-Math.floor(x); };

    for(let i=0; i<N; i++){
      // Random sky position
      const ra  = rng(1, i*3)   * 24;
      const dec = (rng(2, i*3+1)*2-1) * 90;
      const [x,y,z] = radecToXYZ(ra, dec, 4500+rng(3,i)*4000);

      // Pick spectral type by IMF weight
      let r = rng(4, i);
      let spec = 'M';
      let cumulative = 0;
      for(const [t, frac, mn, mx] of SPEC_DIST){
        cumulative += frac;
        if(r < cumulative){ spec=t; break; }
      }

      // Random magnitude in range for this type
      const [,, mn, mx] = SPEC_DIST.find(s=>s[0]===spec) || ['G',0,3,8];
      const mag = mn + rng(5,i)*(mx-mn);
      const brightness = Math.max(0.05, magToBrightness(mag));
      const col = specToColor(spec);
      // Add slight color variation within type
      const jitter = 0.06;
      stars.push({
        x, y, z,
        r: col[0]+(rng(6,i)-0.5)*jitter,
        g: col[1]+(rng(7,i)-0.5)*jitter,
        b: col[2]+(rng(8,i)-0.5)*jitter,
        brightness, mag, spec,
        size: 0.8+brightness*3.5
      });
    }
    return stars;
  }

  // ── BUILD THREE.JS GEOMETRY FOR ALL STARS ───────────────────
  function buildStarGeometry(){
    const bg = generateBackgroundStars(8000);

    // Add named stars
    const allStars = [...bg];
    for(const [ra,dec,mag,spec,name,dist] of NAMED_STARS){
      const d = Math.min(dist*0.8, 3500); // scale down distances for rendering
      const [x,y,z] = radecToXYZ(ra, dec, d);
      const col = specToColor(spec);
      const brightness = Math.max(0.3, magToBrightness(mag))*2.5;
      allStars.push({x,y,z, r:col[0],g:col[1],b:col[2], brightness, mag, spec, name, size:1.5+brightness*4});
    }

    const N2 = allStars.length;
    const pos   = new Float32Array(N2*3);
    const cols  = new Float32Array(N2*3);
    const sizes = new Float32Array(N2);
    const bri   = new Float32Array(N2);

    allStars.forEach((s,i)=>{
      pos[i*3]=s.x; pos[i*3+1]=s.y; pos[i*3+2]=s.z;
      cols[i*3]=Math.min(1,s.r); cols[i*3+1]=Math.min(1,s.g); cols[i*3+2]=Math.min(1,s.b);
      sizes[i]=s.size;
      bri[i]=s.brightness;
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position',   new THREE.BufferAttribute(pos,3));
    geo.setAttribute('aColor',     new THREE.BufferAttribute(cols,3));
    geo.setAttribute('aSize',      new THREE.BufferAttribute(sizes,1));
    geo.setAttribute('aBrightness',new THREE.BufferAttribute(bri,1));

    return { geo, stars: allStars };
  }

  // ── NEARBY STARS (for solar neighborhood view) ───────────────
  const NEARBY = [
    { name:'α Centauri A', dist:4.37, ra:14.66, dec:-60.83, spec:'G2V',  mag:0.0,  desc:'Plus proche système stellaire\nType solaire G2V · 1.1 M☉\nDistance: 4.37 al' },
    { name:'α Centauri B', dist:4.37, ra:14.66, dec:-60.83, spec:'K1V',  mag:1.33, desc:'Compagnon d\'α Cen A · binaire\nType K1V · 0.9 M☉' },
    { name:'Proxima',       dist:4.24, ra:14.30, dec:-62.68, spec:'M5Ve', mag:11.1, desc:'Plus proche étoile du Soleil\nNaine rouge M5V · 0.12 M☉\nExoplanète Proxima b' },
    { name:'Étoile Barnard', dist:5.96, ra:17.96, dec: 4.69, spec:'M4Ve', mag: 9.5, desc:'2ème étoile la plus proche\nMouvement propre le + rapide\nNaine rouge M4V' },
    { name:'Wolf 359',       dist:7.86, ra:10.92, dec: 7.01, spec:'M6Ve', mag:13.5, desc:'3ème étoile la plus proche\nNaine rouge très froide' },
    { name:'Sirius A',       dist:8.60, ra: 6.75, dec:-16.72,spec:'A1V',  mag:-1.46,desc:'Étoile la plus brillante du ciel\nType A1V · 2.1 M☉' },
    { name:'Sirius B',       dist:8.60, ra: 6.75, dec:-16.72,spec:'DA2',  mag: 8.3, desc:'Naine blanche compagnon de Sirius\nReste stellaire ultra-dense' },
    { name:'Lacaille 9352',  dist:10.7, ra:23.09, dec:-35.85,spec:'M1.5V',mag: 7.3, desc:'Naine rouge paisible' },
    { name:'Ross 128',       dist:10.9, ra:11.79, dec: 0.80, spec:'M4V',  mag:11.1, desc:'Naine rouge · Ross 128b (habitable?)' },
    { name:'EZ Aquarii',     dist:11.3, ra:22.39, dec:-15.30,spec:'M5Ve', mag:13.3, desc:'Système triple de naines rouges' },
    { name:'Procyon A',      dist:11.4, ra: 7.66, dec: 5.22, spec:'F5IV-V',mag:0.40,desc:'Sous-géante F5 · 1.5 M☉\nBinaire avec une naine blanche' },
    { name:'61 Cygni A',     dist:11.4, ra:21.10, dec:38.75, spec:'K5V',  mag: 5.2, desc:'Première étoile dont la distance\nfut mesurée (Bessel, 1838)' },
    { name:'Tau Ceti',       dist:11.9, ra: 1.73, dec:-15.94,spec:'G8V',  mag: 3.5, desc:'Similaire au Soleil · G8V\nSystème de 5+ exoplanètes' },
    { name:'Epsilon Eridani', dist:10.5, ra: 3.55, dec:-9.46, spec:'K2V', mag: 3.7, desc:'Type K · 0.82 M☉\nExoplanète géante confirmée' },
  ];

  return { buildStarGeometry, NAMED_STARS, NEARBY, specToColor, magToBrightness, radecToXYZ };
})();
