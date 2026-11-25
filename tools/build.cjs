const fs = require('node:fs');
const path = require('node:path');
const pptxgen = require('pptxgenjs');

const id = process.argv[2] || 'municipal';
if (!/^[a-z][a-z0-9-]*$/.test(id)) throw new Error('資料IDが不正です');
const root = path.resolve(__dirname, '../decks', id);
const output = path.join(root, 'output');
const deck = require(path.join(root, 'deck.cjs'));
const colors = {
  ivory:'F7F4EE', cream:'EFE9DD', sand:'E2D7C2',
  ink:'1F1A14', moss:'5B6E4F', deepmoss:'3F4F36', gold:'B8954B',
};
const fonts = {
  title: 'Noto Serif CJK JP', body: 'Noto Sans CJK JP',
  accent: 'Noto Sans CJK JP', latin: 'Noto Serif CJK JP',
};
const ink = {title:'ink', body:'ink', accent:'deepmoss', latin:'deepmoss'};
const inch = value => value / 72;
const escape = value => String(value).replace(/[&<>"']/g, ch => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;',
}[ch]));
const number = value => String(value).padStart(2,'0');
const width = 960;
const height = 540;

function slideElements(slide, index) {
  return [
    ...slide.elements,
    {type:'text', x:54, y:29, w:350, size:14, text:slide.section, role:'accent'},
    {type:'rect', x:54, y:507, w:852, h:0.6, color:'sand'},
    {type:'text', x:54, y:516, w:250, size:12, text:'株式会社QRing', role:'body'},
    {type:'text', x:849, y:516, w:57, size:12, text:`${number(index + 1)} / ${number(deck.slides.length)}`, role:'latin', align:'right'},
  ];
}

function bounds(element) {
  const {x,y,w} = element;
  const h = element.type === 'text' ? element.size * 1.4 : element.h;
  if (![x,y,w,h].every(Number.isFinite) || x < 0 || y < 0 || w <= 0 || h <= 0 ||
      x + w > width || y + h > height) throw new Error(`要素が紙面外です: ${JSON.stringify(element)}`);
  return {x,y,w,h};
}

function htmlElement(element) {
  const {x,y,w,h} = bounds(element);
  const position = `left:${x}px;top:${y}px;width:${w}px;height:${h}px`;
  if (element.type === 'text') {
    const role = element.role;
    const tag = role === 'title' ? 'h2' : 'p';
    return `<${tag} class="element ${role}" style="${position};font-size:${element.size}px;color:#${colors[ink[role]]};text-align:${element.align || 'left'}">${escape(element.text)}</${tag}>`;
  }
  if (element.type === 'photo') {
    return `<img class="element" src="../assets/${escape(element.file)}" alt="${escape(element.alt)}" style="${position}">`;
  }
  return `<div class="element" aria-hidden="true" style="${position};background:#${colors[element.color]}"></div>`;
}

function pptElement(pptx, slide, element) {
  const {x,y,w,h} = bounds(element);
  const box = {x:inch(x), y:inch(y), w:inch(w), h:inch(h)};
  if (element.type === 'text') {
    slide.addText(element.text, {
      ...box, margin:0, fontFace:fonts[element.role], fontSize:element.size,
      color:colors[ink[element.role]], valign:'mid', align:element.align || 'left',
      lang:'ja-JP', wrap:false,
    });
  } else if (element.type === 'photo') {
    slide.addImage({...box, path:path.join(root,'assets',element.file), altText:element.alt});
  } else {
    slide.addShape(pptx.ShapeType.rect, {
      ...box, line:{transparency:100}, fill:{color:colors[element.color]},
    });
  }
}

function html(slides) {
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(deck.title)}</title>
<style>
*, *::before, *::after { box-sizing: border-box }
body { margin: 0; background: #efe9dd; color: #1f1a14; font-family: "Noto Sans CJK JP", "Noto Sans JP", sans-serif }
main { padding: 20px 0 0 }
.sheet { width: ${width}px; height: ${height}px; position: relative; margin: 0 auto 18px; overflow: hidden }
.element { position: absolute; margin: 0; font-weight: 400 }
p.element, h2.element { line-height: 1.4; white-space: nowrap }
.title { font-family: "Noto Serif CJK JP", "Noto Serif JP", "Yu Mincho", serif }
.latin { font-family: "Noto Serif CJK JP", Georgia, serif }
img.element { object-fit: cover }
nav { display: none; justify-content: center; align-items: center; flex-wrap: wrap; gap: 16px; padding: 12px 16px; font-size: 14px }
.js nav { display: flex }
nav button, nav a { padding: 8px 11px; color: #3f4f36; font: inherit }
nav button { border: 1px solid #b7af9d; background: #f7f4ee; cursor: pointer }
nav button:disabled { opacity: .5; cursor: default }
@media screen { .js .sheet { zoom: var(--scale, 1); margin-bottom: 0 } }
@page { size: ${width}px ${height}px; margin: 0 }
@media print {
  html, body, main { margin: 0; padding: 0; background: white }
  nav, .js nav { display: none }
  .sheet, .sheet[hidden] { display: block; margin: 0; break-inside: avoid; break-after: page; print-color-adjust: exact }
  .sheet:last-child { break-after: auto }
}
</style>
</head>
<body>
<main aria-label="${escape(deck.title)}">
${slides.map(({slide, elements},i)=>`<section class="sheet" id="slide-${i+1}" aria-label="${i+1}枚目 ${escape(slide.section)}" style="background:#${colors[slide.bg || 'ivory']}">
${elements.map(htmlElement).join('\n')}
</section>`).join('\n')}
</main>
<nav aria-label="スライドの操作">
<button type="button" id="prev">← 前へ</button><span id="position" aria-live="polite"></span><button type="button" id="next">次へ →</button>
<a href="./deck.pptx">PowerPoint</a><a href="./deck.pdf">PDF</a>
</nav>
<script>
  const slides = [...document.querySelectorAll('.sheet')];
  const prev = document.querySelector('#prev');
  const next = document.querySelector('#next');
  let current = 0;
  function show(index) {
    current = Math.max(0, Math.min(index, slides.length - 1));
    slides.forEach((slide, i) => slide.hidden = i !== current);
    prev.disabled = current === 0;
    next.disabled = current === slides.length - 1;
    document.querySelector('#position').textContent = (current + 1) + ' / ' + slides.length;
  }
  function resize() {
    const space = innerHeight - document.querySelector('nav').offsetHeight - 32;
    document.documentElement.style.setProperty('--scale', Math.max(.15, Math.min((innerWidth - 24) / ${width}, space / ${height}, 1.55)));
  }
  document.documentElement.classList.add('js');
  show(0);
  resize();
  prev.onclick = () => show(current - 1);
  next.onclick = () => show(current + 1);
  addEventListener('resize', resize);
  addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') show(current - 1);
    if (event.key === 'ArrowRight') show(current + 1);
  });
</script>
</body>
</html>
`;
}

async function build() {
  if (!deck.title || !deck.slides.length) throw new Error('資料名とスライドが必要です');
  const slides = deck.slides.map((slide,i) => ({slide,elements:slideElements(slide,i)}));
  const pptx = new pptxgen();
  pptx.defineLayout({name:'QRING', width:inch(width), height:inch(height)});
  pptx.layout = 'QRING';
  pptx.title = deck.title;
  pptx.author = '株式会社QRing';
  pptx.lang = 'ja-JP';
  pptx.theme = {headFontFace:fonts.title, bodyFontFace:fonts.body, lang:'ja-JP'};
  for (const {slide, elements} of slides) {
    const page = pptx.addSlide();
    page.background = {color:colors[slide.bg || 'ivory']};
    elements.forEach(element => pptElement(pptx,page,element));
  }
  fs.mkdirSync(output,{recursive:true});
  fs.writeFileSync(path.join(output,'index.html'), html(slides));
  await pptx.writeFile({fileName:path.join(output,'deck.pptx'), compression:true});
}

build().catch(error => { console.error(error); process.exitCode = 1; });
