/* A small, dependency-free solar-term field experience. */
(() => {
  'use strict';
  const { getTerm, recordObservation } = window.FarmModel;
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const icon = (name, extra = '') => `<svg ${extra} aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const storageKey = 'guantian-field-journal-v1';
  let records = [];
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (Array.isArray(stored)) records = [...new Set(stored.filter(item => Number.isInteger(item.index) && item.index >= 0 && item.index < 24).map(item => item.index))].reduce((list, index) => recordObservation(list, index), []);
  } catch { /* Storage can be unavailable in private / file browsing. */ }
  const queryTerm=new URLSearchParams(location.search).get('term');
  const requestedTerm=queryTerm===null?NaN:Number(queryTerm);
  let index = Number.isFinite(requestedTerm)&&requestedTerm>=0&&requestedTerm<=23?Math.round(requestedTerm):8;
  let position = index;
  let playback = null;
  let toastTimer;
  let dialogReturnFocus;
  let weatherMacro=null;
  const dialog = $('#detail-dialog');
  const timeline = $('#timeline');
  const scrubber = $('#season-progress');
  const field = window.FarmField.create($('#field-canvas'));
  window.FarmWeather.createMacro($('#rain-preview'),'rain');
  window.FarmWeather.createMacro($('#snow-preview'),'snow');
  const seasonEnglish = { 春:'SPRING', 夏:'SUMMER', 秋:'AUTUMN', 冬:'WINTER' };
  timeline.innerHTML = Array.from({ length:24 }, (_, i) => {
    const term = getTerm(i);
    return `<button class="term-button" data-term="${i}" aria-label="${term.name}，${term.date}" aria-pressed="false"><span class="term-dot"></span><span class="term-text">${term.name}</span></button>`;
  }).join('');
  const growthSteps = [
    { index:4, label:'备田', time:'春耕准备', path:'M4 17h16M5 13l3-3 3 3 3-3 5 3M9 3v7m0-4 5-2M4 21h16' },
    { index:5, label:'育秧', time:'稻种萌发', path:'M12 21V10m0 5C4 15 4 9 4 9c6-1 8 3 8 6Zm0-4c0-5 7-7 8-6 0 4-3 6-8 6Z' },
    { index:8, label:'移栽', time:'秧苗入田', path:'M12 19V5m0 8L7 8m5 2 5-5M3 18c3-2 5 2 8 0s5 2 10 0M3 22c3-2 5 2 8 0s5 2 10 0' },
    { index:11, label:'生长', time:'稻株分蘖', path:'M12 22V4m0 7c-5 0-7-4-7-6 5 0 7 2 7 6Zm0 6c6 0 8-5 8-7-5 0-8 3-8 7ZM5 22V12m13 10v-5' },
    { index:14, label:'抽穗', time:'稻穗渐丰', path:'M11 22V7m0 7c8 0 9-6 9-10-5 0-9 4-9 10ZM11 10 6 5m5 12-6-5m9-5 4 3m-5 0 4 3' },
    { index:16, label:'收获', time:'稻谷归仓', path:'M7 20 17 5m-8 12-4-4m7 0-5-4m8-1-5-4m4 6 5 1m-7 3 6 1M4 20h16' },
    { index:21, label:'养田', time:'冬闲待春', path:'M3 19h18M5 14h14M7 9h10M12 2v3m-7 0 2 2m12-2-2 2M3 23h18' }
  ];
  $('#growth-track').innerHTML = growthSteps.map((step, i) => `<button class="growth-step" data-growth="${step.index}" aria-label="查看${step.label}阶段"><span class="growth-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${step.path}"/></svg></span><strong>${String(i + 1).padStart(2,'0')} · ${step.label}</strong><span>${step.time}</span></button>`).join('');
  function toast(message) {
    clearTimeout(toastTimer);
    $('#toast').textContent = message;
    $('#toast').classList.add('visible');
    toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3400);
  }
  function stopSpeech() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    $('#narration').setAttribute('aria-pressed','false');
  }
  function render(scroll = true) {
    const term = getTerm(index);
    index = term.index;
    stopSpeech();
    const scene = $('.scene');
    scene.dataset.scene = term.scene;
    $('#term-name').textContent = term.name;
    $('#term-english').textContent = term.english;
    $('#term-date').textContent = term.date;
    $('#term-longitude').textContent = `${term.longitude}°`;
    $('#term-number').textContent = `${String(index + 1).padStart(2,'0')} / 24`;
    $('#step-indicator').textContent = $('#term-number').textContent;
    $('#term-season').textContent = `${term.season} · ${seasonEnglish[term.season]}`;
    $('#term-description').textContent = term.description;
    $('#story-term').textContent=term.name;
    $('#story-meaning').textContent=window.FarmModel.getTermInfo(index).meaning;
    $('#term-read-link').href=`terms.html?term=${index}`;
    $('#term-sun-link').href=`sun.html?term=${index}`;
    $('#stage-label').textContent = term.label;
    $('#rice-label').textContent = term.phase >= 4 && term.phase <= 5 ? '看看稻穗' : term.phase === 6 ? '冬闲稻田' : term.phase < 2 ? '看看田地' : '看看秧苗';
    $('#landscape').setAttribute('aria-label', `${term.name}的江南稻田，${term.label}，作物随节气进度实时变化`);
    const complete = records.some(record => record.index === index);
    $('#action-label').textContent = complete ? '已记入手记' : term.action;
    $('#farm-action').classList.toggle('completed',complete);
    $('#farm-action').setAttribute('aria-label', complete ? `${term.name}已记入手记，点击查看` : `${term.name}：${term.action}`);
    $('#farm-action svg use').setAttribute('href', complete ? '#i-check' : '#i-arrow');
    $('#scene-note').textContent = ['春水映田，静候草木舒展。','一粒稻种，正悄悄萌发。','秧苗入田，静候一季稻香。','稻叶渐密，听见夏日生长。','稻穗渐丰，青色慢慢转金。','一田金黄，收下四时馈赠。','田野归静，等待春日再来。'][term.phase];
    $('#record-count').textContent = records.length;
    $$('.term-button').forEach((button, i) => {
      button.classList.toggle('selected', i === index);
      button.classList.toggle('visited',records.some(record => record.index === i));
      button.setAttribute('aria-pressed',String(i === index));
    });
    $$('.seasons button').forEach(button => button.classList.toggle('selected',Math.floor(Number(button.dataset.season) / 6) === Math.floor(index / 6)));
    $$('.growth-step').forEach((button,i) => {button.classList.toggle('selected', i === term.phase);button.setAttribute('aria-pressed',String(i === term.phase));});
    $('#action-effect').replaceChildren();
    updateField();
    if (scroll) {
      const selected = $(`.term-button[data-term="${index}"]`);
      const scroller = $('#timeline-scroll');
      const left = selected.offsetLeft - scroller.clientWidth / 2 + selected.clientWidth / 2;
      scroller.scrollTo({left:Math.max(0,left),behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
    }
  }
  function updateField() {
    field.setTime(position);
    scrubber.value = position;
    scrubber.style.setProperty('--progress',`${position / 23 * 100}%`);
    const before = getTerm(Math.floor(position));
    const after = getTerm(Math.min(23,Math.ceil(position)));
    const label = before.index === after.index ? before.name : `${before.name} → ${after.name}`;
    $('#scrub-readout').textContent = label;
    scrubber.setAttribute('aria-valuetext',label);
  }
  function setPosition(value) {
    position = Math.max(0,Math.min(23,value));
    const nearest = Math.round(position);
    if (nearest !== index) {index = nearest;render(true);}
    else updateField();
  }
  function stopPlayback() {
    cancelAnimationFrame(playback); playback = null;
    $('#autoplay').setAttribute('aria-pressed','false');
    $('#play-label').textContent = '播放生长';
    $('#play-icon use').setAttribute('href','#i-play');
  }
  function selectTerm(nextIndex) { stopPlayback(); index = getTerm(nextIndex).index; position = index; render(); }
  scrubber.addEventListener('input',() => {stopPlayback();setPosition(Number(scrubber.value));});
  scrubber.addEventListener('keydown',event => {
    const offsets = {ArrowLeft:-1,ArrowDown:-1,ArrowRight:1,ArrowUp:1,PageDown:-6,PageUp:6};
    if (event.key in offsets || event.key === 'Home' || event.key === 'End') {
      event.preventDefault();stopPlayback();
      setPosition(event.key === 'Home' ? 0 : event.key === 'End' ? 23 : Math.round(position) + offsets[event.key]);
    }
  });
  timeline.addEventListener('click',event => { const button = event.target.closest('[data-term]'); if (button) selectTerm(Number(button.dataset.term)); });
  $$('[data-season]').forEach(button => button.addEventListener('click',() => selectTerm(Number(button.dataset.season))));
  $$('[data-growth]').forEach(button => button.addEventListener('click',() => { selectTerm(Number(button.dataset.growth)); $('#experience').scrollIntoView({behavior:'smooth',block:'start'}); }));
  $('#previous').addEventListener('click',() => selectTerm(index - 1));
  $('#next').addEventListener('click',() => selectTerm(index + 1));
  $('#autoplay').addEventListener('click',() => {
    if (playback) {stopPlayback();return;}
    $('#autoplay').setAttribute('aria-pressed','true');
    $('#play-label').textContent = '暂停生长';
    $('#play-icon use').setAttribute('href','#i-pause');
    let last = performance.now();
    const tick = now => {
      const next = position + Math.min(now-last,100) / 1000 * .7;
      last = now;setPosition(next > 23 ? 0 : next);
      playback = requestAnimationFrame(tick);
    };
    playback = requestAnimationFrame(tick);
  });
  $('#farm-action').addEventListener('click',() => {
    stopPlayback();
    const term = getTerm(index);
    if (records.some(record => record.index === index)) {openPanel('journal');return;}
    records = recordObservation(records,index);
    let saved = true;
    try {localStorage.setItem(storageKey,JSON.stringify(records));} catch {saved = false;}
    render(false);
    const showSprouts = term.phase >= 1 && term.phase <= 3;
    $('#action-effect').innerHTML = Array.from({length:14},(_,i) => `<span class="${showSprouts ? 'sprout' : 'spark'}" style="--x:${49 + (i % 5) * 7}%;--y:${13 + Math.floor(i / 5) * 9}%;--delay:${i * 45}ms">${showSprouts ? '' : '✧'}</span>`).join('');
    toast(saved ? term.feedback : `${term.feedback} 本次记录仅保留在当前页面。`);
  });
  function openDialog(title,body,kicker = '田间观察') {
    stopPlayback(); stopSpeech();
    dialogReturnFocus = document.activeElement;
    $('#dialog-title').textContent = title;
    $('#dialog-kicker').textContent = kicker;
    $('#dialog-body').innerHTML = body;
    if (!dialog.open) dialog.showModal();
  }
  function setWeather(mode){field.setWeather(mode);$$('[data-weather-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.weatherMode===mode)));}
  $$('[data-weather-mode]').forEach(button=>button.addEventListener('click',()=>setWeather(button.dataset.weatherMode)));
  $$('[data-weather-detail]').forEach(button=>button.addEventListener('click',()=>{
    const kind=button.dataset.weatherDetail;
    openDialog(kind==='rain'?'雨落新秧':'雪落稻茬',`<canvas id="weather-macro" role="img" aria-label="${kind==='rain'?'雨滴落在绿色稻叶上的动态特写':'雪花缓缓飘落到稻茬上的动态特写'}"></canvas><p>${kind==='rain'?'把镜头靠近叶面：细雨沿着叶脉滑落，水珠停在叶尖。雨水与谷雨的名称，让我们注意到降水和生长之间的联系。':'把镜头靠近冬日田野：雪花在近处缓缓飘落，轻覆在收获后的稻茬上。小雪、大雪是节气名称，不表示当天必然降雪。'}</p><p class="dialog-note">这是艺术化天气演示，不是实时天气或特定地点的物候记录。</p><button id="apply-weather" class="dialog-button">把田间切换为${kind==='rain'?'雨景':'雪景'} ↗</button>`,'NATURE, UP CLOSE · 自然特写');
    dialog.classList.add('weather-dialog');weatherMacro=window.FarmWeather.createMacro($('#weather-macro'),kind);
    $('#apply-weather').addEventListener('click',()=>{setWeather(kind);closeDialog();$('#experience').scrollIntoView({behavior:'smooth'});});
  }));
  dialog.addEventListener('close',()=>{weatherMacro?.destroy();weatherMacro=null;dialog.classList.remove('weather-dialog');});
  function closeDialog() { dialog.close(); dialogReturnFocus?.focus(); }
  $('#close-dialog').addEventListener('click',closeDialog);
  dialog.addEventListener('click',event => {if(event.target === dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom) closeDialog();}});
  dialog.addEventListener('cancel',() => {setTimeout(() => dialogReturnFocus?.focus(),0);});
  function openPanel(panel) {
    const term = getTerm(index);
    if (panel === 'journal') {
      const entries = records.length ? records.map(record => `<div class="journal-entry"><strong>${record.name}</strong><div><p>${record.phase}</p><p>已体验 · ${record.action}</p></div>${icon('check')}</div>`).join('') : `<div class="empty-journal">${icon('book')}<p>手记还是空白的。<br>在田间完成一次体验，就能留下第一条观察。</p></div>`;
      openDialog('我的田间手记',`<p class="journal-summary">已记录 ${records.length} / 24 个节气 · 保存在当前浏览器</p>${entries}${records.length ? `<button id="export-journal" class="dialog-button">${icon('download')}保存手记文本</button>` : ''}`,'FIELD NOTES · 四时有记');
      $('#export-journal')?.addEventListener('click',() => {
        const text = `观天知时 · 我的田间手记\n江南单季稻作 · 互动示意\n\n${records.map(record => `${record.name}｜${record.phase}｜已体验：${record.action}`).join('\n')}\n\n农事阶段为教学示意，具体农时因地区、品种和天气而异。`;
        const url = URL.createObjectURL(new Blob(['\uFEFF',text],{type:'text/plain;charset=utf-8'}));
        const link=document.createElement('a');link.href=url;link.download='观天知时-田间手记.txt';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
      });
    }
    if (panel === 'help') openDialog('让一年，在手中生长',`<div class="guide-step"><b>1</b><p>按住时间轴上的圆点左右拖动。稻株会连续长高、变密、抽穗、转金；收割后变为稻茬与冬闲田。</p></div><div class="guide-step"><b>2</b><p>点击节气名称可直接跳转，也可播放整年的生长。键盘方向键逐节气移动，Home / End 跳至年初 / 年末。</p></div><div class="guide-step"><b>3</b><p>点击田里的「＋」了解田间知识，完成农事体验后，保存一页手记。</p></div><p class="dialog-note">田园底景为 AI 生成插画，稻株、水面、稻穗与稻茬由 Canvas 实时绘制。24 组关键状态之间连续过渡，用于教学展示，不是农业生长预测。</p>`,'EXPERIENCE GUIDE · 体验说明');
    if (panel === 'astronomy') openDialog('节气为什么看太阳？',`<p>二十四节气以太阳周年视运动为依据。按现在使用的定气法，太阳在黄道上的视位置每前进 15°，便到达下一个节气。</p><div class="sun-orbit" style="--angle:${term.longitude - 90}deg">${icon('sun','class="sun-symbol"')}<span class="orbit-dot"></span></div><p class="orbit-caption">当前：${term.name} · 太阳黄经 ${term.longitude}°</p><p>古人通过长期观测、记录和推算，逐步完善历法与授时体系。二十四节气经历了长期发展，这里的圆环是现代定义的简化示意。</p><h3>节气看太阳，农事看地方</h3><p>节气给一年标出共同的时间节点，具体播种和收获却要结合当地气候、作物品种与当年天气。画面中的稻田，是帮助理解这层联系的一个例子。</p><p class="dialog-note">节气日期显示的是常见公历交节范围，不是某一年的精确交节时刻。圆环只表达角度与周期，不表示太阳系真实轨道。</p>`,'ASTRONOMY & TIME · 观象授时');
    if (panel === 'sources') openDialog('内容依据与素材说明',`<h3>二十四节气与古代天文</h3><ul><li><a href="https://www.ihchina.cn/details/6967.html" target="_blank" rel="noopener">中国非物质文化遗产网：节气总说</a></li><li><a href="https://igsnrr.cas.cn/cbkx/kpyd/zybk/qhzy/202009/t20200910_5692918.html" target="_blank" rel="noopener">中国科学院地理资源所：什么是二十四节气？</a></li><li><a href="https://hsta.ustc.edu.cn/2016/0707/c2779a21167/page.htm" target="_blank" rel="noopener">冯时：中国古代的天文与人文</a>（内容研究线索）</li></ul><h3>农田示意与适用范围</h3><p>场景以江南单季稻作为灵感，概括备田、育秧、移栽、生长、抽穗、收获与冬闲阶段。节气与阶段的对应为演示编排，未经设定田块的农艺标定，不代表任何特定历史时期的实际生产安排。</p><h3>视觉与声音</h3><p>田园底景由 OpenAI 图像生成工具制作，稻株、稻穗、稻茬与水面通过 Canvas 实时绘制，随节气进度连续变化。语音由浏览器提供，音色与可用性因设备而异。</p><p class="dialog-note">当前原型不提供实时天气、作物预测或农业种植指导。古代天文学与节气体系的历史细节，将随后续资料整理继续补充。</p>`,'SOURCES & CREDITS · 资料来源');
  }
  $$('[data-open]').forEach(button => button.addEventListener('click',() => openPanel(button.dataset.open)));
  $$('[data-detail]').forEach(button => button.addEventListener('click',() => {
    const term = getTerm(index);
    if (button.dataset.detail === 'rice') openDialog(term.field,`<p>${term.detail}</p><p>此刻的节气是<strong>${term.name}</strong>，展示阶段为<strong>${term.label}</strong>。不妨把观察记下来，再去比较另一个季节。</p><p class="dialog-note">作物形态在 24 组艺术关键状态之间过渡，用于理解生长过程，并非农艺预测。具体农时因地区与品种而异。</p>`);
    if (button.dataset.detail === 'water') openDialog('一渠活水，润一方田',`<p>田埂把水留在田里，沟渠让水在田间流动。稻作离不开对水土的观察和管理。</p><p>不同生育阶段对水分的需求不同。这里可以通过「疏通水渠」等交互理解照料作物的过程，画面中的水层不代表实际管理标准。</p>`);
    if (button.dataset.detail === 'house') openDialog('田边农舍，四时人家',`<p>沿着田埂走到农舍，从备种到收获，从晴日到雨天，农事与人的日常相伴。</p><p>农舍和远山构成一处想象中的江南田园。它用来承载四时生活的叙事，不是对某一朝代、遗址或建筑的考古复原。</p>`);
  }));
  $('#narration').addEventListener('click',() => {
    if (!('speechSynthesis' in window)) {toast('当前浏览器不支持语音，节气讲解可在左侧阅读。');return;}
    if ($('#narration').getAttribute('aria-pressed') === 'true') {stopSpeech();return;}
    const term = getTerm(index);
    const utterance = new SpeechSynthesisUtterance(`${term.name}。${term.description}。当前农事阶段：${term.label}。${term.detail}`);
    utterance.lang='zh-CN';utterance.rate=.88;
    const voice = speechSynthesis.getVoices().find(v => /zh-CN|zh_CN/.test(v.lang));if(voice) utterance.voice=voice;
    utterance.onend=stopSpeech;
    utterance.onerror=()=>{stopSpeech();toast('语音暂不可用，请阅读页面中的节气讲解。');};
    $('#narration').setAttribute('aria-pressed','true');
    speechSynthesis.speak(utterance);
  });
  document.addEventListener('visibilitychange',() => {if(document.hidden){stopPlayback();stopSpeech();}});
  render(false);
})();
