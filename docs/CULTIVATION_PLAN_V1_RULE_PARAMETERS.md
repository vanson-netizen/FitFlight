# FitFlight 培养方案 V1 规则参数表

状态：`draft`  
候选规则版本：`fitflight-cultivation-v1-draft.2`  
参数数据版本：`health-rules-draft.2`  
适用范围：普通成年人一般健康管理；不得用于医疗诊断、治疗、康复或竞技训练。

## 1. 参数治理

- 运行逻辑只按参数键读取，不在页面、条件分支或动作目录中散落数值。
- `authority_confirmed` 表示数值可追溯到本文登记的官方资料；仍需产品确认其适用方式。
- `product_draft` 表示 FitFlight 为形成可测试规则提出的产品参数，必须经指定专业角色审核后才能改为 `reviewed`。
- `null_pending_review` 表示尚无获准数值；实现不得提供隐式默认值。
- 任一启用参数的 `reviewStatus !== reviewed` 时，正式规则集不得标记为 `reviewed` 或 `active`。
- 规则变更必须生成新 `ruleVersion`；旧方案继续读取生成时快照。

## 2. 适用范围与安全参数

| 参数键 | 候选值 | 依据/性质 | 状态 | 审核要求 |
|---|---:|---|---|---|
| `population.minimumAgeYears` | 18 | 《体重管理指导原则（2024年版）》成人判定表以 18 岁及以上为成人 | `authority_confirmed` | 医生确认 V1 成人边界 |
| `population.maximumAgeYears` | 64 | 65 岁及以上在该指导原则中作为特殊人群单列；V1 保守排除 | `product_draft` | 医生/老年健康专业人员 |
| `population.allowedLimitationStatuses` | `none` | 特殊风险应转专业指导 | `product_draft` | 医生/运动医学 |
| `population.requiredSafetyAnswers` | 全部明确且为否 | 不把缺失当作安全 | `product_draft` | 医生/产品合规 |
| `bmi.adultCategories` | `<18.5 / 18.5–23.9 / 24.0–27.9 / >=28.0` | 《体重管理指导原则（2024年版）》附表 1 | `authority_confirmed` | 仅用于成人分类提示，不作疾病诊断 |
| `target.maximumFourWeekWeightChangeKg` | `null` | 当前没有足够依据及目标日期输入 | `null_pending_review` | 医生+注册营养师 |
| `target.maximumWeeklyWeightChangeRatio` | `null` | 不推断安全减重/增重速度 | `null_pending_review` | 医生+注册营养师 |
| `safety.stopSignals` | 疼痛、胸闷、明显气促、眩晕、损伤等通用停止提示 | 一般安全提醒，不诊断原因 | `product_draft` | 医生/运动医学审文案 |

`maximumAgeYears=64` 是 V1 产品范围，不表示 65 岁以上不能运动；它只表示当前自动规则不覆盖需要更完整评估的老年人群。

## 3. 当前输入枚举与周期参数

| 参数键 | 候选值 | 来源 | 状态 |
|---|---|---|---|
| `cycle.totalWeeks` | 4 | 当前产品要求 | `product_draft` |
| `schedule.userSelectableDaysPerWeek` | `1..7` | 当前画像 UI | `implemented_input` |
| `schedule.maximumStructuredTrainingDays` | 6 | 每周至少保留 1 个恢复日的 V1 提案 | `product_draft` |
| `schedule.sessionDurationOptionsMinutes` | `20, 30, 45, 60` | 当前画像 UI | `implemented_input` |
| `intensity.levels` | `light, moderate, vigorous` | 规则枚举 | `draft` |
| `intensity.vigorousAutoSelectionEnabled` | `false` | V1 保守边界 | `product_draft` |
| `session.sections` | `preparation, main, cooldown` | 《全民健身指南》及《健康中国行动》采用完整运动结构 | `authority_confirmed` |
| `publicHealthReference.weeklyModerateAerobicMinutes` | 150 | 《健康中国行动》《体重管理指导原则（2024年版）》 | `authority_confirmed` |
| `publicHealthReference.resistanceSessionsPerWeek` | `2..3` | 《体重管理指导原则（2024年版）》 | `authority_confirmed` |
| `recovery.minimumHoursBetweenSameMuscleResistanceSessions` | `null` | 尚待体育教师/运动医学确认 | `null_pending_review` |

公共健康参考值用于总体摘要和长期方向，不得在用户只选择较少可用时间时强行塞入 4 周日程，也不得据此声称用户达标。

## 4. 四周阶段参数

| 周 | `stage` | 训练日变化 | 时长变化 | 强度变化 | 无反馈数据时的行为 | 状态 |
|---:|---|---|---|---|---|---|
| 1 | `adaptation` | 使用基础训练日数 | 使用用户选择时长，不额外增加 | 轻到中等；初学者优先轻 | 建立规律和动作适应 | `product_draft` |
| 2 | `stable_completion` | 不增加 | 不增加 | 不增加 | 复现第 1 周可完成结构 | `product_draft` |
| 3 | `controlled_progression` | 最多增加 1 个轻活动日 | 或主要活动最多增加 5 分钟 | 不自动升级 | 缺少完成度/不适反馈时不得递进，保持第 2 周 | `product_draft` |
| 4 | `consolidation_review` | 不高于第 3 周 | 不高于第 3 周 | 不增加 | 巩固、恢复、记录反馈 | `product_draft` |

第 3 周的“增加 1 个轻活动日”和“增加 5 分钟”只能二选一，且不得超过用户可训练天数和单次时长。`5 分钟` 是待体育教师审核的产品参数，不是官方健康标准。

## 5. 排程与恢复参数

| 参数键 | 候选规则 | 状态 |
|---|---|---|
| `schedule.dayTypes` | `training | light_activity | recovery` | `product_draft` |
| `schedule.minimumRecoveryDaysPerWeek` | 1 | `product_draft` |
| `schedule.consecutiveModerateTrainingDayLimit` | 2 | `product_draft`，待体育教师审核 |
| `schedule.consecutiveResistanceSameFocusAllowed` | false | `product_draft` |
| `schedule.progressionRequiresFeedback` | `completionKnown && noDiscomfortReported` | `product_draft`；当前输入尚不存在 |
| `schedule.noFeedbackFallback` | `hold` | `product_draft` |
| `schedule.unsupportedEquipmentFallback` | 选择相同健康目的的徒手条目；无条目则降级为通用活动 | `product_draft` |

## 6. 目标一致性参数

以下只做输入一致性检查，不承诺目标可在 4 周实现：

| 条件 | 决策 | 状态 |
|---|---|---|
| `fat_loss` 且目标体重不低于当前体重 | `requires_clarification` | `product_draft` |
| `weight_gain` 且目标体重不高于当前体重 | `requires_clarification` | `product_draft` |
| `maintain` 但目标体重与当前体重不同 | `requires_clarification`；差异阈值保持 `null` | `null_pending_review` |
| 减脂目标导向目标 BMI `<18.5` | `requires_professional_guidance` | 成人分类有官方依据；决策待医生确认 |
| 增重目标导向目标 BMI `>=28.0` | `requires_professional_guidance` | 成人分类有官方依据；决策待医生确认 |
| 没有目标体重 | 允许非体重承诺型方案；不得计算变化速度 | `product_draft` |

## 7. 五类目标参数

| 目标 | 训练类别优先级 | 饮食模式 | 作息侧重 | 自动递进限制 |
|---|---|---|---|---|
| `fat_loss` | `aerobic > strength > mobility` | 平衡、多样、少油盐糖；不算热量缺口 | 规律睡眠、避免以熬夜换运动 | 不以惩罚性运动抵消饮食 |
| `muscle_gain` | `strength > aerobic_maintenance > mobility` | 每餐关注一般蛋白质来源类别，同时保留谷薯蔬果 | 恢复优先 | 无完成反馈不增加负荷；不推荐补剂/激素 |
| `weight_gain` | `strength > light_aerobic > mobility` | 规律三餐、营养密度与食物多样 | 规律作息 | 不承诺增重速度，不以高糖高油为默认 |
| `maintain` | `balanced_aerobic_strength_mobility` | 维持多样与规律 | 保持现有节律 | 默认保持，不主动增加总量 |
| `fitness_improvement` | `aerobic + strength + mobility` | 一般平衡膳食 | 规律与恢复 | 不默认高强度间歇或竞技阈值 |

类别优先级是候选目录排序规则，不等于具体动作、组数、次数或负荷；这些必须由已审核运动目录提供。

## 8. 审核签署表

| 审核角色 | 必审内容 | 当前状态 |
|---|---|---|
| 医生/运动医学 | 适用年龄、安全闸门、目标一致性、停止提示 | `pending` |
| 体育教师/社会体育指导员 | 日程、递进、恢复、动作目录、强度表达 | `pending` |
| 注册营养师 | 五目标饮食差异、份量表达、营养数据边界 | `pending` |
| 北航主管部门 | 场地、食堂、开放与供应信息 | `pending` |
| 产品/法务/合规 | 免责声明、隐私、服务类目和展示语言 | `pending` |

