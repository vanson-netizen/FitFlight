# 健康记录 V1 数据与部署说明

本轮仅完成本地代码和测试，没有创建集合、修改权限、部署云函数或写入数据。

## 集合

集合名：`health_records`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `_id` | string | 服务端根据 `OPENID + recordDate` 生成，同一用户同一天固定 |
| `_openid` | string | 仅取自 `cloud.getWXContext().OPENID` |
| `recordDate` | string | `YYYY-MM-DD` |
| `weightKg` | number/null | 可选，20–400kg |
| `sleepHours` | number/null | 可选，0–24小时 |
| `energyLevel` | string/null | `low/normal/good` |
| `bodyFeeling` | string/null | `normal/fatigued/sore/unwell` |
| `note` | string | 可选，最多500字符，纯文本 |
| `version` | number | 从1开始的乐观并发版本 |
| `createdAt` | date | 数据库服务端时间 |
| `updatedAt` | date | 数据库服务端时间 |

除日期外，体重、睡眠、精力或身体感受至少填写一项；备注不能单独构成一条健康指标记录。

## 权限与索引

1. 创建 `health_records` 集合。
2. 权限设置为“仅管理端可读写”。
3. 创建普通、非唯一复合索引 `idx_openid_recordDate`：`_openid` 升序、`recordDate` 降序。

小程序页面不直接访问集合，只调用 `healthRecord` 云函数。

## 部署

集合、权限和索引生效后，在微信开发者工具中右键 `cloudfunctions/healthRecord`，选择“上传并部署：云端安装依赖”。只需要部署新增的 `healthRecord`，不需要部署训练方案、画像、打卡、FIFI、日志或社区云函数。

部署后先调用 `listRecords`，预期空集合返回 `{ ok: true, records: [] }`，再从页面创建测试记录。

## 产品边界

健康记录不写入 `body_profiles` 或 `user_portraits`，也不修改、过期或生成培养方案。达到体重差提示条件时，只有用户明确确认后才跳转身体档案页并预填最新体重，仍需用户自行保存。趋势和提示仅用于一般健康管理，不作医疗诊断。
