# 社区 JPEG 二次压缩

主包实测：1,555,319 → 1,377,666 字节，减少177,653字节；低于1,400,000字节目标，距1,500,000字节代码质量阈值留122,334字节。统一十进制口径。

社区图片含258字节占位SVG：1,017,910 → 840,257字节。19张较大JPEG质量调为64；两个较小文件保持76。直接从只读原图按原尺寸和裁剪框重建，避免对已有JPEG反复有损编码。首页保持768×432，资源卡片保持640×360。

逐张并排查看19张前后副本，未发现明显色块、招牌文字退化或人物面部损坏，人物构图完全不变。原图哈希、裁剪框、focus与像素尺寸均已比对一致。FIFI背景和萨摩耶保持原文件不动。

## 完整清单（按优化前大小降序）

以下文件均位于 assets/community/。

|文件|优化前字节|优化后字节|减少字节|
|---|---:|---:|---:|
|community-home-forum.jpg|72628|63543|9085|
|community-home-dining.jpg|71002|57981|13021|
|food-xueyuan-option-bf22a4c884.jpg|63863|51008|12855|
|venue-xueyuan-ball-sports-f36627c68a.jpg|57915|47381|10534|
|dining-xueyuan-hall-d519415fe8.jpg|56723|46337|10386|
|dining-xueyuan-hall-b3ae834b90.jpg|51905|41999|9906|
|food-xueyuan-option-af35c57c1a.jpg|51536|41695|9841|
|venue-xueyuan-swimming-019329917c.jpg|50871|40810|10061|
|venue-xueyuan-gym-d8d6990026.jpg|48976|40426|8550|
|dining-xueyuan-hall-b96eba561e.jpg|48746|39430|9316|
|food-xueyuan-option-bd51c94c2f.jpg|47994|39014|8980|
|venue-xueyuan-gym-179643f6a0.jpg|44948|36415|8533|
|venue-xueyuan-gym-34926a4072.jpg|44713|37066|7647|
|venue-xueyuan-ball-sports-b69bcc106d.jpg|44545|36390|8155|
|community-home-sports.jpg|43802|34009|9793|
|dining-xueyuan-hall-1f269a4cb6.jpg|42547|34297|8250|
|dining-xueyuan-hall-e9ba17ae34.jpg|42025|33453|8572|
|venue-xueyuan-gym-7212bc20d5.jpg|39784|32639|7145|
|dining-xueyuan-hall-4f5c07a4f2.jpg|38859|31836|7023|
|merchant-xueyuan-road-manwei-light-meal.jpg|31314|31314|0|
|venue-xueyuan-ball-sports-284873dc9d.jpg|22956|22956|0|

详情图片目前仍在主包，但纯编码优化已满足目标，本轮无需分包。没有改布局、路由、业务、数据库、云函数或云存储，也没有执行Git提交及网络操作。

修改文件：19张JPEG、scripts/build-community-images.ps1、docs/community-image-audit.json；新增前后审计、编译包体记录、本报告及报告脚本；更新scripts/test-image-budget.js以校验最新实测产物和1,400,000字节目标。
