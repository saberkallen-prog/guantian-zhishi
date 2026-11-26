/* Layered precipitation and animated, code-native natural close-ups. */
(() => {
  const random=n=>{const x=Math.sin(n*127.1+31.7)*43758.5453;return x-Math.floor(x);};
  function flake(ctx,x,y,r,angle,opacity){
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.strokeStyle=`rgba(253,255,249,${opacity})`;ctx.lineWidth=Math.max(.7,r*.085);ctx.lineCap='round';
    for(let arm=0;arm<6;arm++){ctx.rotate(Math.PI/3);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-r);for(const p of [.48,.73]){ctx.moveTo(0,-r*p);ctx.lineTo(-r*.20,-r*(p+.13));ctx.moveTo(0,-r*p);ctx.lineTo(r*.20,-r*(p+.13));}ctx.stroke();}ctx.restore();
  }
  function drawAtmosphere(ctx,w,h,time,profile,still=false){
    const {rain,snow}=profile;
    if(rain>.005){
      ctx.fillStyle=`rgba(39,70,64,${rain*.13})`;ctx.fillRect(0,0,w,h);
      for(let i=0;i<Math.floor(180*rain);i++){
        const depth=.3+random(i+8)*.7;
        const y=(random(i+14)*h+(still?0:time*(175+depth*150)))%(h+60)-30;
        const x=(random(i+4)*w-(still?0:time*35))%w;
        ctx.strokeStyle=`rgba(221,241,231,${.25+depth*.4})`;ctx.lineWidth=.4+depth*1.1;
        ctx.beginPath();ctx.moveTo((x+w)%w,y);ctx.lineTo((x+w)%w-5*depth,y+12+depth*22);ctx.stroke();
      }
      for(let i=0;i<15*rain;i++){
        const phase=still?.5:(time*.8+random(i+9))%1;
        ctx.strokeStyle=`rgba(235,249,236,${(1-phase)*.32})`;ctx.lineWidth=.8;
        ctx.beginPath();ctx.ellipse(random(i+84)*w,h*(.56+random(i+98)*.43),2+phase*12,1+phase*3,0,0,Math.PI*2);ctx.stroke();
      }
    }
    if(snow>.005){
      ctx.fillStyle=`rgba(216,232,231,${snow*.16})`;ctx.fillRect(0,0,w,h);
      for(let i=0;i<Math.floor(175*snow);i++){
        const depth=.2+random(i+54)*.8;
        const y=(random(i+14)*h+(still?0:time*(18+depth*33)))%(h+40)-20;
        const x=random(i+4)*w+(still?0:Math.sin(time*.6+i)*18);
        if(depth>.87)flake(ctx,x,y,3+depth*3,time*.2+i,.75);
        else {ctx.fillStyle=`rgba(250,254,249,${.38+depth*.55})`;ctx.beginPath();ctx.arc(x,y,1+depth*2,0,Math.PI*2);ctx.fill();}
      }
    }
  }
  function createMacro(canvas,kind){
    const ctx=canvas.getContext('2d');let w=1,h=1,ratio=1,visible=true,raf,last=0;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    function draw(time){
      ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,w,h);
      const background=ctx.createLinearGradient(0,0,w,h);
      if(kind==='rain'){background.addColorStop(0,'#203f35');background.addColorStop(1,'#6d8d65');}
      else {background.addColorStop(0,'#567574');background.addColorStop(.65,'#a9c0b6');background.addColorStop(1,'#e4e9dd');}
      ctx.fillStyle=background;ctx.fillRect(0,0,w,h);
      for(let i=0;i<20;i++){ctx.fillStyle=`rgba(236,244,207,${.025+random(i)*.05})`;ctx.beginPath();ctx.arc(random(i+2)*w,random(i+5)*h,7+random(i+30)*28,0,Math.PI*2);ctx.fill();}
      if(kind==='rain'){
        ctx.save();ctx.translate(w*.12,h*.76);ctx.rotate(-.30);
        const leaf=ctx.createLinearGradient(0,-h*.32,w*.8,0);leaf.addColorStop(0,'#718f4e');leaf.addColorStop(.5,'#a4ba68');leaf.addColorStop(1,'#476c42');
        ctx.fillStyle=leaf;ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(w*.26,-h*.31,w*.57,-h*.30,w*.80,-h*.24);ctx.bezierCurveTo(w*.61,-h*.04,w*.30,h*.03,0,0);ctx.fill();
        ctx.strokeStyle='#d0d89c80';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(w*.44,-h*.10,w*.8,-h*.24);ctx.stroke();
        for(let i=1;i<15;i++){const x=w*.052*i;ctx.strokeStyle='#d3dc9e30';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(x,-h*.015-i*h*.013);ctx.lineTo(x-w*.04,-h*.13-i*h*.008);ctx.stroke();}
        for(let i=0;i<8;i++){
          const x=w*(.20+i*.061),y=-h*(.1+i*.012),r=(4+random(i+6)*5)*Math.min(1.3,w/450);
          ctx.save();ctx.translate(x,y);ctx.fillStyle='#dbf6d942';ctx.strokeStyle='#efffdaaa';ctx.lineWidth=.8;ctx.beginPath();ctx.ellipse(0,0,r*1.3,r*.7,-.14,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#fcfff0dc';ctx.beginPath();ctx.ellipse(-r*.4,-r*.16,r*.35,r*.13,-.3,0,Math.PI*2);ctx.fill();ctx.restore();
        }
        ctx.restore();
        drawAtmosphere(ctx,w,h,time,{rain:.95,snow:0},reduced.matches);
        const ground=ctx.createLinearGradient(0,h*.85,0,h);ground.addColorStop(0,'#253e3600');ground.addColorStop(1,'#142f2bd9');ctx.fillStyle=ground;ctx.fillRect(0,h*.85,w,h*.15);
      } else {
        for(let i=0;i<16;i++){
          const x=w*(.04+i*.064),y=h*(.96+random(i)*.08),height=h*(.2+random(i+5)*.33);
          ctx.strokeStyle=i%2?'#6e7059':'#8e8970';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x-9,y-height*.6,x+12,y-height);ctx.stroke();
          ctx.strokeStyle='#edf2e4';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+8,y-height+4);ctx.lineTo(x+15,y-height+2);ctx.stroke();
        }
        const blanket=ctx.createLinearGradient(0,h*.80,0,h);blanket.addColorStop(0,'#edf2e000');blanket.addColorStop(1,'#e9eee2');ctx.fillStyle=blanket;ctx.fillRect(0,h*.8,w,h*.2);
        drawAtmosphere(ctx,w,h,time,{rain:0,snow:1},reduced.matches);
        flake(ctx,w*.64+Math.sin(time*.4)*9,h*.40+Math.sin(time*.3)*6,Math.min(w,h)*.11,time*.08,.90);
        flake(ctx,w*.24,h*.27,Math.min(w,h)*.05,-time*.12,.65);
      }
      canvas.dataset.weather=kind;
    }
    function frame(now){if(visible&&now-last>(reduced.matches?500:40)){draw(reduced.matches?0:now/1000);last=now;}raf=requestAnimationFrame(frame);}
    const resize=new ResizeObserver(()=>{const r=canvas.getBoundingClientRect();w=r.width;h=r.height;ratio=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);draw(0);});resize.observe(canvas);
    const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;});intersection.observe(canvas);raf=requestAnimationFrame(frame);
    return {destroy(){cancelAnimationFrame(raf);resize.disconnect();intersection.disconnect();}};
  }
  window.FarmWeather={drawAtmosphere,createMacro};
})();
