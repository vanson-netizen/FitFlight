# FitFlight 培养方案 V1 匿名测试画像

状态：`draft`  
对应候选规则版本：`fitflight-cultivation-v1-draft.2`  
用途：规则设计验收样例，不是测试用户、医学判断或真实方案。

## 1. 测试约定

- 年龄由生成日与 `birthDate` 在服务端计算；测试表直接写年龄仅便于阅读。
- `healthSafety=all_clear` 表示未来安全问卷中的疼痛、损伤、术后、医生禁运动、孕产/特殊状态、医疗目的和进食异常等均得到明确否定回答；当前画像尚没有这些字段。
- `eligible` 只表示进入一般健康管理规则，不表示健康、无病或适合任何强度。
- 允许生成的样例只校验分类、日程结构和禁止项，不给出未经审核的具体负荷、热量或体重变化承诺。

## 2. 测试画像与预期

| ID | 匿名输入摘要 | 预期分类 | 是否允许生成 | 原因/稳定码 | 关键断言 |
|---|---|---|---:|---|---|
| `P01` | 17 岁；其余完整；限制为 `none` | 未成年人 | 否 | `MINOR_OUT_OF_V1_SCOPE` | 不生成成人训练或饮食方案 |
| `P02` | 22 岁；画像缺少训练经验 | 关键数据缺失 | 否 | `PROFILE_OR_PORTRAIT_INCOMPLETE` | 不用默认经验等级补齐 |
| `P03` | 20 岁；限制为 `unsure` | 安全状态不明 | 否 | `LIMITATION_REQUIRES_CLARIFICATION` | 提示咨询医生或专业人士 |
| `P04` | 24 岁；限制为 `has_limitation` | 存在运动限制 | 否 | `LIMITATION_REQUIRES_PROFESSIONAL_GUIDANCE` | 不生成康复动作或饮食处方 |
| `P05` | 26 岁；限制 `none`，但报告膝痛/近期损伤 | 疼痛或损伤 | 否 | `PAIN_INJURY_OR_RECOVERY_OUT_OF_SCOPE` | 不推断伤病类型，不提供替代治疗动作 |
| `P06` | 31 岁；术后恢复或医生要求避免运动 | 医疗边界 | 否 | `MEDICAL_RESTRICTION_OUT_OF_SCOPE` | 明确遵医嘱并停止自动生成 |
| `P07` | 23 岁；`fat_loss`；当前 60kg、目标 65kg | 目标方向冲突 | 否，先澄清 | `GOAL_DIRECTION_CONFLICT` | 不擅自改成增重目标 |
| `P08` | 25 岁；`weight_gain`；当前 55kg、目标 50kg | 目标方向冲突 | 否，先澄清 | `GOAL_DIRECTION_CONFLICT` | 不擅自改成减脂目标 |
| `P09` | 29 岁；减脂目标导向目标 BMI 低于 18.5 | 不合理目标风险 | 否 | `AGGRESSIVE_OR_IMPLAUSIBLE_TARGET` | 不计算热量缺口或承诺减重速度 |
| `P10` | 21 岁；信息完整、安全问卷明确；`fitness_improvement`；初学者；每周 3 天、30 分钟；徒手；喜欢步行；学院路 | 普通成人/提升体能 | 是（规则审核后） | `ELIGIBLE` | 4 周；训练/轻活动/恢复齐全；无高强度；资源未核实时地点降级 |
| `P11` | 27 岁；信息完整；`muscle_gain`；有经验；每周 4 天、45 分钟；健身房；喜欢力量；沙河 | 普通成人/增肌 | 是（规则审核后） | `ELIGIBLE` | 抗阻优先、非连续同焦点；不输出补剂、精确蛋白质或负荷 |
| `P12` | 32 岁；信息完整；`fat_loss`；初学者；每周 2 天、20 分钟；徒手；偏好不确定；校区未知 | 普通成人/减脂 | 是（规则审核后） | `ELIGIBLE` | 不强塞 150 分钟；不承诺速度；地点为通用降级 |
| `P13` | 38 岁；信息完整；`maintain`；每周 7 天、60 分钟；有经验；多项偏好 | 普通成人/保持 | 是（规则审核后） | `ELIGIBLE` | 结构化训练日不超过配置上限，至少 1 个恢复日，不因可用 7 天排满高负荷 |
| `P14` | 34 岁；信息完整；`weight_gain`；当前 BMI 过低；安全问卷明确 | 体重过低特殊关注 | 否 | `UNDERWEIGHT_REQUIRES_NUTRITION_ASSESSMENT` | 转营养/医学评估；不直接给增重热量或份量 |
| `P15` | 40 岁；信息完整；`maintain`；身体档案版本 5、画像版本关联档案 4 | 版本冲突 | 否 | `INPUT_VERSION_CONFLICT` | 不覆盖旧方案，不使用旧画像生成 |
| `P16` | 28 岁；信息完整；`fitness_improvement`；规则为 draft、请求正式激活 | 数据版本不具备资格 | 否 | `DATA_VERSION_NOT_ELIGIBLE` | draft 规则只能测试，不得发布 active 方案 |

## 3. 结构测试

对每个允许生成的画像，未来实现测试必须验证：

1. 总体方案与每日方案拥有相同 `planId/ruleVersion/profileVersion/portraitVersion/resourceDataVersion`。
2. `cycle.totalWeeks` 来自参数配置且当前为 4，不由页面写死。
3. 每周至少包含一个 `recovery` 日，训练日不超过用户可用天数及配置上限。
4. 初学者不自动选择 `vigorous`；第 3 周无完成度/不适反馈时保持，不递进。
5. 每个训练日都有 `preparation/main/cooldown`，总时长与分项时长可核对。
6. `dailyRecord` 的完成项、实际饮食和实际睡眠不写回方案快照。
7. 资源匹配更换校区或资源版本时，不改变健康任务本身。
8. 无 `verified` 场地时显示“暂无已核实地点”和安全场所通用提示。
9. 无可靠营养来源时，热量、蛋白质、份量数值和减重速度均为 `null`。
10. 更新资源或规则后，旧方案 JSON 保持逐字段不变；只有新 `planId` 使用新版本。

## 4. 边界组合测试

| 场景 | 预期 |
|---|---|
| `pending_verification` 场地能力标签完全匹配 | 仍不得成为明确地点推荐 |
| `verified` 场地已过 `validUntil` | 按 `stale/no_match` 排除 |
| 场地已核实但预约/开放规则缺失 | 不宣称“当前开放”，标记 `needs_confirmation` 或降级 |
| 菜品餐别匹配但营养来源为 `none` | 可按食物类别匹配；所有精确营养数值保持 null |
| 同画像、同规则、不同北航资源版本 | 健康安排一致，仅资源快照可能不同 |
| 生成期间画像版本变化 | 新方案不得激活，旧方案保持不变 |

