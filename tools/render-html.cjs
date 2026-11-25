const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');

const id = process.argv[2] || 'municipal';
if (!/^[a-z][a-z0-9-]*$/.test(id)) throw new Error('資料IDが不正です');
const root = path.resolve(__dirname,'../decks',id);
const output = path.join(root,'output');
const preview = path.join(output,'html-preview');

async function render() {
  const html = fs.readFileSync(path.join(output,'index.html'),'utf8');
  // Avoid relying on a local HTTP server or browser file URL permissions.
  const content = html.replace(/src="\.\.\/assets\/([a-z0-9.-]+)"/gi, (_,name) => {
    const mime = name.endsWith('.png') ? 'png' : 'jpeg';
    return `src="data:image/${mime};base64,${fs.readFileSync(path.join(root,'assets',name)).toString('base64')}"`;
  });
  const browser = await chromium.launch({
    executablePath:process.env.CHROMIUM || undefined,
    args:['--disable-crashpad-for-testing'],
  });
  try {
    const page = await browser.newPage({viewport:{width:1280,height:840},deviceScaleFactor:2});
    const errors = [];
    page.on('pageerror',error => errors.push(error.message));
    await page.setContent(content);
    const slides = page.locator('.sheet');
    const count = await slides.count();
    fs.mkdirSync(preview,{recursive:true});
    await page.emulateMedia({media:'print'});
    for (let i=0;i<count;i++) {
      const slide = slides.nth(i);
      const problems = await slide.evaluate(node => {
        const problems = [];
        const textBoxes = [];
        const context = document.createElement('canvas').getContext('2d');
        for (const item of node.querySelectorAll('p, h2')) {
          const range = document.createRange();
          range.selectNodeContents(item);
          const layout = range.getBoundingClientRect();
          if (layout.width > item.clientWidth + 1) problems.push(item.textContent);
          const style = getComputedStyle(item);
          context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
          const metrics = context.measureText(item.textContent);
          const marker = document.createElement('span');
          marker.style.display = 'inline-block';
          item.append(marker);
          const baseline = marker.getBoundingClientRect().bottom;
          marker.remove();
          const box = {
            left: layout.left - metrics.actualBoundingBoxLeft,
            right: layout.left + metrics.actualBoundingBoxRight,
            top: baseline - metrics.actualBoundingBoxAscent,
            bottom: baseline + metrics.actualBoundingBoxDescent,
          };
          for (const [previous, text] of textBoxes) {
            if (box.left < previous.right && box.right > previous.left &&
                box.top < previous.bottom && box.bottom > previous.top) {
              problems.push(item.textContent + ' と ' + text + ' の重なり');
            }
          }
          textBoxes.push([box, item.textContent]);
        }
        for (const image of node.querySelectorAll('img')) {
          if (!image.complete || !image.naturalWidth) problems.push(image.alt);
        }
        return problems;
      });
      if (problems.length) throw new Error(`${i+1}枚目の表示エラー: ${problems.join(' / ')}`);
      await slide.screenshot({path:path.join(preview,`slide-${String(i+1).padStart(2,'0')}.png`)});
    }
    await page.pdf({path:path.join(output,'html-reference.pdf'), preferCSSPageSize:true,printBackground:true});
    await page.emulateMedia({media:'screen'});
    for (const [width,height] of [[1280,840],[390,844],[844,390]]) {
      await page.setViewportSize({width,height});
      for (let i=0;i<count;i++) {
        const slide = slides.nth(i);
        if (!(await slide.isVisible()) || await page.locator('.sheet:visible').count() !== 1) {
          throw new Error('表示中のスライドが不正です');
        }
        const bounds = await slide.boundingBox();
        if (bounds.x < 0 || bounds.x+bounds.width > width ||
            bounds.y+bounds.height > height || Math.abs(bounds.width/bounds.height - 16/9) > .01) {
          throw new Error(`${width}×${height}で紙面が収まりません`);
        }
        if (i<count-1) await page.keyboard.press('ArrowRight');
      }
      for (let i=1;i<count;i++) await page.locator('#prev').click();
    }
    if (errors.length) throw new Error(errors.join('\n'));
    console.log(`Chromium: ${count}枚を撮影し、3画面サイズでナビゲーションと紙面を確認`);
  } finally {
    await browser.close();
  }
}

render().catch(error => { console.error(error); process.exitCode = 1; });
