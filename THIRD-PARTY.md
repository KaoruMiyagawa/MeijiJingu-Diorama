# 第三方依赖与参考来源

## 代码依赖

| 项目 | 已安装版本 | 许可证 | 用途 |
| --- | --- | --- | --- |
| [Three.js](https://github.com/mrdoob/three.js) | 0.187.0 | MIT | 唯一运行时依赖；渲染、OrbitControls、几何合并、倒角盒体 |
| [Vite](https://github.com/vitejs/vite) | 8.3.5 | MIT | 项目开发服务器与静态构建 |
| [Playwright Test](https://github.com/microsoft/playwright) | 1.64.1（由 lockfile 安装） | Apache-2.0 | 驱动本机 Chrome 进行验收，不进入浏览器运行包 |

依赖完整版本和传递依赖在 `package-lock.json`；各安装包内保留各自的 LICENSE。Three.js 完整许可另保存在 `public/licenses/three-LICENSE.txt`，随构建复制进 `dist/licenses/`。再分发包含 Three.js 的构建时，须保留其版权与许可文本。

## 官方建筑与园区参考

访问日期：2026-11-03。

- [明治神宫官方网站](https://www.meijijingu.or.jp/en/)
- [官方园区地图与建筑说明](https://www.meijijingu.or.jp/en/map/)
- [Sanctuary 建筑照片](https://www.meijijingu.or.jp/en/whattosee/sanctuary/)
- [Forest 神宫森林介绍](https://www.meijijingu.or.jp/en/whattosee/forest/)
- [Three.js InstancedMesh 文档](https://threejs.org/docs/pages/InstancedMesh.html)
- [Three.js OrbitControls 文档](https://threejs.org/docs/pages/OrbitControls.html)

官方图片版权归明治神宫或其权利人，未发现可自由再分发的授权。本机 `references/` 中的 `sanctuary.jpg`、`torii.jpg`、`map.jpg` 仅用于本次研究核对，没有用于场景贴图、背景、模型或 UI，也没有放入 `public/`、`dist/` 或交付压缩包。

对应研究图片原始地址：

- <https://www.meijijingu.or.jp/en/whattosee/sanctuary/images/sanctuary_img01.jpg>
- <https://www.meijijingu.or.jp/en/whattosee/sanctuary/images/sanctuary_img05.jpg>
- <https://www.meijijingu.or.jp/en/map/images/guidemap.jpg>

## 本项目原创资源

2026-11-05 全园视觉版追加参考：[官方御苑照片](https://www.meijijingu.or.jp/en/whattosee/garden/) 与 [官方博物馆、宝物殿照片](https://www.meijijingu.or.jp/en/whattosee/museum/)。本地研究文件 `references/kakuuntei-20261105.jpg`、`museum-20261105.jpg`、`treasure-20261105.jpg` 同样仅用于研究，不进入运行资源或交付构建。

对应图片地址：

- <https://www.meijijingu.or.jp/en/whattosee/garden/images/garden_img05.jpg>
- <https://www.meijijingu.or.jp/en/whattosee/museum/images/museum_img01.jpg>
- <https://www.meijijingu.or.jp/en/whattosee/museum/images/museum_img06.jpg>

建筑、植被、道路、石块、道具几何、木纹、铜面、砂砾及酒樽图案均由本项目代码生成，没有下载第三方模型，没有使用 AI 生成图像替代三维场景。酒樽汉字为原创示意排版，未复制真实酒商标签。文字由本机系统字体光栅化，不随项目打包字体文件。
