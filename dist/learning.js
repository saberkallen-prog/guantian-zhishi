(() => {
  'use strict';
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const {getTerm,getTermInfo,getSolarState}=window.FarmModel;
  const query=new URLSearchParams(location.search).get('term');
  const requested=query===null?NaN:Number(query);
  const valid=Number.isFinite(requested)&&requested>=0&&requested<=23;
  if(document.body.dataset.page==='terms'){
    let selected=valid?Math.round(requested):8,filter='all';
    function render(){
      $('#term-catalog').innerHTML=Array.from({length:24},(_,i)=>getTerm(i)).filter(t=>filter==='all'||Math.floor(t.index/6)===Number(filter)).map(t=>`<button data-term-index="${t.index}" class="catalog-term ${t.index===selected?'selected':''}" aria-pressed="${t.index===selected}"><small>${String(t.index+1).padStart(2,'0')}</small><strong>${t.name}</strong><span>${t.date}</span></button>`).join('');
      const t=getTermInfo(selected);
      $('#article-season').textContent=`${t.season} · 四时有序`;$('#article-number').textContent=`${String(selected+1).padStart(2,'0')} / 24`;
      for(const [id,key] of [['name','name'],['english','english'],['date','date'],['meaning','meaning'],['nature','nature'],['life','life']])$(`#article-${id}`).textContent=t[key];
      $('#article-longitude').textContent=`${t.longitude}°`;
      $('#article-sun').href=`sun.html?term=${selected}`;$('#article-farm').href=`index.html?term=${selected}`;
      $('.term-article').dataset.season=t.season;
    }
    $('#term-catalog').addEventListener('click',event=>{const button=event.target.closest('[data-term-index]');if(button){selected=Number(button.dataset.termIndex);render();if(matchMedia('(max-width:850px)').matches)$('.term-article').scrollIntoView({behavior:'smooth',block:'start'});}});
    $$('[data-filter]').forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.filter;if(filter!=='all')selected=Number(filter)*6;$$('[data-filter]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));render();}));
    render();
  }
  if(document.body.dataset.page==='sun'){
    let position=valid?requested:3,playing=null;
    const ns='http://www.w3.org/2000/svg';
    for(let i=0;i<24;i++){
      const a=getSolarState(i).earthLongitude*Math.PI/180;
      const x=340+185*Math.cos(a),y=270-185*Math.sin(a),lx=340+217*Math.cos(a),ly=270-217*Math.sin(a);
      const stop=document.createElementNS(ns,'g');stop.classList.add('orbit-stop');stop.dataset.index=i;stop.setAttribute('role','button');stop.setAttribute('tabindex','0');stop.setAttribute('aria-label',`查看${getTerm(i).name}`);
      stop.innerHTML=`<circle cx="${x}" cy="${y}" r="3"/><text x="${lx}" y="${ly+4}">${getTerm(i).name}</text>`;
      stop.addEventListener('click',()=>select(i));stop.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();select(i);}});$('#orbit-terms').append(stop);
    }
    function stop(){cancelAnimationFrame(playing);playing=null;$('#solar-play').textContent='▷ 播放一年';$('#solar-play').setAttribute('aria-pressed','false');}
    function select(value){stop();position=Math.max(0,Math.min(23,value));render();}
    function render(){
      const index=Math.round(position),term=getTerm(index),s=getSolarState(position),rad=Math.PI/180;
      const a=s.earthLongitude*rad,x=340+185*Math.cos(a),y=270-185*Math.sin(a);
      $('#orbit-earth').setAttribute('transform',`translate(${x} ${y})`);$('#sunlight-line').setAttribute('x2',x);$('#sunlight-line').setAttribute('y2',y);
      $$('.orbit-stop').forEach(item=>{item.classList.toggle('selected',Number(item.dataset.index)===index);item.setAttribute('aria-pressed',String(Number(item.dataset.index)===index));});
      $('#solar-term').textContent=term.name;$('#solar-date').textContent=term.date;$('#solar-english').textContent=term.english;
      $('#solar-longitude').innerHTML=`${s.longitude.toFixed(position%1===0?0:1)}<span>°</span>`;
      $('#degree-fill').style.width=`${s.longitude/360*100}%`;
      $('#solar-declination').textContent=Math.abs(s.declination)<.05?'赤道附近':`${s.declination>0?'北纬':'南纬'} ${Math.abs(s.declination).toFixed(1)}°`;
      $('#solar-explanation').textContent=({3:'春分，太阳直射赤道附近。以此为黄经0°的起点，沿黄道每前进15°，就迎来下一个节气。',9:'夏至，太阳直射北回归线附近。北半球大多数地区白昼较长，中原地区正午太阳较高。',15:'秋分，太阳再次直射赤道附近。此后北半球白昼继续缩短，逐渐走向冬季。',21:'冬至，太阳直射南回归线附近。北半球大多数地区白昼较短；之后日照渐长，寒冷却不会立即结束。'})[index]||`当前接近${term.name}。从地球看，太阳沿黄道的视位置约为${s.longitude.toFixed(1)}°。太阳直射纬度随之变化，各地的日照和正午日影也会改变。`;
      $('#solar-progress').value=position;$('#solar-progress').style.setProperty('--progress',`${position/23*100}%`);
      const label=position%1===0?term.name:`${getTerm(Math.floor(position)).name} → ${getTerm(Math.min(23,Math.ceil(position))).name}`;
      $('#solar-output').textContent=label;$('#solar-progress').setAttribute('aria-valuetext',label);
      $('#solar-term-link').href=`terms.html?term=${index}`;$('#solar-farm-link').href=`index.html?term=${index}`;
      $('#noon-altitude').textContent=`${s.noonAltitude.toFixed(1)}°`;$('#shadow-length').textContent=`${s.shadowRatio.toFixed(2)} m`;
      const minutes=Math.round(s.daylight*60);$('#daylight').textContent=`${Math.floor(minutes/60)}时${String(minutes%60).padStart(2,'0')}分`;
      const shadow=s.shadowRatio*90,sunX=180-80/Math.tan(s.noonAltitude*rad);
      $('#ground-shadow').setAttribute('width',shadow);$('#noon-sun').setAttribute('transform',`translate(${sunX} 30)`);
      for(const [name,value] of Object.entries({x1:sunX,y1:30,x2:180+shadow,y2:200}))$('#sun-ray').setAttribute(name,value);
      $('#shadow-term-label').textContent=`${term.name} · 北纬35° · 正午比较`;
      $('#orbit-diagram').dataset.longitude=s.longitude.toFixed(2);$('#shadow-diagram').dataset.shadow=s.shadowRatio.toFixed(3);
    }
    $('#solar-progress').addEventListener('input',()=>select(Number($('#solar-progress').value)));
    $('#solar-progress').addEventListener('keydown',event=>{const delta={ArrowLeft:-1,ArrowDown:-1,ArrowRight:1,ArrowUp:1};if(event.key in delta||event.key==='Home'||event.key==='End'){event.preventDefault();select(event.key==='Home'?0:event.key==='End'?23:Math.round(position)+delta[event.key]);}});
    $$('[data-pivot]').forEach(button=>button.addEventListener('click',()=>select(Number(button.dataset.pivot))));
    $('#solar-play').addEventListener('click',()=>{if(playing){stop();return;}$('#solar-play').textContent='Ⅱ 暂停';$('#solar-play').setAttribute('aria-pressed','true');let last=performance.now();const tick=now=>{position+=Math.min(now-last,100)/1000*.7;last=now;if(position>23)position=0;render();playing=requestAnimationFrame(tick);};playing=requestAnimationFrame(tick);});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});render();
  }
})();
