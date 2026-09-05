const fs = require('fs')
const entries = require('./community-image-manifest.json')
const audit = JSON.parse(fs.readFileSync('docs/community-image-audit.json', 'utf8').replace(/^\ufeff/, ''))
const records = Object.values(require('../cloudfunctions/campusResourceAdmin/buaa-resources-student-v1.json').collections).flat()
const byId = new Map(records.map((record) => [record._id, record]))
const categories = { gym: '健身房', ball_sports: '球类', swimming: '游泳', healthy_light_meal: '健康简餐', other_food: '其他餐饮' }
const total = audit.reduce((sum, item) => sum + item.bytes, 0) + fs.statSync('assets/community/placeholder.svg').size
const lines = [
  '# 社区图片接入与验收记录（2026-09-05）', '',
  '重新递归扫描 C:/FitFlight/社区图片，共 21 张，现已全部接入。用户已明确减脂餐照片对应合一餐厅二楼，按 foodOption ID 绑定。原图只读；逐张 SHA-256 检查未变。', '',
  `全部照片输出为 768×432、16:9 JPEG，单张 30,214—81,959 字节。含统一 SVG 占位图的图片总增量为 ${total.toLocaleString('en-US')} 字节（${(total / 1048576).toFixed(3)} MiB）。未上传云存储、未修改分包结构。`, '',
  '## 原图、资源与压缩副本', '',
  '稳定 ID 来自现有 23 条发布记录；未访问或修改数据库。吉格、翘猩猩与教职工餐厅使用用户指定简称对应唯一正式实体，运行时只按 ID 映射。', '',
  '| 原图 | 页面／分类 | 正式资源名称 | 稳定 ID | 压缩文件（assets/community/） | 尺寸 | 字节 | 歧义／依据 |',
  '|---|---|---|---|---|---|---:|---|'
]
for (const entry of entries) {
  const image = audit.find((item) => item.file === entry.file)
  const resources = entry.ids.map((id) => byId.get(id))
  const parent = resources[0]
  const category = entry.home ? '社区首页' : parent.entityType === 'external_merchant' ? '饮食／健康简餐（商家）' : parent.foodOptionId ? `饮食／${categories[parent.category]}` : parent.diningHallId ? '饮食／食堂' : `运动／${categories[parent.category]}`
  const names = [...new Set(resources.map((record) => record.name || record.dishName))].join('、') || { sport: '运动入口', food: '饮食入口', forum: '论坛入口' }[entry.home]
  lines.push(`| ${entry.source} | ${category} | ${names} | ${entry.ids.join('<br>') || entry.home + '（入口 ID，无数据库实体）'} | ${entry.file} | ${image.width}×${image.height} | ${image.bytes} | ${entry.note || '无歧义'} |`)
}
lines.push('',
  '田径场没有提供照片，使用统一占位图。减脂餐照片只绑定 food-xueyuan-option-bd51c94c2f，不覆盖蔓味轻食封面。', '',
  '## 裁剪安全', '',
  '已逐张查看全部最终 JPEG。资源卡片副本及区域同为 16:9。首页卡片改为 200—230rpx 后，继续保留副本原比例，用 imageStyle 的实际高度与 top 偏移控制裁剪：运动顶对齐、饮食焦点 0.5、论坛焦点 0.85。已查看最小卡片高度的裁剪效果，运动人物头部完整。未加色边、未拉伸、未用生成式补图。', '',
  'focus 表示裁剪窗口在剩余可移动范围内的相对位置，0 为左／上，1 为右／下。特殊 crop 为原图归一化 x、y、宽度，高度按 16:9 计算。完整原始像素裁剪框和哈希见 community-image-audit.json。', '',
  '| 原图 | focus | 特殊 crop | 人物／构图处理 |', '|---|---|---|---|')
for (const entry of entries) lines.push(`| ${entry.source} | ${entry.focus.join(', ')} | ${entry.crop ? entry.crop.join(', ') : '—'} | ${entry.note || '场景或餐品构图，未发现被裁断的主要人物'} |`)
lines.push('', '## 关键映射', '',
  '- 蔓味轻食：新文件 饮食-菜品-蔓味轻食.jpg → dining-xueyuan-road-manwei-light-meal → 健康简餐商家卡片；不使用减脂餐封面，不进入食堂分类。',
  '- 羽毛球馆（1）：运动-球类-羽毛球馆（1）.jpg → venue-xueyuan-ball-sports-f36627c68a → 体育馆主馆。原始运动 CSV、稳定 ID、位置与带看台主馆图像一致。',
  '- 羽毛球馆（2）：运动-球类-羽毛球馆（2）.jpg → venue-xueyuan-ball-sports-b69bcc106d → 体育馆训练馆（副馆）。原始 CSV、稳定 ID、位置与无看台训练场图像一致。两条资源、两份不同封面，没有轮播。', '',
  '## 页面与代码', '',
  '- constants/community-resource-images.js：集中稳定 ID 映射，记录焦点及 crop 元数据；聚合食堂通过 sourceDiningHallIds 取共同封面，商家通过 diningHallId 取自己的封面，菜品只取菜品 ID。未知 ID 不按模糊名称匹配。',
  '- services/community-resource-service.js：仅新增派生 displayImage，未改业务分类、时间、数据库字段。',
  '- pages/community-shared/image-fallback.js：图片失败退到统一占位图，占位也失败则隐藏 image、保留低饱和底色及资源文字；忽略旧分类图片失败事件。',
  '- pages/community/community.{js,wxml,wxss}、pages/community-sport/community-sport.{js,wxml}、pages/community-food/community-food.{js,wxml}、pages/community-resource/community-resource.wxss：接入图片和 binderror；首页卡片按视口统一为200—230rpx，间距18rpx，资源图片区保持16:9。保留路由、点击和分类逻辑。首页计算见 pages/community/home-layout.js。',
  '- scripts/community-image-manifest.json、build-community-images.ps1、build-community-image-config.js、report-community-images.js：可复现映射、压缩及报告流程，不引入新依赖。',
  '- scripts/test-community-images.js 与 test-community-pages.js：图片绑定、文件／哈希、空图／失败回退及布局回归测试。', '',
  '## 包体与部署边界', '',
  '无分包。历史预览记录 354,213 字节；实施前当前前端文件（assets/pages/components/constants/services/utils）合计 389,812 字节，此为文件字节数而非编译包。首轮 800×450 实测预览包 1,888,900 字节，接近容量边界后已暂停并报告。用户明确选择改为 768×432，随后继续压缩与复测。最终实测包体见 community-image-package-info.json。', '',
  '本次不修改或部署任何云函数，不修改数据库、训练规则、画像、打卡、FIFI 或日志业务。图片本身只需重新编译／预览或上传小程序前端。前两轮已修改的 trainingPlan 字段透传若线上尚未部署，仍是既有分类功能的独立前置事项，本次未替用户部署。', '',
  '## 验证与人工验收', '',
  '自动验证：图片原始哈希、JPEG 文件与解码尺寸、源 ID 合法性、聚合食堂共同封面、蔓味轻食身份与封面、双羽毛球馆独立映射、40 条列表不丢失、错误路径回退、占位失败不循环、旧分类事件隔离；WXML 标签、路由及已有社区回归。已完成微信开发者工具 CLI 编译预览。', '',
  '未完成真机验收；320/375/390/430 px 的布局比例完成静态计算检查，不冒充开发者工具多设备实际测量。需手工执行：', '',
  '1. 重新编译，在开发者工具切换320/375/390/430px宽度；首页三张入口应等高并露出论坛卡片，极小视口允许滚动；运动及饮食资源卡片维持16:9。图片不拉伸，文字不遮挡主要人物头部。',
  '2. 依次打开运动四分类、饮食四分类，上下滚动至最后一张，切换分类后回到顶部，返回重进能正常显示。',
  '3. 确认食堂 6 张聚合卡，合一／新北不重复；健康简餐显示蔓味轻食商家图与商家标题；羽毛球主馆为看台图，副馆为训练场图。',
  '4. 临时将一张 displayImage 改为不存在路径，触发错误后应出现统一占位图且文字保留；恢复后重新加载。空分类、资源加载失败及重试流程不变。',
  '5. 真机扫码检查人物头部、字体和场馆／餐品清晰度，分别在 Wi-Fi 和移动网络冷启动与连续滚动，确认无拉伸、闪烁或明显延迟。', '')
fs.writeFileSync('docs/COMMUNITY_IMAGES.md', lines.join('\n'))
console.log(`Wrote image report, total image bytes=${total}`)
