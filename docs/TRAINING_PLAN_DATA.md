# 方案状态数据与部署说明

本文件记录第二轮代码所需的云数据库结构。以下操作需要在云开发控制台手动完成，代码未自动修改线上配置。

## 集合

### `training_plan_states`

每个微信用户最多一条状态记录：

- `_openid`：云函数从 `cloud.getWXContext().OPENID` 写入；
- `currentPlanId`：当前仍可查看的方案 ID，可为空；
- `planStatus`：集中定义的方案状态；
- `generatingPlanId`：正在生成的方案 ID，可为空；
- `pendingProfileVersion`：等待用户确认的身体档案版本，可为空；
- `pendingGenerationType`：`initial` 或 `adjustment`，可为空；
- `createdAt`、`updatedAt`：服务端时间。

### `training_plans`

方案生成记录不覆盖旧方案：

- `_openid`、`ownerOpenId`：均由云函数根据当前用户写入，不接受前端传值；
- `profileVersion`、`portraitVersion`、`safetyScreeningVersion`、`ruleVersion`、`ruleReviewStatus`、`generatorVersion`；
- `generationType`：由云端根据是否存在当前方案决定；
- `requestId`：幂等请求标识；
- `status`、`content`、`failureCode`；
- `createdAt`、`updatedAt`、`generatedAt`。

页面响应不会返回 `_openid` 或 `ownerOpenId`。`fitflight-cultivation-v1-draft.2` 生成成功后，`content` 以 `schemaVersion=1.1.0-draft` 保存 `summary`、`cycle.weeks`、28 条 `dailyPlans`、必要画像输入快照、安全资格、健康免责声明、规则/目录/资源版本和生成时资源匹配快照；页面不得绕过快照动态替换旧方案资源。旧 `1.0.0` 快照继续按自身字段读取，不迁移、不重算。

### `cultivation_daily_checkins`

每条记录只保存某用户在某方案某个北京时间自然日的三项完成状态：

- `_openid`：只由 `cloud.getWXContext().OPENID` 产生；
- `planId`、`date`（`YYYY-MM-DD`）；
- `exerciseCompleted`、`dietCompleted`、`sleepCompleted`；
- `completedCount`：云端根据三个布尔值计算；
- `revision`：从 1 开始递增，用于乐观并发控制；
- `createdAt`、`updatedAt`：服务端时间。

不保存用户画像、方案快照、实际饮食、睡眠或其他健康信息。方案快照保持不可变。

## 索引建议

- `body_profiles._openid`：唯一索引（第一轮待验证项）；
- `training_plan_states._openid`：唯一索引，防止同一用户出现多个状态记录；
- `training_plans` 的 `_openid + requestId`：唯一复合索引，保证相同请求幂等；
- `training_plans` 的 `_openid + profileVersion + ruleVersion + status`：普通复合索引，用于查找同版本有效生成任务。
- `cultivation_daily_checkins` 的 `_openid + planId + date`：唯一复合索引，字段顺序固定为 `_openid`、`planId`、`date`。代码同时使用确定性文档 ID 和事务查询防重复，但部署时仍必须建立该索引。

## 权限建议

`body_profiles`、`training_plan_states`、`training_plans` 和 `cultivation_daily_checkins` 均设置为“仅管理端可读写”。所有页面操作通过云函数完成，云函数查询必须带当前 `OPENID`；不要设置为所有用户可读。

## 部署顺序

1. 创建 `training_plan_states`、`training_plans` 和 `cultivation_daily_checkins` 集合；
2. 建立上述索引并设置仅管理端可读写；
3. 部署新增 `trainingPlan` 云函数；
4. 部署更新后的 `saveBodyProfile` 云函数；
5. 在微信开发者工具中进行状态流联调。

旧用户没有 `training_plan_states` 记录时按 `none` 处理；旧身体档案缺少 `profileVersion` 时继续按版本 1 兼容。
