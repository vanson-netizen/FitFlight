# V1 用户画像数据与部署说明

## 集合

新增 `user_portraits`，每个微信用户最多一条当前画像记录。前端不得直接读写该集合。

- `_openid`：仅由 `cloud.getWXContext().OPENID` 写入；
- `portraitVersion`：画像乐观并发版本，首次为 1，每次重新生成递增；
- `portraitRuleVersion`：当前为 `portrait-v1`；
- `changePolicyVersion`：当前为 `portrait-change-v1`；
- `profileVersion`：云函数读取 `body_profiles` 后关联，不接受前端提交；
- `status`：持久化为 `complete`，读取时若身体档案版本变化则响应为 `needs_regeneration`；
- `calculatedMetrics`：云端计算的 BMI 和体重目标差，来源为 `calculated`；
- `campus`、`trainingGoal`、`trainingConditions`、`safetyConditions`：用户主动选择，来源为 `user_reported`；旧画像缺少 `campus` 时读取边界按 `unknown` 兼容；
- `changeBaseline`：仅保存重大变化判断所需的 `weightKg` 和 `targetWeightKg`，不向前端返回；
- `generatedAt`、`updatedAt`、`createdAt`：服务端时间。

V1 不保存或推算体脂率、骨骼肌量、骨量、骨密度。`device_reported` 仅作为未来实测来源类型边界，本轮没有对应字段或数值。

## 索引与权限

- 为 `user_portraits._openid` 建立唯一索引；
- 集合权限设置为“仅管理端可读写”；
- 所有查询和条件更新必须带当前云函数上下文的 `_openid`；
- 响应不返回 `_openid`、`changeBaseline` 或其他内部归属信息。

## 云函数接口

`userPortrait.getPortrait` 不接受业务参数，返回当前身体资料摘要、画像和服务端判定状态。

`userPortrait.savePortrait` 仅接受：

- `expectedPortraitVersion`；
- `portrait.campus`；
- `portrait.trainingGoal`；
- `portrait.trainingConditions`；
- `portrait.safetyConditions`。

BMI、体重目标差、`profileVersion`、画像归属和规则版本均由云端产生。`userInfo`、`tcbContext` 只按已确认系统元数据字段名排除，不读取其内容。

`trainingPlan.setPortraitAdjustmentPending` 不接受其他业务字段。它会重新读取当前画像、身体档案和方案状态，仅在画像为最新且存在 active/outdated 方案时复用 `pending_confirmation`，不会调用方案生成器、清除 `currentPlanId` 或覆盖旧方案。

## 部署顺序

1. 创建 `user_portraits` 集合；
2. 建立 `_openid` 唯一索引并设置仅管理端可读写；
3. 部署 `userPortrait` 云函数；
4. 部署更新后的 `trainingPlan` 云函数；
5. 上传小程序代码并在微信开发者工具中联调。

`saveBodyProfile` 云函数不需要因画像功能重新部署；画像过期由 `userPortrait` 读取时动态比较 `profileVersion`。
