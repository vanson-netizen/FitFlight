# FitFlight 培养方案 V1 数据字典（draft）

对应候选规则版本：`fitflight-cultivation-v1-draft.2`。当前运行规则 `fitflight-general-guidance-v1-draft.1` 不是本候选规则的已实现版本。

本字典对应 `docs/draft/seed-data/` 的 preview JSON。所有集合名是未来边界设计，不代表已经创建云数据库集合。

## 通用字段与枚举

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `schemaVersion` | string | 是 | JSON 结构版本 |
| `dataVersion` | string | 是 | 不可变数据发布版本 |
| `status` | enum | 是 | 规则/目录：`draft/reviewed/retired`；资源另见下文 |
| `sourceIds` | string[] | 是 | 指向权威来源登记或调查来源 |
| `reviewedBy` | object/null | 否 | 专业审核角色、姓名/标识、日期；draft 必须为 null |
| `notes` | string | 否 | 限制与待核实说明 |

稳定枚举：

- `campus`: `xueyuan_road | shahe | unknown`
- `goal`: `fat_loss | muscle_gain | fitness_improvement | weight_gain | maintain`
- `experienceLevel`: `none | beginner | experienced`
- `activityLevel`: `sedentary | light | moderate | active | very_active`
- `intensity`: `light | moderate | vigorous`；V1 初学者默认不自动选择 `vigorous`
- `dayType`: `training | light_activity | recovery`
- `cycleStage`: `adaptation | stable_completion | controlled_progression | consolidation_review`
- `indoorOutdoor`: `indoor | outdoor | mixed | unknown`
- `mealPeriod`: `breakfast | lunch | dinner | late_night`
- `resourceStatus`: `draft | pending_verification | verified | stale | retired`
- `nutritionSource.type`: `official_label | laboratory | supplier_document | school_official | none`
- `reviewStatus`: `draft | reviewed | retired`
- `planLifecycleStatus`: `draft | active | outdated | archived | generation_failed`；生成过程状态沿用现有 `none | pending_confirmation | generating | generator_not_configured`
- `safetyDecision`: `eligible | requires_professional_guidance | requires_clarification | data_conflict`

## health_rule_sets

| 字段 | 类型 | 必填 | 约束/用途 |
|---|---|---:|---|
| `ruleSetId` | string | 是 | 永久唯一 ID |
| `ruleVersion` | string | 是 | 每次规则变更产生新版本，不覆盖旧版本 |
| `status` | enum | 是 | `draft/reviewed/retired` |
| `authoritySources[]` | object | 是 | 来源名称、机构、URL、发布时间、采用摘要、适用/不适用范围、核实日期 |
| `applicablePopulation` | object | 是 | V1 年龄、画像完整性与限制状态边界 |
| `safetyGates` | object | 是 | 稳定码、优先顺序和转专业指导策略 |
| `cycleConfig` | object | 是 | 4 周阶段、频率、时长、增量、强度上限、恢复约束 |
| `goalPolicies` | object | 是 | 每个目标的侧重和禁止项 |
| `sleepPolicy` | object | 是 | 规律作息与时长表达；不得形成疾病治疗建议 |
| `reviewRequirements` | string[] | 是 | 正式发布前需完成的专业审查 |

所有阈值允许 `null` 表示“未审定，不得启用”。生成器不得为 null 阈值提供隐式默认值。

## rule_inputs

规则输入不是新的数据库集合，而是生成器从当前 `body_profiles` 和 `user_portraits` 组装的只读对象。

| 字段 | 类型 | 来源 | 必填 | 说明 |
|---|---|---|---:|---|
| `profileVersion` | integer | `body_profiles.profileVersion` | 是 | 必须与服务端当前版本一致 |
| `portraitVersion` | integer | `user_portraits.portraitVersion` | 是 | 必须为当前画像 |
| `birthDate` | date | `body_profiles.birthDate` | 是 | 服务端计算完整周岁 |
| `gender` | enum | `body_profiles.gender` | 是 | 不用于推断体成分或疾病 |
| `heightCm/currentWeightKg/targetWeightKg` | number/null | 身体档案 | 是 | 目标体重可空 |
| `bmi` | number | 云端画像计算值 | 是 | 只作成人分类参考 |
| `activityLevel` | enum | 身体档案 | 是 | 当前活动水平 |
| `goal/campus` | enum | 用户画像 | 是 | 校区只传给资源匹配器 |
| `availableDaysPerWeek/sessionDurationMinutes` | integer | 用户画像 | 是 | 日程上限 |
| `experienceLevel/equipmentAccess/exercisePreferences` | enum/array | 用户画像 | 是 | 目录筛选与排序 |
| `exerciseLimitationStatus` | enum | 用户画像 | 是 | 仅 `none` 可能继续 |
| `safetyScreening` | object | 未来显式问卷 | 是 | 疼痛、损伤、术后、医生限制等；当前缺失是发布阻塞项 |
| `executionFeedback` | object/null | 未来 dailyRecord 汇总 | 否 | 第 3 周递进；缺失时必须保持 |

详细字段映射和缺口见规则规格第 3 节。

## exercise_catalog

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `exerciseId` | string | 是 | 稳定唯一 ID |
| `name` | string | 是 | 通用运动名称，不含地点 |
| `category` | enum | 是 | `aerobic/strength/mobility/balance/recovery` |
| `applicableGoals` | goal[] | 是 | 可为空但不能缺失 |
| `experienceLevels` | enum[] | 是 | 可用经验等级 |
| `intensityOptions` | intensity[] | 是 | 条目允许强度 |
| `durationRangeMinutes` | object | 是 | `min/max`，待审查 |
| `equipmentTags` | string[] | 是 | 所需器材；徒手为 `bodyweight` |
| `requiredCapabilities` | string[] | 是 | 用于场地匹配，如 `walkable_route/open_space/strength_equipment` |
| `structure` | object | 是 | `preparation/main/cooldown`，均为通用结构描述 |
| `safetyTags` | string[] | 是 | 如 `low_impact/fall_risk/joint_load` |
| `sourceIds` | string[] | 是 | 权威来源或审核记录 |
| `reviewStatus` | enum | 是 | preview 必须为 `draft` |

## campus_venues

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `venueId` | string | 是 | 稳定 ID |
| `campus` | enum | 是 | 校区 |
| `name` | string | 是 | 调查确认前只能使用待核实占位名 |
| `capabilityTags` | string[] | 是 | 能力标签，不等同运动名称 |
| `equipmentTags` | string[] | 是 | 已确认器材 |
| `indoorOutdoor` | enum | 是 | 室内/室外 |
| `openingHours` | object[] | 是 | 星期、开始、结束；未知时空数组 |
| `reservation` | object | 是 | `required/method`，未知为 null |
| `usageRestrictions` | string[] | 是 | 身份、时段或其他限制 |
| `locationText` | string/null | 否 | 文字位置 |
| `coordinates` | object/null | 否 | 未来扩展，必须有可靠坐标来源 |
| `sourceIds` | string[] | 是 | 调查来源 |
| `verifiedAt` | date/null | 是 | 未核实必须 null |
| `validUntil` | date/null | 是 | 未核实必须 null |
| `status` | resourceStatus | 是 | preview 为 `draft/pending_verification` |

## meal_pattern_catalog

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `patternId` | string | 是 | 唯一 ID |
| `mealPeriod` | enum | 是 | 餐别 |
| `foodGroupCombination` | string[] | 是 | 食物类别组合，不是具体菜品 |
| `applicableGoals` | goal[] | 是 | 目标范围 |
| `portionExpression` | string | 是 | 一般份量语言，不使用医疗处方口吻 |
| `prohibitedClaims` | string[] | 是 | 禁止排毒、燃脂、治病等夸大描述 |
| `sourceIds` | string[] | 是 | 来源 |
| `reviewStatus` | enum | 是 | 样本为 draft |

## campus_food_options

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `foodOptionId` | string | 是 | 稳定 ID |
| `campus` | enum | 是 | 校区 |
| `diningHallName` | string | 是 | 待核实时使用占位名 |
| `floorOrStall` | string/null | 否 | 楼层/窗口 |
| `dishName` | string | 是 | 未调查时使用结构占位，不伪造实际菜品 |
| `mealPeriods` | enum[] | 是 | 餐别 |
| `foodGroupTags` | string[] | 是 | 类别匹配标签 |
| `nutrition` | object | 是 | `estimatedKcal` 及可选营养字段 |
| `nutritionSource` | object | 是 | 无可靠来源时 `type=none` 且 URL/null |
| `supplySchedule` | object[] | 是 | 未核实时空数组 |
| `verifiedAt` | date/null | 是 | 未核实为 null |
| `status` | resourceStatus | 是 | preview 不得 verified |

强制校验：`nutritionSource.type === "none"` 时，`nutrition.estimatedKcal` 必须为 `null`，所有其他精确营养数值也必须为 null。

## 资源 manifest 与版本

`resource-data-manifest.preview.json` 固定一组相容版本和内容哈希的未来扩展位。生成时保存 manifest 的 `resourceDataVersion`；历史 plan 快照只读自身候选，不动态查询最新地点或菜品。

## plan_snapshot

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `planId` | string | 是 | 不可变方案 ID |
| `schemaVersion` | string | 是 | 快照结构版本 |
| `planStatus` | planLifecycleStatus | 是 | 方案生命周期状态 |
| `ruleVersion/ruleReviewStatus/generatorVersion` | string/enum | 是 | 规则和生成器版本 |
| `profileVersion/portraitVersion` | integer | 是 | 生成时用户输入版本 |
| `resourceDataVersion` | string | 是 | 生成时资源版本 |
| `catalogVersions` | object | 是 | 运动与膳食目录版本 |
| `summary` | object | 是 | “我的方案”总体摘要 |
| `cycle` | object | 是 | 周期及每周结构 |
| `dailyPlans` | object[] | 是 | “培养”按日期读取的每日切片 |
| `safetyDecision` | object | 是 | 闸门结论与审核标签；仅 eligible 可形成成功正式快照 |
| `sourceIds` | string[] | 是 | 本次规则实际采用的权威来源 |
| `generatedAt` | datetime | 是 | 服务端生成时间 |

### `summary`

必须包含 `planName/goal/startDate/endDate/totalWeeks/currentStage/trainingDaysPerWeek/expectedSessionDurationMinutes/trainingFocus/weeklyStructureOverview/nutritionPrinciples/sleepPrinciples/safetyNotices/reviewDate`。其中 `currentStage` 是读取时可由日期定位的展示值；历史快照本身不因日期推进而改写。

### `cycle.weeks[]`

必须包含 `weekNumber/stage/startDate/endDate/plannedTrainingDays/plannedLightActivityDays/plannedRecoveryDays/focus/progressionDecision`。`progressionDecision` 使用 `hold | duration | frequency | intensity`；V1 draft 不自动选择 `intensity`。

### `dailyPlans[]`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `date/cyclePosition/dayType` | date/object/enum | 是 | 日期、周内位置和日类型 |
| `plannedExercise` | object | 是 | 任务、总时长、强度、分项和安全提示 |
| `nutrition` | object | 是 | 结构原则与推荐餐次；无来源数值保持 null |
| `recommendedSleep` | object | 是 | 规律作息原则；未审定具体时间/时长时为 null |
| `completionTemplate` | object | 是 | 可完成项定义，不保存实际完成情况 |
| `resourceMatches` | object | 是 | 已核实候选或明确降级文本的生成时快照 |
| `ruleVersion/profileVersion/portraitVersion/resourceDataVersion` | string/integer | 是 | 每日切片自描述版本，必须与顶层一致 |

`plannedExercise.items[]` 必须包含 `itemId/section/exerciseId/title/durationMinutes/sets/reps/description`。时长型活动允许 `sets/reps=null`；组次型动作允许 `durationMinutes=null`，但总时长仍必须可核对且来自已审查目录规则。

## displayModel 映射

- `summary/cycle.weeks[]` → “我的方案”总体方案；
- `dailyPlans[].plannedExercise` → 今日契约 `plannedExercise`；
- `dailyPlans[].nutrition.recommendedMeals` → `nutrition.recommendedMeals`；
- `dailyPlans[].recommendedSleep` → `recommendedSleep`；
- 未来真实完成数据仅进入 `dailyRecord.exerciseRecord/actualMeals/actualSleep`；
- `resourceMatches` 可作为页面的地点建议扩展，但不得覆盖健康安排。

“我的方案”和“培养”必须按同一 `planId` 读取同一快照；不得分别调用生成器临时计算。
