import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const result=JSON.parse(await readFile('captures/round2/verification.json','utf8'));
const views=[['panorama','核心区全景'],['sanctuary','主神社近景'],['torii','鸟居与参道'],['low-angle','低角度晴日']];
const gray=[['01-whole-park','全园斜俯视'],['02-top-plan','全园正上方'],['03-south-entrance','原宿口 · 南入口'],['04-north-entrance','代代木口 · 北入口'],['05-northwest-entrance','参宫桥口 · 西北入口'],['06-sanctuary','保留建筑近景']];
const rows=Object.entries(result.measurements).map(([mode,m])=>`<tr><td>${{baseline:'第一版基线',precinct:'全园灰盒',core:'晴日核心区'}[mode]}</td><td>${m.stats.drawCalls}</td><td>${m.stats.triangles.toLocaleString('en-US')}</td><td>${m.navigationToFirstFrameMs} ms</td><td>${m.timing.medianMs.toFixed(1)} / ${m.timing.p95Ms.toFixed(1)} ms</td></tr>`).join('');
const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>明治神宫 · 第二轮第一批视觉评审</title><style>
*{box-sizing:border-box}body{margin:0;background:#edf3f3;color:#213d39;font:16px/1.65 'Microsoft YaHei',sans-serif}main{max-width:1640px;margin:auto;padding:28px}h1{font-size:28px;margin:0 0 8px}h2{font-size:21px}p{max-width:1100px}a{color:#176f75}section{margin:24px 0 40px}figure{margin:0;background:#fff}figcaption{padding:10px 16px}.pair,.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.comparison{padding:20px;background:#f7faf9;border:1px solid #d3dfdb}.comparison h2{margin:0 0 6px}.comparison p{margin:0 0 14px;font-size:13px}.pair img,.grid img{display:block;width:100%;height:auto}.tag{padding:9px 14px;background:#264a43;color:white;font-size:14px}table{border-collapse:collapse;width:100%;background:#fff}td,th{padding:10px;border-bottom:1px solid #d3dfdb;text-align:left}.note{background:#fff;padding:16px;border-left:4px solid #8a744c}@media(max-width:700px){main{padding:12px}.pair,.grid{grid-template-columns:1fr}}
</style><main><h1>明治神宫 · 第二轮第一批</h1><p>全园灰盒 + 晴日核心区样片。全部图片来自本机 Chrome 实际 WebGL 运行截图，无 AI 生成图。地标关系参考官方导览图；坐标、边界、岸线和高程为艺术近似。</p><p><a href="/?scene=precinct">打开全园灰盒（需本地服务）</a> · <a href="/?scene=core">打开晴日核心区</a> · <a href="verification.json">测试原始数据</a> · <a href="layout.json">带来源的布局数据</a></p>
<h2>全园布局</h2><section class="grid">${gray.map(([id,name])=>`<figure><a href="graybox/${id}.png"><img src="graybox/${id}.png" alt="${name}"></a><figcaption>${name}</figcaption></figure>`).join('')}</section>
<h2>同镜头对照</h2><p>1600 × 1100，DPR 1，动画时间 0。四组相机位置和目标点最大偏差均为 0，缩放、物体数量与曝光一致。点击图片可检查原始分辨率。</p>
${views.map(([id,name])=>`<section class="comparison" id="comparison-${id}"><h2>${name} · 同镜头前后对照</h2><p>Chrome WebGL 实际截图 · 1600 × 1100 · 固定动画 t=0 · 相机与目标点偏差 0</p><div class="pair"><figure><div class="tag">第一版 · 可恢复基线</div><a href="before/${id}.png"><img src="before/${id}.png" alt="第一版${name}"></a></figure><figure><div class="tag">第二轮 · 晴日样片</div><a href="after/${id}.png"><img src="after/${id}.png" alt="晴日${name}"></a></figure></div></section>`).join('')}
<h2>性能记录</h2><p>Chrome ${result.browser} / RTX 5060 Laptop / 1920 × 1080 / DPR 1。预热 1.2 秒后取 240 个 RAF 帧间隔；含显示调度，不代表独立 GPU 执行时间。每场景新浏览器上下文，系统和 GPU 缓存未清空；首帧耗时含自动化轮询。</p><table><thead><tr><th>场景</th><th>Draw Calls</th><th>三角形提交（含阴影）</th><th>导航至首帧</th><th>帧间隔 中位 / P95</th></tr></thead><tbody>${rows}</tbody></table>
<h2>评审关注</h2><div class="note">西侧参道止于现有围廊外，西门开口尚未实施；园区形状及微地形尚无测绘数据；森林只显示分区占位体。晴日样片保留深檐阴影，接触暗部使用实时阴影和现有材质，未加入 SSAO 或 GI。全园远景阴影精度及材质暗部层次仍需视觉评审。本批停止于灰盒和样片。</div></main></html>`;
await writeFile('captures/round2/index.html',html);
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
  const page=await browser.newPage({viewport:{width:1640,height:1100},deviceScaleFactor:1});
  await page.goto(pathToFileURL(path.resolve('captures/round2/index.html')).href);
  await page.evaluate(()=>Promise.all([...document.images].map(img=>img.decode())));
  for(const [id] of views)await page.locator(`#comparison-${id}`).screenshot({path:`captures/round2/comparison-${id}.png`});
  console.log('Review gallery and four side-by-side Chrome screenshots saved.');
} finally {await browser.close();}
