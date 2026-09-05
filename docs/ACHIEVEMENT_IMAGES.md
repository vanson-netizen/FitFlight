# 成就图片接入记录

> 已撤回：以下为历史接入记录。当前成就页及“我的”首页使用 CSS 圆形白色对勾，已解锁深绿、未解锁浅绿。五张运行 PNG、图片映射、失败处理工具及压缩脚本已删除；外部原图保留。撤回前主包实测 1,487,766 字节，删除 PNG 共 99,537 字节，预计撤回后约 1.39MB；本轮编译预览工具调用被用户拒绝，因此无撤回后的编译实测值。21 项自动检查通过，本地图片无单文件达到 200KB。详情见 scripts/test-achievement-display.js。

原图来自 `C:\FitFlight\generated-achievements`，源文件哈希在生成前后核对一致。副本均位于 `assets/achievements/`，为 144×144 RGBA PNG；去掉多余透明边距后等比例缩放，主体最长边 132 像素，保留透明边缘，不增加底色。

| 稳定 key | 成就 | 原图与副本文件名 | 副本字节 |
| --- | --- | --- | ---: |
| first_meeting | 初次相遇 | first-meeting.png | 14,599 |
| streak_3 | 连续3天 | streak-3-days.png | 25,258 |
| streak_7 | 连续7天 | streak-7-days.png | 13,595 |
| perfect_day | 今日满分 | perfect-day.png | 17,746 |
| active_partner | 活力搭档 | active-partner.png | 28,339 |

图片增量共 **99,537 字节（97.2 KiB）**。开发者工具 CLI preview 成功，当前单主包实测 **1,802,949 字节**，无分包；这是包体总量，图片增量与代码增量分别计算。详情见 `achievement-image-audit.json` 与 `achievement-package-info.json`。

## 实现

- `constants/fifi.js`：沿用稳定 `key` 和成就配置，仅替换 iconPath，条件、阈值、积分均保持原样。
- `utils/achievement-icons.js`：按 key 补齐旧数据图标；错误路径记录到控制台，回退现有统一 SVG 占位图；占位图再次失败则移除 image，保留等尺寸容器和文字，避免破图及重试循环。
- `pages/achievements/achievements.js/wxml/wxss`：列表及详情接入 PNG 和错误处理，未解锁图标 grayscale(1)、opacity .5，状态文字保持清晰。容器仍为 66rpx/72rpx，aspectFit。
- `pages/index/index.js/wxml`：沿用成长模型顺序，只取最新两个已解锁成就；不再补未解锁空图标。44rpx 图标、58rpx 条目和现有入口高度、空状态、跳转保持不变。
- `scripts/build-achievement-icons.ps1`：本地原图保护、透明裁边与缩放脚本，无新增依赖。
- `scripts/test-achievement-icons.js`、`scripts/test-mine-growth.js`：映射、兼容、透明 PNG、失败回退、最新两项及原有成长规则回归。

## 验证与验收边界

逐张查看 144 像素最终 PNG，双爪和爱心、三叶幼苗、七节点、勋章对勾及雪纳瑞眉毛胡须闪电均可辨认。透明通道、尺寸、格式和文件大小已检查。19 个 test 脚本及项目结构验证共 20 项通过，开发者工具 CLI 编译预览通过。没有完成模拟器多宽度视觉验收或真机验收。

只需重新编译预览或上传小程序；无需部署任何云函数、迁移数据库或更新用户成就数据。

人工验收：

1. 开发者工具以 320、375、390、430px 宽度打开“我的”与“我的成就”，检查图片等比例、名称与状态不溢出；首页只显示最新两个已解锁项，点击仍进入成就页。
2. 使用已有的零成就、部分解锁和全部解锁状态检查：零成就保留提示，已解锁彩色，未解锁灰淡且明确标为未解锁。不要为测试改生产数据库。
3. 临时在调试器将展示模型 iconPath 改为不存在的路径，确认控制台记录路径并显示统一占位图，文字和点击不受影响；重新进入页面恢复映射。
4. iPhone/安卓真机扫码检查透明边缘、五图细节、未解锁低饱和效果和加载速度，尤其检查首页较小的 44rpx 图标。
