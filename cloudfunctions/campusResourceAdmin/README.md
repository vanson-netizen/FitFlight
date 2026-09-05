# campusResourceAdmin

该云函数只用于发布内置的固定批次 `buaa-resources-student-v1`，不接收客户端传入的资源、环境 ID、状态或数据版本。固定批次 JSON 位于云函数根目录，确保微信开发者工具完整打包。

## 默认安全状态

- `CAMPUS_RESOURCE_APPLY_ENABLED=false`：写入口默认关闭。
- `CAMPUS_RESOURCE_ADMIN_OPENID` 默认为空：即使误把开关打开，也没有调用者能通过写入鉴权。
- 目标环境硬编码为 `cloud1-d2gdhogc6193c3024`。
- `inspectApprovedV1` 只返回环境、固定版本以及记录 ID/contentHash 的比较结果。
- `applyApprovedV1` 同时要求写开关为 `true` 且调用者 OPENID 与云函数环境变量完全一致。

## 一次性发布流程

1. 部署前保持写开关为 `false`，先调用 `inspectApprovedV1` 核对比较结果。
2. 在云函数控制台配置管理员 OPENID，并将写开关临时改为 `true`；不要把真实 OPENID 写入仓库。
3. 仅由该管理员调用一次 `applyApprovedV1`。
4. 确认返回的写后比较为 `unchanged=23`，且 `insert/update/conflict` 均为 0。
5. 立即把 `CAMPUS_RESOURCE_APPLY_ENABLED` 改回 `false` 并重新部署/更新配置；更严格的做法是删除整个云函数。
6. 再调用 `inspectApprovedV1` 做只读复核。

在第 5 步完成前，不应把发布流程视为完全收尾。集合保持仅管理端可读写；普通小程序页面通过业务云函数读取资源。
