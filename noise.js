// ═══════════════════════════════════════════════════════════════
// NOISE.JS — Procedural noise library
// ═══════════════════════════════════════════════════════════════
'use strict';

window.NOISE = (function(){

  // Value noise with smooth interpolation
  function hash(x, y, s=0){
    const n = Math.sin(x*127.1 + y*311.7 + s*74.3) * 43758.5453;
    return n - Math.floor(n);
  }

  function smoothNoise(x, y, s=0){
    const ix=Math.floor(x), iy=Math.floor(y);
    const fx=x-ix, fy=y-iy;
    const ux=fx*fx*(3-2*fx), uy=fy*fy*(3-2*fy);
    const a=hash(ix,iy,s),   b=hash(ix+1,iy,s);
    const c=hash(ix,iy+1,s), d=hash(ix+1,iy+1,s);
    return a+(b-a)*ux + (c-a+(a-b+d-c)*ux)*uy;
  }

  // Fractional Brownian Motion
  function fbm(x, y, octaves=6, seed=0, lacunarity=2.05, gain=0.5){
    let v=0, amp=0.5, freq=1, max=0;
    for(let i=0;i<octaves;i++){
      v += amp * smoothNoise(x*freq, y*freq, seed+i*3);
      max += amp; amp *= gain; freq *= lacunarity;
    }
    return v / max;
  }

  // Domain-warped fbm (creates swirling patterns)
  function warpedFbm(x, y, octaves=5, seed=0){
    const wx = fbm(x+0.0, y+0.0, octaves, seed);
    const wy = fbm(x+5.2, y+1.3, octaves, seed+10);
    return fbm(x + 1.8*wx, y + 1.8*wy, octaves, seed+20);
  }

  // Ridged multifractal — creates sharp mountain-like ridges
  function ridged(x, y, octaves=5, seed=0){
    let v=0, amp=0.5, freq=1;
    for(let i=0;i<octaves;i++){
      const n = smoothNoise(x*freq, y*freq, seed+i*3);
      v += amp * (1 - 2*Math.abs(n-0.5));
      amp *= 0.5; freq *= 2.1;
    }
    return Math.max(0, v);
  }

  // Turbulence — absolute value fbm
  function turbulence(x, y, octaves=5, seed=0){
    let v=0, amp=0.5, freq=1;
    for(let i=0;i<octaves;i++){
      v += amp * Math.abs(smoothNoise(x*freq, y*freq, seed+i*3)*2-1);
      amp *= 0.5; freq *= 2.1;
    }
    return v;
  }

  // Voronoi / cell noise — for crater generation
  function voronoi(x, y, seed=0){
    const ix=Math.floor(x), iy=Math.floor(y);
    let minDist=999;
    for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){
      const cx=ix+dx, cy=iy+dy;
      const px=cx+hash(cx,cy,seed);
      const py=cy+hash(cx,cy,seed+77);
      const dist=Math.hypot(x-px, y-py);
      if(dist<minDist) minDist=dist;
    }
    return minDist;
  }

  // Crater field using voronoi + fbm
  function craters(x, y, scale=4, seed=0){
    const v = voronoi(x*scale, y*scale, seed);
    // Bowl shape: dark center, bright rim
    const bowl = Math.pow(Math.max(0, 1-v*2.5), 2);
    const rim  = Math.exp(-Math.pow(v*2.5-0.8, 2)*8) * 0.6;
    return { depth: bowl, rim };
  }

  // 3D sphere noise — samples 2D noise projected onto sphere UV
  function sphereFbm(theta, phi, octaves=6, seed=0){
    const x = theta / (Math.PI*2);
    const y = phi / Math.PI;
    return fbm(x, y, octaves, seed);
  }

  return { hash, smoothNoise, fbm, warpedFbm, ridged, turbulence, voronoi, craters, sphereFbm };
})();
