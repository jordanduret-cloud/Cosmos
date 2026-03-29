const CACHE = 'cosmos-v1';
const ASSETS = ['/', '/index.html', '/manifest.json',
  '/js/noise.js', '/js/shaders.js', '/js/textures.js',
  '/js/stardata.js', '/js/planets.js', '/js/galaxy.js',
  '/js/audio.js', '/js/main.js',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
  'https://fonts.googleapis.com/css2?family=Orbitron:wght@200;400;700&family=Space+Mono:ital@0;1&display=swap'
];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(()=>{}))));
self.addEventListener('fetch', e => e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => { if(res.ok){const c=res.clone();caches.open(CACHE).then(ca=>ca.put(e.request,c));} return res; }).catch(()=>caches.match('/index.html')))));
