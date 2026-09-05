# 图片与包体优化清单

当前无分包，表内资源属于主包。完整扫描包含隐藏目录及 PNG/JPG/JPEG/WebP/GIF/SVG 和音频；未发现本地音频、WebP、JPEG 扩展名图片或 GIF。

## 分类汇总

|分类|优化前字节|优化后字节|
|---|---:|---:|
|成就图标（含回退 SVG）|99803|99803|
|底部导航及我的入口图标|61797|61797|
|社区首页三图|187432|187432|
|运动资源照片|468933|354708|
|饮食资源照片|630291|475512|
|全部本地图片（含 SVG 及旧二维码）|1496838|1181655|
|编译主包实测|1802949|1487766|

主包减少 315,183 字节，恰好等于社区照片缩减 269,004 字节加删除旧二维码 46,179 字节。未调整 app.json、分包、路由和业务代码。

图片最大从 81,959 降到 72,628 字节，无接近 200KB 的文件。成就图标保持 144×144 RGBA，5 张 PNG 合计 99,537 字节；导航图标为 81×81，我的入口图标为 96×96，均无需再次降质。

## 优化前完整清单（降序，前 30 行为占用前 30 项）

|路径|像素|字节|引用页面／模型|包|
|---|---|---:|---|---|
|assets/community/food-xueyuan-option-bf22a4c884.jpg|768×432|81959|pages/community-food/community-food|主包|
|assets/community/dining-xueyuan-hall-d519415fe8.jpg|768×432|74176|pages/community-food/community-food|主包|
|assets/community/venue-xueyuan-ball-sports-f36627c68a.jpg|768×432|73904|pages/community-sport/community-sport|主包|
|assets/community/community-home-forum.jpg|768×432|72628|pages/community/community|主包|
|assets/community/community-home-dining.jpg|768×432|71002|pages/community/community|主包|
|assets/community/dining-xueyuan-hall-b3ae834b90.jpg|768×432|70726|pages/community-food/community-food|主包|
|assets/community/venue-xueyuan-swimming-019329917c.jpg|768×432|69726|pages/community-sport/community-sport|主包|
|assets/community/food-xueyuan-option-af35c57c1a.jpg|768×432|68504|pages/community-food/community-food|主包|
|assets/community/venue-xueyuan-gym-d8d6990026.jpg|768×432|64939|pages/community-sport/community-sport|主包|
|assets/community/dining-xueyuan-hall-b96eba561e.jpg|768×432|64348|pages/community-food/community-food|主包|
|assets/community/food-xueyuan-option-bd51c94c2f.jpg|768×432|62966|pages/community-food/community-food|主包|
|assets/community/venue-xueyuan-gym-179643f6a0.jpg|768×432|60409|pages/community-sport/community-sport|主包|
|assets/community/venue-xueyuan-ball-sports-b69bcc106d.jpg|768×432|59062|pages/community-sport/community-sport|主包|
|assets/community/venue-xueyuan-gym-34926a4072.jpg|768×432|58837|pages/community-sport/community-sport|主包|
|assets/community/dining-xueyuan-hall-1f269a4cb6.jpg|768×432|57979|pages/community-food/community-food|主包|
|assets/community/dining-xueyuan-hall-e9ba17ae34.jpg|768×432|57441|pages/community-food/community-food|主包|
|assets/community/dining-xueyuan-hall-4f5c07a4f2.jpg|768×432|52451|pages/community-food/community-food|主包|
|assets/community/venue-xueyuan-gym-7212bc20d5.jpg|768×432|51842|pages/community-sport/community-sport|主包|
|preview/community-resource-fix-20260905.png|470×470|46179|无页面引用|主包|
|assets/community/community-home-sports.jpg|768×432|43802|pages/community/community|主包|
|assets/community/merchant-xueyuan-road-manwei-light-meal.jpg|768×432|39741|pages/community-food/community-food|主包|
|assets/community/venue-xueyuan-ball-sports-284873dc9d.jpg|768×432|30214|pages/community-sport/community-sport|主包|
|assets/achievements/active-partner.png|144×144|28339|pages/index/index<br>pages/achievements/achievements|主包|
|assets/achievements/streak-3-days.png|144×144|25258|pages/index/index<br>pages/achievements/achievements|主包|
|assets/achievements/perfect-day.png|144×144|17746|pages/index/index<br>pages/achievements/achievements|主包|
|assets/achievements/first-meeting.png|144×144|14599|pages/index/index<br>pages/achievements/achievements|主包|
|assets/achievements/streak-7-days.png|144×144|13595|pages/index/index<br>pages/achievements/achievements|主包|
|assets/icons/plan.png|96×96|10020|pages/index/index.wxml|主包|
|assets/icons/settings-privacy.png|96×96|9521|pages/index/index.wxml|主包|
|assets/icons/profile.png|96×96|8439|pages/index/index.wxml|主包|
|assets/icons/tab-fifi-inactive.png|81×81|5587|pages/community/community.wxml<br>pages/cultivation/cultivation.wxml<br>pages/index/index.wxml|主包|
|assets/icons/tab-fifi-active.png|81×81|5334|pages/fifi/fifi.wxml|主包|
|assets/icons/tab-community-inactive.png|81×81|4324|pages/cultivation/cultivation.wxml<br>pages/fifi/fifi.wxml<br>pages/index/index.wxml|主包|
|assets/icons/tab-cultivation-inactive.png|81×81|4082|pages/community/community.wxml<br>pages/fifi/fifi.wxml<br>pages/index/index.wxml|主包|
|assets/icons/tab-cultivation-active.png|81×81|3977|pages/cultivation/cultivation.wxml|主包|
|assets/icons/tab-community-active.png|81×81|3950|pages/community/community.wxml|主包|
|assets/icons/tab-mine-inactive.png|81×81|3371|pages/community/community.wxml<br>pages/cultivation/cultivation.wxml<br>pages/fifi/fifi.wxml|主包|
|assets/icons/tab-mine-active.png|81×81|3192|pages/index/index.wxml|主包|
|assets/fifi/fifi-celebrate.svg|SVG 矢量|800|pages/fifi/fifi<br>pages/index/index|主包|
|assets/fifi/fifi-normal.svg|SVG 矢量|676|pages/fifi/fifi<br>pages/index/index|主包|
|assets/fifi/fifi-happy.svg|SVG 矢量|669|pages/fifi/fifi<br>pages/index/index|主包|
|assets/achievements/achievement-placeholder.svg|SVG 矢量|266|pages/index/index<br>pages/achievements/achievements|主包|
|assets/community/placeholder.svg|SVG 矢量|258|pages/community/community<br>pages/community-sport/community-sport<br>pages/community-food/community-food|主包|

## 优化后完整清单（降序）

|路径|像素|字节|引用页面／模型|包|
|---|---|---:|---|---|
|assets/community/community-home-forum.jpg|768×432|72628|pages/community/community|主包|
|assets/community/community-home-dining.jpg|768×432|71002|pages/community/community|主包|
|assets/community/food-xueyuan-option-bf22a4c884.jpg|640×360|63863|pages/community-food/community-food|主包|
|assets/community/venue-xueyuan-ball-sports-f36627c68a.jpg|640×360|57915|pages/community-sport/community-sport|主包|
|assets/community/dining-xueyuan-hall-d519415fe8.jpg|640×360|56723|pages/community-food/community-food|主包|
|assets/community/dining-xueyuan-hall-b3ae834b90.jpg|640×360|51905|pages/community-food/community-food|主包|
|assets/community/food-xueyuan-option-af35c57c1a.jpg|640×360|51536|pages/community-food/community-food|主包|
|assets/community/venue-xueyuan-swimming-019329917c.jpg|640×360|50871|pages/community-sport/community-sport|主包|
|assets/community/venue-xueyuan-gym-d8d6990026.jpg|640×360|48976|pages/community-sport/community-sport|主包|
|assets/community/dining-xueyuan-hall-b96eba561e.jpg|640×360|48746|pages/community-food/community-food|主包|
|assets/community/food-xueyuan-option-bd51c94c2f.jpg|640×360|47994|pages/community-food/community-food|主包|
|assets/community/venue-xueyuan-gym-179643f6a0.jpg|640×360|44948|pages/community-sport/community-sport|主包|
|assets/community/venue-xueyuan-gym-34926a4072.jpg|640×360|44713|pages/community-sport/community-sport|主包|
|assets/community/venue-xueyuan-ball-sports-b69bcc106d.jpg|640×360|44545|pages/community-sport/community-sport|主包|
|assets/community/community-home-sports.jpg|768×432|43802|pages/community/community|主包|
|assets/community/dining-xueyuan-hall-1f269a4cb6.jpg|640×360|42547|pages/community-food/community-food|主包|
|assets/community/dining-xueyuan-hall-e9ba17ae34.jpg|640×360|42025|pages/community-food/community-food|主包|
|assets/community/venue-xueyuan-gym-7212bc20d5.jpg|640×360|39784|pages/community-sport/community-sport|主包|
|assets/community/dining-xueyuan-hall-4f5c07a4f2.jpg|640×360|38859|pages/community-food/community-food|主包|
|assets/community/merchant-xueyuan-road-manwei-light-meal.jpg|640×360|31314|pages/community-food/community-food|主包|
|assets/achievements/active-partner.png|144×144|28339|pages/index/index<br>pages/achievements/achievements|主包|
|assets/achievements/streak-3-days.png|144×144|25258|pages/index/index<br>pages/achievements/achievements|主包|
|assets/community/venue-xueyuan-ball-sports-284873dc9d.jpg|640×360|22956|pages/community-sport/community-sport|主包|
|assets/achievements/perfect-day.png|144×144|17746|pages/index/index<br>pages/achievements/achievements|主包|
|assets/achievements/first-meeting.png|144×144|14599|pages/index/index<br>pages/achievements/achievements|主包|
|assets/achievements/streak-7-days.png|144×144|13595|pages/index/index<br>pages/achievements/achievements|主包|
|assets/icons/plan.png|96×96|10020|pages/index/index.wxml|主包|
|assets/icons/settings-privacy.png|96×96|9521|pages/index/index.wxml|主包|
|assets/icons/profile.png|96×96|8439|pages/index/index.wxml|主包|
|assets/icons/tab-fifi-inactive.png|81×81|5587|pages/community/community.wxml<br>pages/cultivation/cultivation.wxml<br>pages/index/index.wxml|主包|
|assets/icons/tab-fifi-active.png|81×81|5334|pages/fifi/fifi.wxml|主包|
|assets/icons/tab-community-inactive.png|81×81|4324|pages/cultivation/cultivation.wxml<br>pages/fifi/fifi.wxml<br>pages/index/index.wxml|主包|
|assets/icons/tab-cultivation-inactive.png|81×81|4082|pages/community/community.wxml<br>pages/fifi/fifi.wxml<br>pages/index/index.wxml|主包|
|assets/icons/tab-cultivation-active.png|81×81|3977|pages/cultivation/cultivation.wxml|主包|
|assets/icons/tab-community-active.png|81×81|3950|pages/community/community.wxml|主包|
|assets/icons/tab-mine-inactive.png|81×81|3371|pages/community/community.wxml<br>pages/cultivation/cultivation.wxml<br>pages/fifi/fifi.wxml|主包|
|assets/icons/tab-mine-active.png|81×81|3192|pages/index/index.wxml|主包|
|assets/fifi/fifi-celebrate.svg|SVG 矢量|800|pages/fifi/fifi<br>pages/index/index|主包|
|assets/fifi/fifi-normal.svg|SVG 矢量|676|pages/fifi/fifi<br>pages/index/index|主包|
|assets/fifi/fifi-happy.svg|SVG 矢量|669|pages/fifi/fifi<br>pages/index/index|主包|
|assets/achievements/achievement-placeholder.svg|SVG 矢量|266|pages/index/index<br>pages/achievements/achievements|主包|
|assets/community/placeholder.svg|SVG 矢量|258|pages/community/community<br>pages/community-sport/community-sport<br>pages/community-food/community-food|主包|

## 清理与图片保护

- 删除 preview/community-resource-fix-20260905.png：旧预览二维码，运行 JS/WXML/WXSS/JSON 无引用。preview 中被业务使用的 JS 保留。
- 所有运行占位 SVG 均有引用，继续作为异常回退保留；未发现重复压缩副本。
- C:/FitFlight/generated-achievements、generated-icons、社区图片原图未修改，也未复制进入包。照片从原图重新生成，原始 SHA-256 和裁剪框保存在 community-image-audit.json。
- 18 张资源照片改为 640×360，首页三张保持 768×432；沿用原裁剪和焦点，JPEG 质量 72—76。逐张查看最终 21 张照片，未发现损坏、方向改变、颜色异常或新增割头。

## 修改范围

- assets/community/ 下 18 张资源 JPEG（首页三图重建结果相同）。
- scripts/build-community-images.ps1：按入口／资源层级输出尺寸。
- scripts/test-community-images.js：资源照片允许 640px，首页仍要求至少 750px。
- scripts/test-image-budget.js、scripts/report-package-images.js 及本报告、前后清单、包体记录。
- docs/community-image-audit.json 更新压缩参数和文件大小。
