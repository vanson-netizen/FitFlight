# 运行图片复核（2026-09-05）

所有数字均为十进制字节；单图严格小于200,000，主包目标小于1,500,000。

本轮重新递归扫描PNG/JPG/JPEG/WebP，排除云函数及非运行附件；全部34张位图均在assets下，没有JPEG扩展名或WebP文件，没有达到200,000字节的图片。历史CURRENT_PACKAGE_AUDIT.md也记录为无超限图片。

本轮压缩0张、删除0张，总减少0字节；保留原尺寸、编码、透明度和裁剪焦点。以下前后列相同，表示本轮未做重复有损压缩。图片总计1,069,163字节（不含4张SVG占位图）。最大图片samoyed.png为84,165字节。

## 实际编译与扫描

开发者工具CLI preview本轮编译成功，主包1,379,233字节，无分包，低于1,500,000字节120,767字节。原始输出见current-image-package.json。由于本轮未改运行资源，处理前后均为该值。

16:20在微信开发者工具Stable 2.02.2608060中实际点击“重新扫描”：主包大小、图片和音频资源大小两项仍显示未通过。此GUI结果与单图检查及preview大小存在差异，尚未定位扫描统计范围/口径，不声称扫描已通过；不能据此认定存在单张超过200KB图片。需要进一步核对扫描使用的编译产物和统计方式。

## 完整清单

完整绝对路径、SHA-256、像素格式及逐项引用保存在current-image-rescan.json。以下所有资源均属于主包。

|路径|格式|原尺寸→新尺寸|原字节|新字节|减少|引用页面|
|---|---|---|---:|---:|---:|---|
|assets/fifi/samoyed.png|.png|500×545 → 500×545|84165|84165|0%|pages/fifi/fifi|
|assets/fifi/fifi-background.jpg|.jpg|750×1250 → 750×1250|83202|83202|0%|pages/fifi/fifi|
|assets/community/community-home-forum.jpg|.jpg|768×432 → 768×432|63543|63543|0%|pages/community/community|
|assets/community/community-home-dining.jpg|.jpg|768×432 → 768×432|57981|57981|0%|pages/community/community|
|assets/community/food-xueyuan-option-bf22a4c884.jpg|.jpg|640×360 → 640×360|51008|51008|0%|pages/community-food/community-food|
|assets/community/venue-xueyuan-ball-sports-f36627c68a.jpg|.jpg|640×360 → 640×360|47381|47381|0%|pages/community-sport/community-sport|
|assets/community/dining-xueyuan-hall-d519415fe8.jpg|.jpg|640×360 → 640×360|46337|46337|0%|pages/community-food/community-food|
|assets/community/dining-xueyuan-hall-b3ae834b90.jpg|.jpg|640×360 → 640×360|41999|41999|0%|pages/community-food/community-food|
|assets/community/food-xueyuan-option-af35c57c1a.jpg|.jpg|640×360 → 640×360|41695|41695|0%|pages/community-food/community-food|
|assets/community/venue-xueyuan-swimming-019329917c.jpg|.jpg|640×360 → 640×360|40810|40810|0%|pages/community-sport/community-sport|
|assets/community/venue-xueyuan-gym-d8d6990026.jpg|.jpg|640×360 → 640×360|40426|40426|0%|pages/community-sport/community-sport|
|assets/community/dining-xueyuan-hall-b96eba561e.jpg|.jpg|640×360 → 640×360|39430|39430|0%|pages/community-food/community-food|
|assets/community/food-xueyuan-option-bd51c94c2f.jpg|.jpg|640×360 → 640×360|39014|39014|0%|pages/community-food/community-food|
|assets/community/venue-xueyuan-gym-34926a4072.jpg|.jpg|640×360 → 640×360|37066|37066|0%|pages/community-sport/community-sport|
|assets/community/venue-xueyuan-gym-179643f6a0.jpg|.jpg|640×360 → 640×360|36415|36415|0%|pages/community-sport/community-sport|
|assets/community/venue-xueyuan-ball-sports-b69bcc106d.jpg|.jpg|640×360 → 640×360|36390|36390|0%|pages/community-sport/community-sport|
|assets/community/dining-xueyuan-hall-1f269a4cb6.jpg|.jpg|640×360 → 640×360|34297|34297|0%|pages/community-food/community-food|
|assets/community/community-home-sports.jpg|.jpg|768×432 → 768×432|34009|34009|0%|pages/community/community|
|assets/community/dining-xueyuan-hall-e9ba17ae34.jpg|.jpg|640×360 → 640×360|33453|33453|0%|pages/community-food/community-food|
|assets/community/venue-xueyuan-gym-7212bc20d5.jpg|.jpg|640×360 → 640×360|32639|32639|0%|pages/community-sport/community-sport|
|assets/community/dining-xueyuan-hall-4f5c07a4f2.jpg|.jpg|640×360 → 640×360|31836|31836|0%|pages/community-food/community-food|
|assets/community/merchant-xueyuan-road-manwei-light-meal.jpg|.jpg|640×360 → 640×360|31314|31314|0%|pages/community-food/community-food|
|assets/community/venue-xueyuan-ball-sports-284873dc9d.jpg|.jpg|640×360 → 640×360|22956|22956|0%|pages/community-sport/community-sport|
|assets/icons/plan.png|.png|96×96 → 96×96|10020|10020|0%|pages/index/index.wxml|
|assets/icons/settings-privacy.png|.png|96×96 → 96×96|9521|9521|0%|pages/index/index.wxml|
|assets/icons/profile.png|.png|96×96 → 96×96|8439|8439|0%|pages/index/index.wxml|
|assets/icons/tab-fifi-inactive.png|.png|81×81 → 81×81|5587|5587|0%|pages/community/community.wxml<br>pages/cultivation/cultivation.wxml<br>pages/index/index.wxml|
|assets/icons/tab-fifi-active.png|.png|81×81 → 81×81|5334|5334|0%|pages/fifi/fifi.wxml|
|assets/icons/tab-community-inactive.png|.png|81×81 → 81×81|4324|4324|0%|pages/cultivation/cultivation.wxml<br>pages/fifi/fifi.wxml<br>pages/index/index.wxml|
|assets/icons/tab-cultivation-inactive.png|.png|81×81 → 81×81|4082|4082|0%|pages/community/community.wxml<br>pages/fifi/fifi.wxml<br>pages/index/index.wxml|
|assets/icons/tab-cultivation-active.png|.png|81×81 → 81×81|3977|3977|0%|pages/cultivation/cultivation.wxml|
|assets/icons/tab-community-active.png|.png|81×81 → 81×81|3950|3950|0%|pages/community/community.wxml|
|assets/icons/tab-mine-inactive.png|.png|81×81 → 81×81|3371|3371|0%|pages/community/community.wxml<br>pages/cultivation/cultivation.wxml<br>pages/fifi/fifi.wxml|
|assets/icons/tab-mine-active.png|.png|81×81 → 81×81|3192|3192|0%|pages/index/index.wxml|

## 原图与透明度

FIFI背景、萨摩耶、预览图三张原图SHA-256与fifi-image-audit.json一致，均未改动。预览图没有进入运行目录。萨摩耶运行副本为32位RGBA，85,704个全透明像素，无背景色转换。社区、图标及成就原图均未写入或删除。

## 验证

图片预算、资源路径、社区图片映射及原图哈希、FIFI布局与展示测试通过。所有位图可正常解码。本轮没有修改WXML/WXSS/JS/app.json、数据库或云函数，没有Git网络或提交操作。

真机仍需检查社区三张入口、资源照片、FIFI背景与宠物、底栏和我的入口图标的清晰度及透明边缘。本轮未做真机验收。