/* The scenery and plants are separate: scrubbing changes living crop geometry. */
(() => {
  'use strict';
  const lerp = (a,b,t) => a + (b-a)*t;
  const noise = seed => { const n = Math.sin(seed*127.1+311.7)*43758.5453; return n-Math.floor(n); };
  const plots = [
    { corners:[[270,292],[1260,277],[1170,325],[180,347]], rows:5, columns:32, scale:.30 },
    { corners:[[480,381],[1290,355],[1500,450],[270,510]], rows:9, columns:32, scale:.65 },
    { corners:[[480,580],[1510,490],[1660,720],[70,930]], rows:12, columns:34, scale:1 }
  ];
  function point(plot,u,v) {
    const [a,b,c,d]=plot.corners;
    return [lerp(lerp(a[0],b[0],u),lerp(d[0],c[0],u),v),lerp(lerp(a[1],b[1],u),lerp(d[1],c[1],u),v)];
  }
  window.FarmField = {
    create(canvas) {
      const ctx = canvas.getContext('2d');
      const backdrop = new Image();
      backdrop.src = 'assets/field-base.webp';
      let position=8;
      let weatherMode='auto';
      let state=window.FarmModel.getFieldState(position);
      let width=1,height=1,pixelRatio=1,lastFrame=0,raf;
      let visible=true,dirty=true;
      const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
      const plants=plots.map((plot,plotIndex) => Array.from({length:plot.rows*plot.columns},(_,i)=>{
        const row=Math.floor(i/plot.columns),column=i%plot.columns;
        const seed=plotIndex*1000+i;
        const u=(column+.5+(noise(seed)-.5)*.18)/plot.columns;
        const v=(row+.5+(noise(seed+2)-.5)*.12)/plot.rows;
        const [x,y]=point(plot,u,v);
        return {x,y,seed,scale:plot.scale*(.65+v*.45),variation:.8+noise(seed+4)*.35};
      }));
      function polygon(points) {
        ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();
      }
      function drawWater(plot,time) {
        const water=state.water;
        ctx.save();polygon(plot.corners);ctx.clip();
        ctx.globalAlpha=.17;
        const tone=ctx.createLinearGradient(0,320,0,900);
        tone.addColorStop(0,`hsl(${lerp(38,151,water)},${lerp(19,15,water)}%,${lerp(49,74,water)}%)`);
        tone.addColorStop(1,`hsl(${lerp(34,147,water)},${lerp(25,19,water)}%,${lerp(42,64,water)}%)`);
        ctx.fillStyle=tone;ctx.fillRect(0,280,1600,650);
        if(water>.1){
          ctx.lineWidth=.8;ctx.strokeStyle=`rgba(244,252,237,${water*.48})`;
          for(let i=0;i<45;i++){
            const x=noise(i+30)*1600,y=340+noise(i+40)*520;
            const drift=reduceMotion.matches?0:Math.sin(time*.35+i)*7;
            ctx.beginPath();ctx.moveTo(x+drift,y);ctx.lineTo(x+drift+12+noise(i)*42,y);ctx.stroke();
          }
        }
        if(state.frost>0){ctx.fillStyle=`rgba(229,235,223,${state.frost*.46})`;ctx.fillRect(0,300,1600,650);}
        ctx.restore();
      }
      function drawRice(plant,time,nursery=false) {
        const {x,y,seed,variation}=plant;
        const scale=plant.scale;
        const growth=nursery?state.nursery*.24:state.height;
        const density=nursery?1:state.density;
        const show=noise(seed+7)<density;
        if(growth>.005&&show){
          const h=(12+growth*115)*scale*variation;
          const mature=nursery?0:state.ripeness;
          const hue=lerp(99,43,mature);
          const wind=reduceMotion.matches?0:Math.sin(time*1.25+seed*.45)*(.8+growth*2.7)*scale;
          const stems=nursery?3:4+Math.floor(density*3);
          ctx.fillStyle=`rgba(48,66,36,${.07+growth*.06})`;
          ctx.beginPath();ctx.ellipse(x,y,7*scale+growth*9*scale,2*scale,0,0,Math.PI*2);ctx.fill();
          for(let j=0;j<stems;j++){
            const angle=(j-(stems-1)/2)*.18;
            const stalkH=h*(.74+noise(seed+j+20)*.28);
            const tipX=x+Math.sin(angle)*stalkH*.67+wind;
            const tipY=y-stalkH;
            ctx.strokeStyle=`hsl(${hue},${lerp(32,48,mature)}%,${lerp(35,50,mature)+j*1.6}%)`;
            ctx.lineWidth=Math.max(.6,scale*(1+growth*.6));ctx.lineCap='round';
            ctx.beginPath();ctx.moveTo(x+(j-stems/2)*scale*.7,y);ctx.quadraticCurveTo(x+wind*.3,y-stalkH*.6,tipX,tipY);ctx.stroke();
            for(let leaf=0;leaf<3;leaf++){
              const direction=(j+leaf)%2?1:-1;
              const startY=y-stalkH*(.23+leaf*.19);
              const length=stalkH*(.45-leaf*.065);
              ctx.strokeStyle=`hsl(${hue+3},${lerp(33,49,mature)}%,${lerp(39,57,mature)+leaf*3}%)`;
              ctx.lineWidth=Math.max(.7,scale*(1.4+growth*1.9-leaf*.3));
              ctx.beginPath();ctx.moveTo(x+wind*.3,startY);ctx.quadraticCurveTo(x+direction*length*.58+wind,startY-length*.85,x+direction*length*.94+wind,startY-length*.36);ctx.stroke();
            }
            const grain=nursery?0:state.grain;
            if(grain>.015 && j%2===0){
              const bend=(8+grain*13)*scale;
              ctx.strokeStyle=`hsl(${lerp(83,41,mature)},44%,${lerp(48,57,mature)}%)`;ctx.lineWidth=scale;
              ctx.beginPath();ctx.moveTo(tipX,tipY);ctx.quadraticCurveTo(tipX+bend*.8,tipY-8*scale,tipX+bend,tipY+bend*.65);ctx.stroke();
              const count=Math.ceil(grain*10);
              for(let k=0;k<count;k++){
                const p=(k+1)/11;
                const gx=tipX+bend*(1-(1-p)**2),gy=tipY-12*scale*p*(1-p)+bend*.65*p*p;
                ctx.fillStyle=`hsl(${lerp(85,40,mature)},${lerp(34,63,mature)}%,${lerp(53,66,mature)+noise(k+seed)*8}%)`;
                ctx.beginPath();ctx.ellipse(gx+(k%2?2:-2)*scale,gy,1.6*scale,3*scale,.5,0,Math.PI*2);ctx.fill();
              }
            }
          }
        }
        if(!nursery && state.stubble>.01 && noise(seed+13)<state.stubble){
          ctx.strokeStyle=`rgba(153,133,79,${.4+state.stubble*.5})`;ctx.lineWidth=1.6*scale;
          for(let j=0;j<4;j++){const dx=(j-1.5)*2.2*scale;ctx.beginPath();ctx.moveTo(x+dx,y);ctx.lineTo(x+dx+(j-1.5)*scale,y-(6+noise(seed+j)*7)*scale);ctx.stroke();}
          if(state.frost>0 && noise(seed+90)<state.frost){ctx.strokeStyle='#f2f1de';ctx.lineWidth=1.3*scale;ctx.beginPath();ctx.moveTo(x-3*scale,y-6*scale);ctx.lineTo(x+3*scale,y-7*scale);ctx.stroke();}
        }
      }
      function draw(time) {
        ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);ctx.clearRect(0,0,width,height);
        const zoom=Math.max(width/1600,height/800);
        const offsetX=(width-1600*zoom)*.62,offsetY=(height-800*zoom)*.35;
        ctx.translate(offsetX,offsetY);ctx.scale(zoom,zoom);
        if(backdrop.complete && backdrop.naturalWidth){ctx.drawImage(backdrop,0,0,1600,800);}
        else {ctx.fillStyle='#cfdfc6';ctx.fillRect(0,0,1600,800);}
        // Change ambient light continuously, keeping the same piece of land.
        const autumn=Math.max(0,1-Math.abs(position-16)/5)*.11;
        if(autumn){ctx.fillStyle=`rgba(219,165,72,${autumn})`;ctx.fillRect(0,0,1600,800);}
        if(state.frost){ctx.fillStyle=`rgba(210,226,225,${state.frost*.25})`;ctx.fillRect(0,0,1600,800);}
        plots.forEach((plot,i)=>{drawWater(plot,time);plants[i].forEach(plant=>drawRice(plant,time));});
        if(state.nursery>.005){
          const nursery={corners:[[1080,610],[1370,580],[1505,670],[1180,715]]};
          polygon(nursery.corners);ctx.fillStyle='#8e9e6470';ctx.fill();
          for(let row=0;row<6;row++)for(let column=0;column<17;column++){
            const [x,y]=point(nursery,(column+.5)/17,(row+.5)/6);
            drawRice({x,y,seed:row*20+column,scale:.44,variation:.9},time,true);
          }
        }
        ctx.fillStyle='#fff7d30e';ctx.fillRect(0,0,1600,800);
        ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);
        const weather=window.FarmModel.getWeatherProfile(position,weatherMode);
        window.FarmWeather.drawAtmosphere(ctx,width,height,time,weather,reduceMotion.matches);
        canvas.dataset.weather=weather.snow>.05?'snow':weather.rain>.05?'rain':'clear';
      }
      function frame(now) {
        if(visible && (dirty || (!reduceMotion.matches && now-lastFrame>50))){draw(now/1000);lastFrame=now;dirty=false;}
        raf=requestAnimationFrame(frame);
      }
      function resize() {
        const rect=canvas.getBoundingClientRect();width=rect.width;height=rect.height;
        pixelRatio=Math.min(window.devicePixelRatio||1,1.75);
        canvas.width=Math.round(width*pixelRatio);canvas.height=Math.round(height*pixelRatio);dirty=true;
      }
      new ResizeObserver(resize).observe(canvas);
      new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;dirty=true;}).observe(canvas);
      backdrop.onload=()=>{dirty=true;};
      backdrop.onerror=()=>{canvas.dataset.assetError='true';dirty=true;};
      document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);}else{raf=requestAnimationFrame(frame);}});
      resize();raf=requestAnimationFrame(frame);
      return {
        setTime(value){position=Math.max(0,Math.min(23,value));state=window.FarmModel.getFieldState(position);canvas.dataset.position=position.toFixed(2);canvas.dataset.cropHeight=state.height.toFixed(3);dirty=true;},
        setWeather(mode){weatherMode=mode;dirty=true;}
      };
    }
  };
})();
