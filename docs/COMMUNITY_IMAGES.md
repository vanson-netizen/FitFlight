# 社区图片接入与验收记录（2026-09-05）

重新递归扫描 C:/FitFlight/社区图片，共 21 张，现已全部接入。用户已明确减脂餐照片对应合一餐厅二楼，按 foodOption ID 绑定。原图只读；逐张 SHA-256 检查未变。

全部照片输出为 768×432、16:9 JPEG，单张 30,214—81,959 字节。含统一 SVG 占位图的图片总增量为 1,286,914 字节（1.227 MiB）。未上传云存储、未修改分包结构。

## 原图、资源与压缩副本

稳定 ID 来自现有 23 条发布记录；未访问或修改数据库。吉格、翘猩猩与教职工餐厅使用用户指定简称对应唯一正式实体，运行时只按 ID 映射。

| 原图 | 页面／分类 | 正式资源名称 | 稳定 ID | 压缩文件（assets/community/） | 尺寸 | 字节 | 歧义／依据 |
|---|---|---|---|---|---|---:|---|
| 运动.jpg | 社区首页 | 运动入口 | sport（入口 ID，无数据库实体） | community-home-sports.jpg | 768×432 | 43802 | 保留三位跑者头部及动作，裁去底部道路 |
| 饮食.jpg | 社区首页 | 饮食入口 | food（入口 ID，无数据库实体） | community-home-dining.jpg | 768×432 | 71002 | 无歧义 |
| 论坛.jpg | 社区首页 | 论坛入口 | forum（入口 ID，无数据库实体） | community-home-forum.jpg | 768×432 | 72628 | 无歧义 |
| 运动-健身房-北区健身房.jpg | 运动／健身房 | 北区健身房 | venue-xueyuan-gym-179643f6a0 | venue-xueyuan-gym-179643f6a0.jpg | 768×432 | 60409 | 保留坐姿及跑步人物头部 |
| 运动-健身房-游泳馆健身房.jpg | 运动／健身房 | 游泳馆健身房 | venue-xueyuan-gym-d8d6990026 | venue-xueyuan-gym-d8d6990026.jpg | 768×432 | 64939 | 保留左侧器械后人物头部 |
| 运动-健身房-吉格健身房.jpg | 运动／健身房 | 吉格健身 | venue-xueyuan-gym-34926a4072 | venue-xueyuan-gym-34926a4072.jpg | 768×432 | 58837 | 无歧义 |
| 运动-健身房-翘猩猩健身房.jpg | 运动／健身房 | 翘猩猩24h自助健身 | venue-xueyuan-gym-7212bc20d5 | venue-xueyuan-gym-7212bc20d5.jpg | 768×432 | 51842 | 无歧义 |
| 运动-游泳-游泳馆.jpg | 运动／游泳 | 游泳馆 | venue-xueyuan-swimming-019329917c | venue-xueyuan-swimming-019329917c.jpg | 768×432 | 69726 | 无歧义 |
| 运动-球类-乒乓球馆.jpg | 运动／球类 | 乒乓球馆 | venue-xueyuan-ball-sports-284873dc9d | venue-xueyuan-ball-sports-284873dc9d.jpg | 768×432 | 30214 | 无歧义 |
| 运动-球类-羽毛球馆（1）.jpg | 运动／球类 | 羽毛球馆（1） | venue-xueyuan-ball-sports-f36627c68a | venue-xueyuan-ball-sports-f36627c68a.jpg | 768×432 | 73904 | CSV主馆；照片含环场观众席 |
| 运动-球类-羽毛球馆（2）.jpg | 运动／球类 | 羽毛球馆（2） | venue-xueyuan-ball-sports-b69bcc106d | venue-xueyuan-ball-sports-b69bcc106d.jpg | 768×432 | 59062 | CSV训练馆（副馆）；照片无看台、多片训练场 |
| 饮食-食堂-航味餐厅.jpg | 饮食／食堂 | 航味餐厅 | dining-xueyuan-hall-b96eba561e | dining-xueyuan-hall-b96eba561e.jpg | 768×432 | 64348 | 保留左上两位人物头部，不做居中裁剪 |
| 饮食-食堂-航味星语.jpg | 饮食／食堂 | 航味星语 | dining-xueyuan-hall-1f269a4cb6 | dining-xueyuan-hall-1f269a4cb6.jpg | 768×432 | 57979 | 保留柜台后人员可见头部 |
| 饮食-食堂-合一餐厅.jpg | 饮食／食堂 | 合一餐厅 | dining-xueyuan-hall-e9ba17ae34<br>dining-xueyuan-hall-a171d7fc11 | dining-xueyuan-hall-e9ba17ae34.jpg | 768×432 | 57441 | 下对齐保留门前行人，裁去天空 |
| 饮食-食堂-教职工食堂.jpg | 饮食／食堂 | 教职工餐厅 | dining-xueyuan-hall-4f5c07a4f2 | dining-xueyuan-hall-4f5c07a4f2.jpg | 768×432 | 52451 | 裁去原图右边已不完整人物；保留中间顾客及工作人员头部 |
| 饮食-食堂-新北餐厅.jpg | 饮食／食堂 | 新北餐厅 | dining-xueyuan-hall-b3ae834b90<br>dining-xueyuan-hall-131f02dc64<br>dining-xueyuan-hall-52a647c53c | dining-xueyuan-hall-b3ae834b90.jpg | 768×432 | 70726 | 下对齐保留门前行人头部和动作 |
| 饮食-食堂-学二餐厅.jpg | 饮食／食堂 | 学二餐厅 | dining-xueyuan-hall-d519415fe8 | dining-xueyuan-hall-d519415fe8.jpg | 768×432 | 74176 | Crop upward to exclude the incomplete passerby at the original lower-left edge |
| 饮食-菜品-健康餐.jpg | 饮食／健康简餐 | 健康餐 | food-xueyuan-option-bf22a4c884 | food-xueyuan-option-bf22a4c884.jpg | 768×432 | 81959 | 只保留菜品区域，去掉顶部工作人员残影 |
| 饮食-其他-湖南小碗菜.jpg | 饮食／其他餐饮 | 湖南小碗菜 | food-xueyuan-option-af35c57c1a | food-xueyuan-option-af35c57c1a.jpg | 768×432 | 68504 | 无歧义 |
| 饮食-菜品-蔓味轻食.jpg | 饮食／健康简餐（商家） | 蔓味轻食 | dining-xueyuan-road-manwei-light-meal | merchant-xueyuan-road-manwei-light-meal.jpg | 768×432 | 39741 | 使用新商家图右侧餐品区域，排除原图无头人物与外卖平台操作栏 |
| 饮食-菜品-减脂餐.jpg | 饮食／健康简餐 | 减脂餐 | food-xueyuan-option-bd51c94c2f | food-xueyuan-option-bd51c94c2f.jpg | 768×432 | 62966 | Confirmed by user: Heyi dining hall, floor 2; food content only, never merchant cover |

田径场没有提供照片，使用统一占位图。减脂餐照片只绑定 food-xueyuan-option-bd51c94c2f，不覆盖蔓味轻食封面。

## 裁剪安全

已逐张查看全部最终 JPEG。资源卡片副本及区域同为 16:9。首页卡片改为 200—230rpx 后，继续保留副本原比例，用 imageStyle 的实际高度与 top 偏移控制裁剪：运动顶对齐、饮食焦点 0.5、论坛焦点 0.85。已查看最小卡片高度的裁剪效果，运动人物头部完整。未加色边、未拉伸、未用生成式补图。

focus 表示裁剪窗口在剩余可移动范围内的相对位置，0 为左／上，1 为右／下。特殊 crop 为原图归一化 x、y、宽度，高度按 16:9 计算。完整原始像素裁剪框和哈希见 community-image-audit.json。

| 原图 | focus | 特殊 crop | 人物／构图处理 |
|---|---|---|---|
| 运动.jpg | 0.5, 0 | — | 保留三位跑者头部及动作，裁去底部道路 |
| 饮食.jpg | 0.5, 0.5 | — | 场景或餐品构图，未发现被裁断的主要人物 |
| 论坛.jpg | 0.5, 0.85 | — | 场景或餐品构图，未发现被裁断的主要人物 |
| 运动-健身房-北区健身房.jpg | 0.5, 0.65 | — | 保留坐姿及跑步人物头部 |
| 运动-健身房-游泳馆健身房.jpg | 0.5, 0.6 | — | 保留左侧器械后人物头部 |
| 运动-健身房-吉格健身房.jpg | 0.5, 0.55 | — | 场景或餐品构图，未发现被裁断的主要人物 |
| 运动-健身房-翘猩猩健身房.jpg | 0.5, 0.6 | — | 场景或餐品构图，未发现被裁断的主要人物 |
| 运动-游泳-游泳馆.jpg | 0.5, 0.5 | — | 场景或餐品构图，未发现被裁断的主要人物 |
| 运动-球类-乒乓球馆.jpg | 0.5, 0.6 | — | 场景或餐品构图，未发现被裁断的主要人物 |
| 运动-球类-羽毛球馆（1）.jpg | 0.5, 0.65 | — | CSV主馆；照片含环场观众席 |
| 运动-球类-羽毛球馆（2）.jpg | 0.5, 0.65 | — | CSV训练馆（副馆）；照片无看台、多片训练场 |
| 饮食-食堂-航味餐厅.jpg | 0.5, 0 | — | 保留左上两位人物头部，不做居中裁剪 |
| 饮食-食堂-航味星语.jpg | 0.5, 0.7 | — | 保留柜台后人员可见头部 |
| 饮食-食堂-合一餐厅.jpg | 0.5, 1 | — | 下对齐保留门前行人，裁去天空 |
| 饮食-食堂-教职工食堂.jpg | 0.5, 0.6 | 0, 0.2, 0.92 | 裁去原图右边已不完整人物；保留中间顾客及工作人员头部 |
| 饮食-食堂-新北餐厅.jpg | 0.5, 1 | — | 下对齐保留门前行人头部和动作 |
| 饮食-食堂-学二餐厅.jpg | 0.5, 0.2 | — | Crop upward to exclude the incomplete passerby at the original lower-left edge |
| 饮食-菜品-健康餐.jpg | 0.5, 0.7 | — | 只保留菜品区域，去掉顶部工作人员残影 |
| 饮食-其他-湖南小碗菜.jpg | 0.5, 0.5 | — | 场景或餐品构图，未发现被裁断的主要人物 |
| 饮食-菜品-蔓味轻食.jpg | 0.75, 0.3 | 0.42, 0.12, 0.58 | 使用新商家图右侧餐品区域，排除原图无头人物与外卖平台操作栏 |
| 饮食-菜品-减脂餐.jpg | 0.5, 0.75 | — | Confirmed by user: Heyi dining hall, floor 2; food content only, never merchant cover |

## 关键映射

- 蔓味轻食：新文件 饮食-菜品-蔓味轻食.jpg → dining-xueyuan-road-manwei-light-meal → 健康简餐商家卡片；不使用减脂餐封面，不进入食堂分类。
- 羽毛球馆（1）：运动-球类-羽毛球馆（1）.jpg → venue-xueyuan-ball-sports-f36627c68a → 体育馆主馆。原始运动 CSV、稳定 ID、位置与带看台主馆图像一致。
- 羽毛球馆（2）：运动-球类-羽毛球馆（2）.jpg → venue-xueyuan-ball-sports-b69bcc106d → 体育馆训练馆（副馆）。原始 CSV、稳定 ID、位置与无看台训练场图像一致。两条资源、两份不同封面，没有轮播。

## 页面与代码

- constants/community-resource-images.js：集中稳定 ID 映射，记录焦点及 crop 元数据；聚合食堂通过 sourceDiningHallIds 取共同封面，商家通过 diningHallId 取自己的封面，菜品只取菜品 ID。未知 ID 不按模糊名称匹配。
- services/community-resource-service.js：仅新增派生 displayImage，未改业务分类、时间、数据库字段。
- pages/community-shared/image-fallback.js：图片失败退到统一占位图，占位也失败则隐藏 image、保留低饱和底色及资源文字；忽略旧分类图片失败事件。
- pages/community/community.{js,wxml,wxss}、pages/community-sport/community-sport.{js,wxml}、pages/community-food/community-food.{js,wxml}、pages/community-resource/community-resource.wxss：接入图片和 binderror；首页卡片按视口统一为200—230rpx，间距18rpx，资源图片区保持16:9。保留路由、点击和分类逻辑。首页计算见 pages/community/home-layout.js。
- scripts/community-image-manifest.json、build-community-images.ps1、build-community-image-config.js、report-community-images.js：可复现映射、压缩及报告流程，不引入新依赖。
- scripts/test-community-images.js 与 test-community-pages.js：图片绑定、文件／哈希、空图／失败回退及布局回归测试。

## 包体与部署边界

无分包。历史预览记录 354,213 字节；实施前当前前端文件（assets/pages/components/constants/services/utils）合计 389,812 字节，此为文件字节数而非编译包。首轮 800×450 实测预览包 1,888,900 字节，接近容量边界后已暂停并报告。用户明确选择改为 768×432，随后继续压缩与复测。最终实测包体见 community-image-package-info.json。

本次不修改或部署任何云函数，不修改数据库、训练规则、画像、打卡、FIFI 或日志业务。图片本身只需重新编译／预览或上传小程序前端。前两轮已修改的 trainingPlan 字段透传若线上尚未部署，仍是既有分类功能的独立前置事项，本次未替用户部署。

## 验证与人工验收

自动验证：图片原始哈希、JPEG 文件与解码尺寸、源 ID 合法性、聚合食堂共同封面、蔓味轻食身份与封面、双羽毛球馆独立映射、40 条列表不丢失、错误路径回退、占位失败不循环、旧分类事件隔离；WXML 标签、路由及已有社区回归。已完成微信开发者工具 CLI 编译预览。

未完成真机验收；320/375/390/430 px 的布局比例完成静态计算检查，不冒充开发者工具多设备实际测量。需手工执行：

1. 重新编译，在开发者工具切换320/375/390/430px宽度；首页三张入口应等高并露出论坛卡片，极小视口允许滚动；运动及饮食资源卡片维持16:9。图片不拉伸，文字不遮挡主要人物头部。
2. 依次打开运动四分类、饮食四分类，上下滚动至最后一张，切换分类后回到顶部，返回重进能正常显示。
3. 确认食堂 6 张聚合卡，合一／新北不重复；健康简餐显示蔓味轻食商家图与商家标题；羽毛球主馆为看台图，副馆为训练场图。
4. 临时将一张 displayImage 改为不存在路径，触发错误后应出现统一占位图且文字保留；恢复后重新加载。空分类、资源加载失败及重试流程不变。
5. 真机扫码检查人物头部、字体和场馆／餐品清晰度，分别在 Wi-Fi 和移动网络冷启动与连续滚动，确认无拉伸、闪烁或明显延迟。
