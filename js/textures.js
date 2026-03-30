// ═══════════════════════════════════════════════════════════════
// TEXTURES.JS — Textures procédurales haute résolution (PC)
// ═══════════════════════════════════════════════════════════════
'use strict';

window.TEXTURES = (function(){
  const N = NOISE;

  function make(W, H, fn){
    const c=document.createElement('canvas'); c.width=W; c.height=H;
    fn(c.getContext('2d'),W,H);
    const t=new THREE.CanvasTexture(c); t.anisotropy=16; return t;
  }

  function mercury(){
    return make(2048,1024,(ctx,W,H)=>{
      const id=ctx.createImageData(W,H);
      for(let y=0;y<H;y++) for(let x=0;x<W;x++){
        const u=x/W*10,v=y/H*5;
        const base=N.fbm(u,v,8,10), ridge=N.ridged(u*2,v*2,6,20);
        const n=base*0.55+ridge*0.45;
        const highland=N.fbm(u*0.5,v*0.5,5,30)>0.54;
        const bv=highland?88+n*68:52+n*58;
        const i=(y*W+x)*4;
        img_set(id,i,bv+8,bv,bv-6);
      }
      ctx.putImageData(id,0,0);
      for(let k=0;k<200;k++){
        const cx=Math.random()*W,cy=Math.random()*H,r=1+Math.random()*Math.random()*22;
        const g1=ctx.createRadialGradient(cx,cy,0,cx,cy,r);
        g1.addColorStop(0,'rgba(18,14,10,0.85)');g1.addColorStop(0.6,'rgba(45,38,32,0.4)');g1.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=g1;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();
        const g2=ctx.createRadialGradient(cx,cy,r*0.75,cx,cy,r*1.5);
        g2.addColorStop(0,'rgba(0,0,0,0)');g2.addColorStop(0.5,'rgba(155,142,128,0.28)');g2.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=g2;ctx.beginPath();ctx.arc(cx,cy,r*1.5,0,Math.PI*2);ctx.fill();
      }
      const bx=W*0.3,by=H*0.45;
      const bg=ctx.createRadialGradient(bx,by,0,bx,by,100);
      bg.addColorStop(0,'rgba(105,95,82,0.55)');bg.addColorStop(0.8,'rgba(82,72,62,0.3)');bg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=bg;ctx.beginPath();ctx.arc(bx,by,100,0,Math.PI*2);ctx.fill();
    });
  }

  function venus(){
    return make(2048,1024,(ctx,W,H)=>{
      const id=ctx.createImageData(W,H);
      for(let y=0;y<H;y++) for(let x=0;x<W;x++){
        const u=x/W*6,v=y/H*3;
        const n1=N.warpedFbm(u,v,7,1),n2=N.warpedFbm(u+n1*0.9,v+n1*0.5,5,8);
        const n=n1*0.52+n2*0.48;
        const band=Math.sin(v*Math.PI*10)*0.06;
        const f=n+band;
        const i=(y*W+x)*4;
        img_set(id,i,Math.min(255,198+f*60),Math.min(255,172+f*50),Math.min(255,68+f*40));
      }
      ctx.putImageData(id,0,0);
      [0,W].forEach(px=>{
        const g=ctx.createRadialGradient(px,H*0.07,0,px,H*0.07,H*0.14);
        g.addColorStop(0,'rgba(235,205,105,0.45)');g.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=g;ctx.beginPath();ctx.arc(px,H*0.07,H*0.14,0,Math.PI*2);ctx.fill();
      });
    });
  }

  function earth(){
    return make(2048,1024,(ctx,W,H)=>{
      ctx.fillStyle='#0d3a6e';ctx.fillRect(0,0,W,H);
      const id=ctx.createImageData(W,H);
      for(let y=0;y<H;y++) for(let x=0;x<W;x++){
        const u=x/W*5,v=y/H*2.5;
        const n=N.fbm(u,v,9,3);
        const polar=y/H;
        const isPolar=polar<0.06||polar>0.94;
        const i=(y*W+x)*4;
        if(isPolar){
          const blend=Math.min(1,(polar<0.06?(0.06-polar)*22:(polar-0.94)*22));
          img_set(id,i,Math.min(255,218+blend*37),Math.min(255,228+blend*27),Math.min(255,238+blend*17));
        } else if(n>0.502){
          const s=n-0.502;
          const lat=Math.abs(v/2.5-0.5);
          const moisture=N.fbm(u+5,v+3,6,22);
          let r,g,b;
          if(lat>0.38){r=175;g=188;b=198;}
          else if(moisture>0.56){r=20+s*100;g=78+s*72;b=15+s*38;}
          else if(moisture>0.42){r=58+s*82;g=118+s*78;b=32+s*48;}
          else{r=188+s*52;g=168+s*42;b=98+s*32;}
          img_set(id,i,Math.min(255,r),Math.min(255,g),Math.min(255,b));
        } else {
          const d=N.fbm(u+2,v+2,5,9);
          img_set(id,i,14+d*28,52+d*60,132+d*75);
        }
      }
      ctx.putImageData(id,0,0);
      const id2=ctx.createImageData(W,H);
      for(let y=0;y<H;y++) for(let x=0;x<W;x++){
        const u=x/W*7.5+0.4,v=y/H*3.8;
        const c=N.warpedFbm(u,v,7,13);
        const a=Math.max(0,c-0.44)*4.5;
        const i=(y*W+x)*4;
        id2.data[i]=id2.data[i+1]=id2.data[i+2]=255;
        id2.data[i+3]=Math.min(255,a*205);
      }
      ctx.putImageData(id2,0,0);
    });
  }

  function earthClouds(){
    return make(2048,1024,(ctx,W,H)=>{
      const id=ctx.createImageData(W,H);
      for(let y=0;y<H;y++) for(let x=0;x<W;x++){
        const u=x/W*8+0.4,v=y/H*4;
        const c=N.warpedFbm(u,v,7,13);
        const a=Math.max(0,c-0.42)*4.5;
        const i=(y*W+x)*4;
        id.data[i]=id.data[i+1]=id.data[i+2]=255;
        id.data[i+3]=Math.min(255,a*215);
      }
      ctx.putImageData(id,0,0);
    });
  }

  function mars(){
    return make(2048,1024,(ctx,W,H)=>{
      const id=ctx.createImageData(W,H);
      for(let y=0;y<H;y++) for(let x=0;x<W;x++){
        const u=x/W*7,v=y/H*3.5;
        const n=N.fbm(u,v,9,5);
        const highland=N.fbm(u*0.4,v*0.4,6,35);
        const dust=N.fbm(u*2.5,v*2.5,5,45);
        const polar=y/H;
        const isPolar=polar<0.045||polar>0.955;
        const i=(y*W+x)*4;
        if(isPolar){img_set(id,i,228,216,210);}
        else{
          const isH=highland>0.52;
          img_set(id,i,
            Math.min(255,(isH?168:148)+n*65+dust*15),
            Math.min(255,(isH?80:56)+n*30+dust*6),
            Math.min(255,(isH?55:36)+n*18+dust*4));
        }
      }
      ctx.putImageData(id,0,0);
      // Olympus Mons
      const ox=W*0.72,oy=H*0.38;
      const og=ctx.createRadialGradient(ox,oy,0,ox,oy,48);
      og.addColorStop(0,'rgba(215,155,112,0.85)');og.addColorStop(0.5,'rgba(190,118,82,0.5)');og.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=og;ctx.beginPath();ctx.arc(ox,oy,48,0,Math.PI*2);ctx.fill();
      // Valles Marineris
      ctx.save();ctx.strokeStyle='rgba(98,40,18,0.58)';ctx.lineWidth=5;ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(W*0.26,H*0.52);ctx.bezierCurveTo(W*0.38,H*0.50,W*0.52,H*0.51,W*0.64,H*0.49);ctx.stroke();
      ctx.lineWidth=3;ctx.strokeStyle='rgba(78,30,12,0.38)';
      ctx.beginPath();ctx.moveTo(W*0.28,H*0.55);ctx.bezierCurveTo(W*0.40,H*0.53,W*0.54,H*0.54,W*0.63,H*0.52);ctx.stroke();
      ctx.restore();
      // Quelques grands cratères
      for(let k=0;k<30;k++){
        const cx=Math.random()*W,cy=H*0.1+Math.random()*H*0.8,r=3+Math.random()*Math.random()*18;
        const g=ctx.createRadialGradient(cx,cy,0,cx,cy,r);
        g.addColorStop(0,'rgba(55,20,8,0.7)');g.addColorStop(0.7,'rgba(90,45,22,0.3)');g.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fill();
      }
    });
  }

  function jupiter(){
    return make(2048,1024,(ctx,W,H)=>{
      const id=ctx.createImageData(W,H);
      const BANDS=[[0,.04,202,168,108],[.04,.09,160,118,70],[.09,.16,230,200,142],[.16,.22,150,110,66],[.22,.30,220,188,132],[.30,.38,165,130,86],[.38,.44,215,182,128],[.44,.52,155,115,72],[.52,.60,222,192,136],[.60,.68,160,124,78],[.68,.76,208,172,114],[.76,.84,152,115,72],[.84,.91,218,185,130],[.91,.97,198,162,108],[.97,1,188,148,96]];
      for(let y=0;y<H;y++) for(let x=0;x<W;x++){
        const fy=y/H,u=x/W*12,v=y/H*6;
        const wave=N.fbm(u,v,6,22)*0.032+N.fbm(u*0.5,v*2,4,55)*0.016;
        const py=fy+wave;
        let r=200,g=162,b=102;
        for(const[y0,y1,br,bg,bb]of BANDS)if(py>=y0&&py<y1){r=br;g=bg;b=bb;break;}
        const turb=N.fbm(u,v,5,33)*24-12;
        const i=(y*W+x)*4;
        img_set(id,i,Math.min(255,r+turb),Math.min(255,g+turb*0.5),Math.min(255,b+turb*0.2));
      }
      ctx.putImageData(id,0,0);
      // Grande Tache Rouge + anneaux
      const gx=W*0.60,gy=H*0.62,gw=52,gh=28;
      for(let ring=0;ring<4;ring++){
        const rg=ctx.createRadialGradient(gx,gy,0,gx,gy,gw*(1+ring*0.32));
        if(ring===0){rg.addColorStop(0,'rgba(188,60,38,0.97)');rg.addColorStop(.55,'rgba(162,75,44,0.75)');rg.addColorStop(1,'rgba(0,0,0,0)');}
        else if(ring===1){rg.addColorStop(0,'rgba(0,0,0,0)');rg.addColorStop(.65,'rgba(210,148,88,0.35)');rg.addColorStop(1,'rgba(0,0,0,0)');}
        else if(ring===2){rg.addColorStop(0,'rgba(0,0,0,0)');rg.addColorStop(.75,'rgba(185,128,72,0.18)');rg.addColorStop(1,'rgba(0,0,0,0)');}
        else{rg.addColorStop(0,'rgba(0,0,0,0)');rg.addColorStop(.85,'rgba(165,112,62,0.08)');rg.addColorStop(1,'rgba(0,0,0,0)');}
        ctx.fillStyle=rg;ctx.save();ctx.translate(gx,gy);ctx.scale(1,gh/gw);ctx.translate(-gx,-gy);ctx.beginPath();ctx.arc(gx,gy,gw*(1+ring*0.32),0,Math.PI*2);ctx.fill();ctx.restore();
      }
      // Oval BA
      const bx=W*0.24,by=H*0.72;
      const bg=ctx.createRadialGradient(bx,by,0,bx,by,22);
      bg.addColorStop(0,'rgba(242,202,162,0.85)');bg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=bg;ctx.save();ctx.translate(bx,by);ctx.scale(1,0.52);ctx.translate(-bx,-by);ctx.beginPath();ctx.arc(bx,by,22,0,Math.PI*2);ctx.fill();ctx.restore();
    });
  }

  function saturn(){
    return make(2048,1024,(ctx,W,H)=>{
      const id=ctx.createImageData(W,H);
      for(let y=0;y<H;y++) for(let x=0;x<W;x++){
        const fy=y/H,u=x/W*9,v=y/H*4.5;
        const wave=N.fbm(u,v,5,40)*0.024;
        const band=Math.sin((fy+wave)*Math.PI*20)*0.5+0.5;
        const n=N.fbm(u,v,6,41)*18;
        const i=(y*W+x)*4;
        img_set(id,i,Math.min(255,210+band*32+n),Math.min(255,190+band*26+n*0.75),Math.min(255,116+band*18+n*0.3));
      }
      ctx.putImageData(id,0,0);
      // Dragon Storm
      const dx=W*0.8,dy=H*0.28;
      const dg=ctx.createRadialGradient(dx,dy,0,dx,dy,16);
      dg.addColorStop(0,'rgba(255,242,202,0.55)');dg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=dg;ctx.beginPath();ctx.arc(dx,dy,16,0,Math.PI*2);ctx.fill();
    });
  }

  function saturnRings(){
    return make(1024,16,(ctx,W,H)=>{
      const RINGS=[[0,.08,'rgba(72,58,36,0.12)'],[.08,.22,'rgba(212,188,132,0.62)'],[.22,.52,'rgba(242,218,158,0.90)'],[.52,.58,'rgba(0,0,0,0.96)'],[.58,.82,'rgba(228,200,142,0.75)'],[.82,.86,'rgba(175,158,112,0.28)'],[.86,.93,'rgba(212,188,132,0.58)'],[.93,1,'rgba(115,95,68,0.18)']];
      RINGS.forEach(([x0,x1,col])=>{ctx.fillStyle=col;ctx.fillRect(x0*W,0,(x1-x0)*W,H);});
    });
  }

  function uranus(){
    return make(2048,1024,(ctx,W,H)=>{
      const id=ctx.createImageData(W,H);
      for(let y=0;y<H;y++) for(let x=0;x<W;x++){
        const u=x/W*5,v=y/H*2.5;
        const n=N.fbm(u,v,7,50)*0.44,subtle=N.fbm(u*3.5,v*3.5,4,58)*0.08;
        const i=(y*W+x)*4;
        img_set(id,i,Math.min(255,72+n*44+subtle*22),Math.min(255,194+n*34+subtle*16),Math.min(255,208+n*24+subtle*10));
      }
      ctx.putImageData(id,0,0);
    });
  }

  function neptune(){
    return make(2048,1024,(ctx,W,H)=>{
      const id=ctx.createImageData(W,H);
      for(let y=0;y<H;y++) for(let x=0;x<W;x++){
        const u=x/W*8,v=y/H*4;
        const n=N.fbm(u,v,8,60),storm=N.warpedFbm(u*2,v*2,6,65);
        const i=(y*W+x)*4;
        img_set(id,i,Math.min(255,22+n*44+storm*16),Math.min(255,58+n*68+storm*22),Math.min(255,192+n*56+storm*18));
      }
      ctx.putImageData(id,0,0);
      const dx=W*0.38,dy=H*0.44;
      ctx.save();const dg=ctx.createRadialGradient(dx,dy,2,dx,dy,32);dg.addColorStop(0,'rgba(5,10,62,0.90)');dg.addColorStop(.7,'rgba(8,18,82,0.5)');dg.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=dg;ctx.translate(dx,dy);ctx.scale(1,0.52);ctx.translate(-dx,-dy);ctx.beginPath();ctx.arc(dx,dy,32,0,Math.PI*2);ctx.fill();ctx.restore();
      const sx=W*0.55,sy=H*0.38;const sg=ctx.createRadialGradient(sx,sy,0,sx,sy,12);sg.addColorStop(0,'rgba(220,240,255,0.42)');sg.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=sg;ctx.beginPath();ctx.arc(sx,sy,12,0,Math.PI*2);ctx.fill();
    });
  }

  function moon(){
    return make(1024,512,(ctx,W,H)=>{
      const id=ctx.createImageData(W,H);
      for(let y=0;y<H;y++) for(let x=0;x<W;x++){
        const u=x/W*7,v=y/H*3.5;
        const n=N.fbm(u,v,8,70)*0.68+N.ridged(u*2,v*2,5,75)*0.32;
        const highland=N.fbm(u*0.5,v*0.5,5,80)>0.54;
        const base=highland?72+n*65:38+n*50;
        const i=(y*W+x)*4;img_set(id,i,base+5,base+2,base);
      }
      ctx.putImageData(id,0,0);
      const mares=[{x:.3,y:.4,r:52},{x:.6,y:.35,r:38},{x:.45,y:.6,r:30},{x:.18,y:.55,r:22}];
      mares.forEach(m=>{const g=ctx.createRadialGradient(m.x*W,m.y*H,0,m.x*W,m.y*H,m.r);g.addColorStop(0,'rgba(28,26,23,0.75)');g.addColorStop(.8,'rgba(35,32,28,0.42)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(m.x*W,m.y*H,m.r,0,Math.PI*2);ctx.fill();});
      const tx=W*0.55,ty=H*0.75;const tg=ctx.createRadialGradient(tx,ty,0,tx,ty,20);tg.addColorStop(0,'rgba(12,10,8,0.82)');tg.addColorStop(.6,'rgba(38,36,33,0.42)');tg.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=tg;ctx.beginPath();ctx.arc(tx,ty,20,0,Math.PI*2);ctx.fill();
      ctx.save();ctx.globalAlpha=0.28;ctx.strokeStyle='rgba(202,196,188,1)';ctx.lineWidth=1.5;for(let r=0;r<14;r++){const a=r/14*Math.PI*2;const len=65+Math.random()*90;ctx.beginPath();ctx.moveTo(tx,ty);ctx.lineTo(tx+Math.cos(a)*len,ty+Math.sin(a)*len);ctx.stroke();}ctx.restore();
    });
  }

  function starGlow(){
    return make(128,128,(ctx,W,H)=>{
      const g=ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,W/2);
      g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(0.12,'rgba(220,230,255,0.85)');g.addColorStop(0.4,'rgba(100,150,255,0.25)');g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    });
  }

  // Helper
  function img_set(id,i,r,g,b){id.data[i]=r;id.data[i+1]=g;id.data[i+2]=b;id.data[i+3]=255;}

  const cache={};
  function get(name){
    if(!cache[name]){
      const builders={mercury,venus,earth,earthClouds,mars,jupiter,saturn,saturnRings,uranus,neptune,moon,starGlow};
      cache[name]=builders[name]?.()??null;
    }
    return cache[name];
  }

  return{get,make};
})();
