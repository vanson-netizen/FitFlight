# “我的日志”V1 数据与部署说明

## 本轮状态

代码和本地自动测试已准备完成。本轮没有创建集合、修改权限、建立索引、部署云函数或写入任何云数据库记录。

## 集合

### `journal_notebooks`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `_id` | string | 云函数根据当前 `OPENID + requestId` 生成的稳定文档 ID |
| `_openid` | string | 仅由 `cloud.getWXContext().OPENID` 写入 |
| `title` | string | 1–30个字符 |
| `entryCount` | number | 当前日志数量；新建日志时在同一事务中递增 |
| `version` | number | 乐观并发版本，从1开始 |
| `status` | string | V1固定为 `active` |
| `createdAt` | date | 数据库服务端时间 |
| `updatedAt` | date | 数据库服务端时间 |

### `journal_entries`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `_id` | string | 新建时根据当前 `OPENID + notebookId + requestId` 生成的稳定文档 ID |
| `_openid` | string | 仅由 `cloud.getWXContext().OPENID` 写入 |
| `notebookId` | string | 归属日志本ID，保存前检查该日志本属于当前用户 |
| `title` | string | 0–50个字符 |
| `content` | string | 1–5000个字符的纯文本 |
| `version` | number | 乐观并发版本，从1开始 |
| `createdAt` | date | 数据库服务端时间 |
| `updatedAt` | date | 数据库服务端时间 |
| `lastRequestId` | string | 内部幂等字段，仅用于识别最后一次编辑保存重放，不返回前端 |

`lastRequestId` 是在不增加第三个集合的前提下保证编辑保存幂等所需的内部字段。它不包含用户身份或正文，也不在云函数响应中返回。

## 权限

在云开发控制台分别创建两个集合，并将权限设置为“仅管理端可读写”：

- `journal_notebooks`
- `journal_entries`

小程序页面不直接访问集合，所有操作只经过 `journal` 云函数。不要设置为“所有用户可读”或“所有用户可写”。

## 索引

在云开发控制台的集合“索引管理”中创建普通复合索引：

1. `journal_notebooks`：`_openid` 升序、`updatedAt` 降序。
2. `journal_entries`：`_openid` 升序、`notebookId` 升序、`updatedAt` 降序。

两个索引均不需要设置为唯一索引。文档 `_id` 已使用内置唯一索引；稳定ID和事务共同防止重复创建。

## 部署顺序

1. 确认微信开发者工具当前环境为目标 FitFlight 云环境。
2. 创建上述两个空集合。
3. 将两个集合权限设为仅管理端可读写。
4. 创建上述两个普通复合索引并等待索引生效。
5. 在微信开发者工具中右键 `cloudfunctions/journal`，选择“上传并部署：云端安装依赖”。
6. 部署成功后先调用 `listNotebooks`，确认返回 `{ ok: true, notebooks: [] }`。
7. 再通过小程序页面完成新建日志本、新建日志、编辑日志和重复点击验收。

本功能只需要部署新增的 `journal` 云函数；不需要重新部署 `trainingPlan`、`userPortrait`、`saveBodyProfile` 或 `campusResourceAdmin`。
