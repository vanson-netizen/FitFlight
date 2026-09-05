# 社区资源真机空白诊断（2026-09-05）

## 结论与证据边界

已确认布局兼容性缺陷：app.json 使用 Skyline，project.private.config.json 的模拟器 Skyline 开关原为 false。资源页使用 Skyline 不支持的 display:grid；失效后左侧 width:100%、height:100% 占满父容器，右侧及其中所有状态提示被 overflow:hidden 裁掉。右侧滚动列表还依赖百分比高度。

官方兼容性依据：https://github.com/wechat-miniprogram/skyline-skills/blob/master/skills/skyline-wxss/SKILL.md

未连接实体手机，因此不能断言该手机实际收到多少条，也不能声称真机修复验收完成。数据链路通过开发者工具调用线上服务验证；布局缺陷通过代码及官方支持范围确认。Skyline 自动化尝试报 rawPath 元数据错误或超时，完整分类 UI 自动化随后也出现工具内部异常，未记为通过。模拟器配置已恢复原值。

## 线上数据与过滤

app.js 已经明确使用 constants/cloud.js 中的 cloud1-d2gdhogc6193c3024，无需修改。repository 现额外在 callFunction config 中指定同一环境。

下载线上 trainingPlan 到工作区外临时目录核对：action=listCampusResources，参数为 type、category，白名单一致。线上返回结构是 { ok, items }，不是前端直接读取三个集合。前端没有资源缓存或 mock 回退；options.records 仅供测试，页面不传入。

部署后云端诊断返回 collections={venues:9,diningHalls:10,foodOptions:4}，版本 community-resource-diagnostics-v1。以下为开发者工具调用线上服务结果，不是真机结果：

| 页面 | 分类 | 条数 |
| --- | --- | ---: |
| 运动 | gym | 4 |
| 运动 | ball_sports | 3 |
| 运动 | swimming | 1 |
| 运动 | track_and_other | 1 |
| 饮食 | dining_hall | 10 |
| 饮食 | healthy_light_meal | 3 |
| 饮食 | high_protein | 0 |
| 饮食 | other_food | 1 |

社区云函数不按 status、verifiedAt、validUntil、campus 过滤；前端仅按 category 过滤，日期和状态仅影响标签。食物仍沿用原逻辑关联食堂，缺少关联食堂的条目会被排除；本次线上食物总数与分类合计同为 4，没有观察到丢失。云端 beforeCategory 为集合总量，afterServerFilter 为分类查询及食堂关联后的返回量，前端 filter.before/after 为 items 再按分类过滤的数量。

## 修改文件

- pages/community-resource/community-resource.wxss：横向 Flex，固定左栏宽度，右侧 flex:1、min-width:0，移除百分比滚动高度与不支持的换行属性。
- pages/community-resource/resource-layout.js（新增）：实际窗口及导航/标题位置计算像素高度，输出 setData 数量和视图尺寸。
- pages/community-sport/community-sport.js、community-sport.wxml：高度绑定、四态提示、生命周期及请求过期保护。
- pages/community-food/community-food.js、community-food.wxml：同上；分类切换重置滚动位置。
- services/campus-resource-repository.js：指定环境、调用/响应日志，错误结构必须进入 error。
- services/community-resource-service.js：分类过滤前后数量日志。
- cloudfunctions/trainingPlan/index.js：只新增社区读取诊断包装，集合数量统计失败时记录 null，不阻断资源返回。
- scripts/test-community-pages.js：更新环境及布局断言。
- scripts/test-community-resource-runtime.js（新增）：云函数入口、过滤、错误结构、四态、竞态及回顶测试。
- scripts/diagnose-community-resources.js：记录云端诊断数量及 requestID。
- scripts/inspect-community-layout.js、scripts/verify-community-categories.js（新增）：可复用的渲染尺寸及分类 UI 检查脚本。
- 本文档及 preview/community-resource-fix-20260905.*：交付说明与预览产物。

ready 状态沿用项目已有 success 枚举，WXML 与 service 一致。empty 显示“当前分类暂无资源”；error 显示“资源读取失败，点击重试”。

## 已执行验证与部署

- 通过：test-community-pages.js、test-community-resource-runtime.js、test-training-plan-runtime-assets.js、test-daily-checkin.js、test-plan-adjustment-flow.js；云函数语法检查。
- 通过：线上八个分类调用，部署前后数量一致；部署后的诊断版本及集合数量符合预期。
- 已实测模拟器运动首类 4 条、食堂 10 条 setData；390px 宽窗口右侧宽 299px，列表宽 275px、高 710px。
- 未完成：实体手机、窄屏、完整分类实际滚动与真实断网重试；完整 UI 自动化报工具内部错误。网络异常和竞态只通过本地模拟验证。
- 已成功增量部署 trainingPlan/index.js，仅 1 个文件，CLI 回报 6.9 KB。与部署前线上文件比较，除社区诊断包装外完全一致；未部署其他云函数。
- 未修改数据库数据或权限，未引入前端数据库查询，未改训练规则、画像、打卡、日志或 FIFI；未执行 commit/push/pull/fetch。

## 真机验收步骤

1. 扫描本次新的 preview/community-resource-fix-20260905.png。旧二维码不代表本次代码。如需重新生成：保存代码，在开发者工具点“编译”再点“预览”；本次前端修复需要新预览包，日后体验版仍需自行上传新版本。
2. 开启“真机调试”，依次进入运动、饮食，检查全部分类。预期数量见上表；高蛋白应显示“当前分类暂无资源”。滚动到底部后换分类，应从顶部开始。返回社区后重进，仍能正常加载。
3. 在真机调试控制台过滤 [community-resources]：request.env 应为指定环境；response.ok=true，diagnostics.collections 应为 9/10/4；filter.before/after 与所选分类一致；setData.listCount 等于返回卡片数量；layout 的宽高均大于 0。
4. 用 response.requestID 在 trainingPlan 云函数日志中定位调用，检查 [community-resources] cloud 的同一分类数量。日志仅记录数量、分类、错误码，不记录个人身份或完整资源。
5. 若 response 没有成功：定位云调用/网络问题；若 items>0 但 filter.after=0：定位分类不一致；若 setData.listCount>0 而仍无卡片：定位 layout 宽高及渲染。务必记录实际手机结果，不能把集合总数当作手机实收数量。
6. 手机断网后切换分类，应先加载中，再显示可点击的错误提示；恢复网络后点重试应恢复。用窄屏手机核对两栏均可见、长文本换行、底部卡片可完整滚入视野。
7. 建议手动打开开发者工具“Skyline 渲染调试”，避免继续仅用 WebView 模拟器判断 Skyline 真机表现；本次未永久改动个人调试配置。
