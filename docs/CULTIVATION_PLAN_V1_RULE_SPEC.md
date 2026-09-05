# FitFlight 培养方案 V1 规则规格（设计草案）

状态：`draft`  
规则版本候选：`fitflight-cultivation-v1-draft.2`  
核实日期：2026-08-31  
适用范围：画像完整、年满 18 周岁、未报告明确运动限制的一般成年人。  
重要声明：本文是产品与数据设计，不代表已经通过医学、营养或专业运动审查；不得用于诊断、治疗、康复处方或替代专业意见。

## 0. 当前运行草案审计

当前 `cloudfunctions/trainingPlan/plan-generator.js` 声明：

- `RULE_VERSION=fitflight-general-guidance-v1-draft.1`；
- `GENERATOR_VERSION=fitflight-generic-v1`。

它实际执行的逻辑：

1. 检查画像存在、状态为 `complete` 且关联当前 `profileVersion`；
2. `exerciseLimitationStatus` 不是 `none` 时停止生成；
3. 固定生成从当天开始的 7 个日切片，但元数据写作 4 周；
4. 将用户可训练天数直接安排为前 N 个连续训练日，其余为休息日；
5. 只按第一个运动偏好或增肌目标，在少量硬编码活动文案中选一项；
6. 将单次时长按约 20%/60%/20% 拆为准备、主体和放松；
7. 生成固定的三餐结构文案和一条通用作息提示，不计算热量；
8. 训练后调用独立北航资源匹配器，并保存资源匹配快照。

它缺少：成人年龄闸门、疼痛/损伤/术后/医生禁运动等安全输入、目标方向和速度检查、完整 4 周周期、训练/轻活动/恢复排程、恢复间隔、五目标完整政策、配置化参数、总体方案摘要、目录审核门槛和专业审核记录。当前连续安排前 N 个训练日、固定活动映射、时长比例、三餐文案均没有形成可审核规则依据。

可以保留的设计边界：

- 画像与身体档案版本一致性检查；
- `exerciseLimitationStatus=unsure/has_limitation` 时不生成；
- “仅供健康管理参考，医疗问题请咨询专业医生”；
- 健康任务先生成、北航资源后匹配；
- 只允许满足验证条件的 `verified` 资源作为明确推荐；
- 无已核实资源时安全降级；
- 方案保存 `profileVersion/portraitVersion/resourceDataVersion` 和资源快照。

本设计不修改或追认当前运行草案。`fitflight-cultivation-v1-draft.2` 与当前运行规则是两个不同版本；完成专业审核和第二轮实现前不得把候选规则标记为 `reviewed/active`。

## 1. 整体架构

```text
bodyProfile + userPortrait
          │
          ▼
  安全闸门（先于任何推荐）
          │
     ┌────┴──────────────┐
     │可生成             │超出 V1
     ▼                   ▼
health_rule_sets     requires_professional_guidance
     │
     ├─ exercise_catalog ──> 4 周健康安排（做什么）
     ├─ meal_pattern_catalog -> 膳食结构（怎么搭配）
     └─ sleep policy ───────> 作息结构（何时休息）
                 │
                 ▼
       独立资源匹配器（在哪里）
       ├─ campus_venues
       └─ campus_food_options
                 │
                 ▼
          不可变生成快照
                 │
                 ▼
        今日方案 display contract
```

架构约束：

- 健康规则只引用能力标签、食物组标签和通用动作，不引用北航地点名、食堂名或窗口名。
- 资源匹配只决定候选地点，不改变频率、时长、强度、膳食结构或安全边界。
- 无资源候选时仍生成健康安排，并返回通用替代方式和 `resourceMatchStatus: "no_match"`。
- 规则、运动目录、膳食模板、场地和食堂数据分别版本化；生成时复制采用内容到方案快照。
- `dailyRecord` 始终与 `plan` 分离，用户记录不得覆盖推荐方案。

## 2. 权威规则来源登记

以下仅为规则摘要，不复制原文。链接均在 2026-08-31 核实可定位到发布机构页面。

| sourceId | 来源名称 | 发布机构 | 发布时间/版本 | 适用人群 | FitFlight 采用原则 | 不适用范围 | 原始链接 |
|---|---|---|---|---|---|---|---|
| `cn-dietary-guidelines-2022` | 中国居民膳食指南（2022） | 中国营养学会；国家卫健委官方发布信息确认 2022 版 | 2022-04-26，第五版 | 一般人群及分人群指南；V1 仅采用一般成年人原则 | 食物多样、合理搭配；蔬果、全谷、奶类、大豆与适量鱼禽蛋瘦肉；少盐少油、控糖限酒；规律进餐与饮水；不根据菜名猜测热量 | 个体疾病营养治疗、过敏处置、孕产妇、未成年人、老年特殊营养需求 | https://dg.cnsoc.org/；https://www.nhc.gov.cn/xcs/c100122/202206/d4941efa5d6544e2abac68127c3238c0.shtml |
| `national-fitness-guide-2017` | 全民健身指南 | 国家体育总局 | 2017-08-10 发布；2018-07-20 推广应用通知 | 一般大众科学健身 | 运动应有准备、主要活动和放松结构；按个体条件选择项目并循序渐进；强度、时间和频率组合配置 | 医疗康复、损伤治疗、竞技训练处方、需要专业监护的人群 | https://www.sport.gov.cn/whzx/n5588/c900457/content.html；https://www.sport.gov.cn/n315/n20001395/c20026015/content.html |
| `healthy-china-action-2019-2030` | 健康中国行动（2019—2030年） | 健康中国行动推进委员会；国家卫生健康委员会发布 | 2019-07-09 印发，2019-07-15 发布 | 全人群公共健康行动，包含一般健康成年人建议 | 合理膳食、全民健身、健康素养、主动记录健康状况；坚持适度量力和生活方式综合管理 | 不作为个体诊断、治疗或精确运动处方依据 | https://www.nhc.gov.cn/guihuaxxs/c100133/201907/2a6ed52f1c264203b5351bdbbadd2da8.shtml |
| `weight-management-principles-2024` | 体重管理指导原则（2024年版） | 国家卫生健康委办公厅 | 国卫办医急函〔2024〕469号，2024-12-05 | 医疗卫生人员开展人群体重管理；含成年人及特殊人群章节 | 成年人体重分类参考；合理膳食、适量运动、睡眠和自我监测综合管理；一般健康体重维持参考每周至少 150 分钟中等强度有氧和 2–3 次抗阻；风险人群转专业指导 | 药物、手术、疾病治疗；超重肥胖医疗干预数值和特殊人群不能直接套用为普通用户自动处方 | https://www.nhc.gov.cn/wjw/ylyjs/202412/b3d40e0141834897808ce6c9dce76a60.shtml；https://www.nhc.gov.cn/wjw/ylyjs/202412/b3d40e0141834897808ce6c9dce76a60/files/1736390749000_59785.pdf |

补充说明：`中国居民膳食指南（2022）` 的政府页面摘要可交叉核对八项原则：https://wjw.fujian.gov.cn/ztzl/jkjy/jkzgxd/202206/t20220615_5930367.htm 。它是省级卫健委转载的中国疾控中心内容，不替代中国营养学会主站和国家卫健委发布信息。

## 3. 用户字段到规则输入的映射

| 规则输入 | 当前真实字段 | 来源/计算 | 当前是否存在 | V1 用途与限制 |
|---|---|---|---:|---|
| 年龄 | `body_profiles.birthDate` | 生成时按本地日期服务端计算完整周岁 | 是 | 仅用于成人范围闸门；不持久化重复年龄值 |
| 性别 | `body_profiles.gender` | 用户填报，`male/female/other` | 是 | 当前仅用于摘要和未来审核边界，不据此推断体成分或疾病 |
| 身高 | `body_profiles.heightCm` | 用户填报 | 是 | 与当前体重/目标体重计算 BMI 参考值 |
| 当前体重 | `body_profiles.weightKg` | 用户填报 | 是 | 体重目标方向、一致性与 BMI 参考 |
| 目标体重 | `body_profiles.targetWeightKg` | 用户选填 | 是 | 可空；无目标日期，不能计算速度或承诺 4 周达成 |
| BMI | `user_portraits.calculatedMetrics.bmi.value` | 云端由身高和当前体重计算 | 是 | 成人分类参考，不代表体脂率、肌肉量或诊断 |
| 目标 BMI | 无持久化字段 | 规则端由目标体重和身高临时计算 | 可派生 | 仅做保守目标一致性检查，不写成用户健康结论 |
| 当前活动水平 | `body_profiles.activityLevel` | 用户填报 | 是 | 用于初始安排保守程度；枚举见数据字典 |
| 培养目标 | `user_portraits.trainingGoal.value` | 用户填报 | 是 | 五目标策略选择 |
| 每周可训练天数 | `trainingConditions.availableDaysPerWeek.value` | 用户填报，`1..7` | 是 | 计划上限，不代表必须排满；至少保留恢复日 |
| 单次可训练时长 | `trainingConditions.sessionDurationMinutes.value` | 用户填报，`20/30/45/60` | 是 | 每次总时长上限 |
| 训练经验 | `trainingConditions.experienceLevel.value` | `none/beginner/experienced` | 是 | 强度上限、动作目录筛选和递进资格 |
| 可用器材 | `trainingConditions.equipmentAccess.value` | `bodyweight/basic_equipment/gym` | 是 | 运动目录筛选；器材不足不得硬配动作 |
| 喜欢的运动 | `trainingConditions.exercisePreferences.value[]` | 固定枚举 | 是 | 兼容性排序，不覆盖安全和恢复规则 |
| 校区 | `user_portraits.campus.value` | `xueyuan_road/shahe/unknown` | 是 | 仅用于资源匹配，不改变健康任务 |
| 运动限制 | `safetyConditions.exerciseLimitationStatus.value` | `none/unsure/has_limitation` | 是 | `unsure/has_limitation` 均阻止自动生成 |
| 疼痛/损伤 | 无 | 未来明确问卷 | 否 | 缺失前不能将用户默认视为安全 |
| 术后恢复 | 无 | 未来明确问卷 | 否 | 报告为是时阻止自动生成 |
| 医生要求避免运动 | 无 | 未来明确问卷 | 否 | 报告为是时遵医嘱并阻止自动生成 |
| 孕产/特殊状态 | 无 | 未来明确问卷 | 否 | V1 普通成人规则不覆盖 |
| 医疗目的/进食异常 | 无自由文本或问卷字段 | 未来显式输入 | 否 | 报告时转专业指导，不推断疾病 |
| 完成度/不适反馈 | 未来 `dailyRecord` | 用户执行后记录 | 否 | 第 3 周递进前置条件；缺失时保持，不递进 |

当前安全输入不完整是发布阻塞项：在疼痛、损伤、术后、医生限制等字段补齐并经专业审核前，完整 V1 规则集不得进入 `reviewed/active`。新增输入必须独立校验，不能接受前端传入 BMI、归属身份、规则版本或资源数据版本。

## 4. 安全闸门

安全闸门输出：

```js
{
  decision: 'eligible' | 'requires_professional_guidance' | 'data_conflict',
  stableCode: '',
  userMessage: '',
  reviewTags: []
}
```

按顺序短路：

| 条件 | 稳定码 | 行为 |
|---|---|---|
| 身体档案或画像缺失/过期 | `PROFILE_OR_PORTRAIT_INCOMPLETE` | 不生成，提示补全或更新 |
| 根据出生日期生成时未满 18 周岁 | `MINOR_OUT_OF_V1_SCOPE` | `requires_professional_guidance`，不套用成年人规则 |
| 生成时年龄达到 V1 配置上限之外 | `AGE_GROUP_OUT_OF_V1_SCOPE` | 不套用普通成人规则；不表示用户不能运动 |
| `exerciseLimitationStatus=unsure` | `LIMITATION_REQUIRES_CLARIFICATION` | 不生成运动处方，提示先咨询医生或专业人士 |
| `exerciseLimitationStatus=has_limitation` | `LIMITATION_REQUIRES_PROFESSIONAL_GUIDANCE` | 不生成运动处方或康复建议 |
| 报告疼痛、损伤或处于恢复期 | `PAIN_INJURY_OR_RECOVERY_OUT_OF_SCOPE` | 不推断原因，不生成替代治疗动作，提示专业评估 |
| 术后恢复、医生要求避免运动或其他明确医疗限制 | `MEDICAL_RESTRICTION_OUT_OF_SCOPE` | 遵从专业意见，不生成个性化训练或饮食方案 |
| 孕产、进食异常、疾病、用药或其他医疗目的 | `MEDICAL_REQUEST_OUT_OF_SCOPE` | 不诊断、不治疗，提示医生/营养师等专业咨询 |
| 上述安全问题未回答或状态不完整 | `SAFETY_SCREENING_INCOMPLETE` | 不把缺失当作否，不生成成功方案 |
| 目标与当前/目标体重方向冲突 | `GOAL_DIRECTION_CONFLICT` | 先让用户澄清，不擅自修改目标 |
| 目标体重换算目标 BMI 触发规则集中的保守边界，或用户明确要求激进变化 | `AGGRESSIVE_OR_IMPLAUSIBLE_TARGET` | 不承诺达成，不生成热量缺口、速度或惩罚性运动；提示专业评估 |
| 请求的 `profileVersion/portraitVersion` 与服务端当前版本不一致 | `INPUT_VERSION_CONFLICT` | 返回冲突，不生成或覆盖任何方案 |
| 规则、目录或资源 manifest 缺少版本/审核状态不允许 | `DATA_VERSION_NOT_ELIGIBLE` | 失败并保留旧方案 |

闸门必须按“数据完整性与版本 → 年龄范围 → 医疗/限制 → 目标一致性 → 规则数据资格”顺序短路。同一次评估可记录全部 `reviewTags`，但用户消息只给出最重要、可行动且不构成诊断的说明。

目标合理性阈值必须在规则集配置中集中定义。成人 BMI 分类可引用官方边界，但它不能单独诊断健康状态；“4 周目标变化幅度”和“每周安全变化速度”在医生/营养师审查前保持 `null`，生成器不得自行推断。具体参数及审核状态见 `docs/CULTIVATION_PLAN_V1_RULE_PARAMETERS.md`。

## 5. 规则流程

1. 读取当前用户身体档案与画像，并在同一生成事务语义下记录版本。
2. 运行安全闸门；非 `eligible` 时返回稳定状态，不创建成功方案内容。
3. 固定读取一个 `healthRuleSetVersion` 和相容的运动/膳食目录版本。
4. 将目标映射为 4 周训练侧重和膳食模式，不计算医疗营养处方。
5. 根据经验、可用天数、单次时长、偏好和器材，从运动目录筛选能力需求相容的项目。
6. 先安排休息与恢复，再按“持续时间 → 频率 → 强度”顺序渐进。
7. 为每日生成 `plannedExercise`、`recommendedMeals` 和 `recommendedSleep`。
8. 独立调用资源匹配器；失败只降低为通用替代，不回滚健康方案。
9. 生成包含所有版本和候选资源的不可变快照。
10. 输出到现有今日方案契约；实际记录继续由未来 `dailyRecord` 边界处理。

## 6. 五类目标差异

以下是 V1 产品草案，必须经体育教师、医生和营养师共同审查后才能标记 `reviewed`。

| 目标 | 适用条件 | 不适用/先澄清 | 训练重点 | 饮食原则 | 作息原则 | 递进、保持、降级或停止 | 不得计算/承诺 |
|---|---|---|---|---|---|---|---|
| `fat_loss` | 成人范围内、目标方向与体重一致、安全问卷完整 | 目标体重不低于当前体重；目标导向明显低体重；医疗性减重需求 | 有氧基础、抗阻维持、灵活性；先建立规律 | 食物多样、合理搭配，减少高油高糖高盐选择；不以挨饿作为默认 | 规律作息，避免熬夜后强行训练 | 无反馈时保持；不适时降级/停止；第 3 周最多执行一项已审核增量 | 热量缺口、体脂变化、4 周减重承诺、惩罚性运动 |
| `muscle_gain` | 目标为提升一般力量/肌肉能力且器材/动作条目相容 | 要求补剂、激素、竞技增肌或现有伤痛限制 | 抗阻优先、有氧维持、灵活性；同焦点非连续安排 | 关注一般蛋白质来源类别，同时保持谷薯、蔬果等多样 | 恢复与规律睡眠优先 | 完成且无不适才允许候选增量；技术/器材不满足则降级动作 | 肌肉量、精确蛋白质、负荷百分比、增肌速度 |
| `weight_gain` | 目标方向一致且经安全闸门判断不需营养评估 | 当前体重过低、目标导向肥胖、进食异常或医疗目的 | 保守抗阻、轻量有氧和灵活性 | 规律三餐、营养密度和食物多样；需要精确方案时转营养师 | 规律作息与恢复 | 默认保持保守训练；不适/食欲或体重问题需专业评估 | 能量盈余、精确份量、增重速度，不以高糖高油为默认 |
| `maintain` | 当前目标是维持一般健康习惯 | 同时填写明显不同的目标体重需先澄清 | 有氧、力量、灵活性均衡，贴近现有可执行水平 | 维持多样、规律和适量 | 维持稳定睡眠—觉醒节律 | 默认不增加总量；中断或不适时降级 | “保持”所需精确热量、体成分变化 |
| `fitness_improvement` | 一般体能、规律和综合活动能力目标 | 竞技达标、疾病康复或高强度专项需求 | 有氧、基础力量、灵活性均衡 | 一般平衡膳食和规律进餐，不做体重导向限制 | 规律作息与训练恢复协调 | 时长→频率→强度；V1 不自动进入高强度 | VO₂max、竞技阈值、心肺诊断、保证提升幅度 |

所有目标共同停止条件：出现疼痛、胸闷、明显气促、眩晕、损伤或医生要求停止时，终止当天任务并寻求专业帮助。文案只提示行动，不判断症状原因。

## 7. 配置化 4 周周期

所有数值仅存在于 `health_rule_sets.cycleConfig`，页面和分支不得硬编码。

| 周 | 阶段 | 初学者变化顺序 | 默认策略草案 |
|---|---|---|---|
| 1 | 建立规律和动作适应 | 建立可完成结构 | 训练日、轻活动日、恢复日齐全；不超过用户可训练天数和时长；初学者优先轻强度 |
| 2 | 稳定完成 | 先稳定再变化 | 复现第 1 周结构，不自动增加时长、频率或强度 |
| 3 | 安全范围内适度递进 | 时长 → 频率 → 强度 | 只有完成度已知且未报告不适时，才按配置执行一项递进；无反馈时保持第 2 周 |
| 4 | 巩固、恢复和回顾 | 不继续叠加 | 总量不高于第 3 周；保留恢复并记录反馈，为下一周期重新评估 |

每次训练统一结构：

- `preparation`：准备活动；
- `main`：主要活动；
- `cooldown`：放松活动。

每周先预留恢复日，再按用户可训练日和目标安排 `training`，其余可用日可安排 `light_activity`；不得简单把前 N 天连续排为训练日。中等训练日连续上限、同焦点抗阻恢复间隔和第 3 周增量全部来自配置。当前缺少完成度/不适反馈输入时，第 3 周必须执行 `hold`，不能假定用户适合递进。

配置必须包含：每周目标分钟参考、训练日上下限、单次时长选项、阶段变化、相邻活动日恢复约束、初学者增量、强度上限和目标差异覆盖。所有草案数值均带 `reviewStatus: draft` 和待审查说明，详见规则参数表。

## 8. 独立资源匹配算法

### 场地匹配

输入：

```js
{
  campus,
  requiredCapabilities,
  requiredEquipment,
  preferredIndoorOutdoor,
  desiredTimeWindow,
  resourceDataVersion
}
```

流程：

1. 只读取 `status=verified` 且 `validUntil >= planDate` 的资源；draft/preview 数据不得面向用户显示为可用地点。
2. 按校区过滤。
3. `requiredCapabilities` 必须全部满足；器材需求必须满足或允许无器材替代。
4. 检查开放星期、时间、预约和身份限制；信息不完整的记录进入 `needs_confirmation`，不能显示“当前开放”。
5. 室内外偏好是软排序，不改变健康动作。
6. 返回最多若干候选及匹配原因；无候选返回 `genericAlternative`。

### 饮食资源匹配

输入：`campus + mealPeriod + requiredFoodGroupTags + supplyDate + resourceDataVersion`。

流程：按已核实状态、校区、餐别、供应状态过滤，再以覆盖食物组标签数量排序。`estimatedKcal=null` 的菜品可以参与类别匹配，但页面不得显示精确热量或参与热量求和。

资源匹配器不得写死地点名称，也不得修改健康规则输出。

## 9. 数据来源与审核机制

审核状态统一为：

- 规则和通用目录：`draft | reviewed | retired`；
- 校园资源：`draft | pending_verification | verified | stale | retired`；
- Excel 调查状态可使用中文映射，但导入前必须转换为稳定枚举。

审核要求：

- 权威健康规则至少记录发布机构、原始链接、版本、摘要、适用与不适用范围、核实日期。
- 运动条目必须由体育教师或运动专业人员审查安全标签、经验等级与动作结构。
- 膳食模板必须由注册营养师或等价专业人员审查；禁止“燃脂、排毒、治愈”等夸大描述。
- 北航资源需来自学校官网、主管部门、现场公告或负责人确认；论坛和口述只能作为待核实线索。
- `verifiedAt` 到期后转 `stale`，不能继续宣称开放或供应。
- 每次数据变更产生新 `resourceDataVersion`，禁止原地重写历史版本。

## 10. 总体方案、每日方案与不可变快照

“我的方案”消费 `summary/cycle.weeks`；“培养”页面从同一 `dailyPlans[]` 按日期取当天切片。两处不得分别调用规则重新计算。

```js
{
  planId: '',
  schemaVersion: '1.1.0-draft',
  planStatus: 'draft',
  ruleVersion: 'fitflight-cultivation-v1-draft.2',
  ruleReviewStatus: 'draft',
  generatorVersion: 'unimplemented-for-reviewed-v1',
  portraitVersion: 0,
  profileVersion: 0,
  resourceDataVersion: 'buaa-resource-pending.1',
  catalogVersions: {
    exerciseCatalog: 'exercise-catalog-draft.1',
    mealPatternCatalog: 'meal-pattern-draft.1'
  },
  summary: {
    planName: '',
    goal: 'fitness_improvement',
    startDate: 'YYYY-MM-DD',
    endDate: 'YYYY-MM-DD',
    totalWeeks: 4,
    currentStage: 'adaptation',
    trainingDaysPerWeek: 3,
    expectedSessionDurationMinutes: 30,
    trainingFocus: [],
    weeklyStructureOverview: [],
    nutritionPrinciples: [],
    sleepPrinciples: [],
    safetyNotices: [],
    reviewDate: 'YYYY-MM-DD'
  },
  cycle: {
    totalWeeks: 4,
    weeks: [
      {
        weekNumber: 1,
        stage: 'adaptation',
        startDate: 'YYYY-MM-DD',
        endDate: 'YYYY-MM-DD',
        plannedTrainingDays: 0,
        plannedLightActivityDays: 0,
        plannedRecoveryDays: 0,
        focus: [],
        progressionDecision: 'hold'
      }
    ]
  },
  dailyPlans: [
    {
      date: 'YYYY-MM-DD',
      cyclePosition: { weekNumber: 1, dayOfWeek: 1, stage: 'adaptation' },
      dayType: 'training',
      plannedExercise: {
        taskSummary: '',
        totalDurationMinutes: 30,
        intensity: 'light',
        intensityDescription: '',
        items: [
          {
            itemId: '',
            section: 'preparation',
            exerciseId: '',
            title: '',
            durationMinutes: null,
            sets: null,
            reps: null,
            description: ''
          }
        ],
        safetyNotices: []
      },
      nutrition: {
        principles: [],
        recommendedMeals: { breakfast: [], lunch: [], dinner: [] },
        estimatedTargetKcal: null,
        disclaimer: ''
      },
      recommendedSleep: {
        bedtime: null,
        wakeTime: null,
        durationMinutes: null,
        principles: [],
        tips: []
      },
      completionTemplate: {
        sections: ['exercise', 'nutrition', 'sleep'],
        completedItemIds: []
      },
      resourceMatches: {
        venues: [],
        foodOptions: [],
        venueFallback: { status: 'no_match', displayText: '暂无已核实地点', genericConditionText: '可在满足条件的安全场所完成' },
        foodFallback: { status: 'no_match', displayText: '暂无已核实菜品' },
        dataPendingVerification: false
      },
      ruleVersion: 'fitflight-cultivation-v1-draft.2',
      profileVersion: 0,
      portraitVersion: 0,
      resourceDataVersion: 'buaa-resource-pending.1'
    }
  ],
  safetyDecision: { decision: 'eligible', reviewTags: [] },
  sourceIds: [],
  generatedAt: null
}
```

状态分层：

- 规则/目录审核状态：`draft | reviewed | retired`；
- 方案生命周期状态：`draft | active | outdated | archived | generation_failed`；现有状态机还包含 `none/pending_confirmation/generating/generator_not_configured`；
- `reviewed` 规则生成成功后，方案才可从生成中切换为 `active`；draft 规则只能产生测试快照，不能发布给正式用户。

`completionTemplate` 只是计划内可完成项定义；用户实际完成情况继续存入独立 `dailyRecord`，不得回写或覆盖 `dailyPlans`。

保存约束：`summary/cycle/dailyPlans/resourceMatches` 是同一次生成的不可变快照；后续规则、画像或资源更新不联表动态替换旧方案。只有用户明确触发重新生成并产生新 `planId` 时才能采用新版本。当前已经生成的方案不因本轮文档设计改变。

## 11. JSON 迁移到云数据库的条件

满足以下条件前保持版本控制 JSON：

1. V1 规则经医生、营养师和体育教师书面审查并从 `draft` 改为 `reviewed`；
2. 数据字典、唯一键、枚举、JSON Schema 和交叉引用测试稳定；
3. 北航资源调查确定责任部门、核实人、核实周期和过期策略；
4. 明确集合权限、索引、审计日志、版本发布与回滚方式；
5. 生成器能按固定 manifest 读取不可变版本，且有历史快照回归测试；
6. 隐私、服务类目和健康免责声明通过产品及合规审查；
7. 获得用户明确批准后，另起实施任务创建集合和导入工具。

## 12. 北航资料人工调查

使用 `docs/北航培养资源调查表.xlsx` 收集，字段规则见 `docs/北航培养资源调查表说明.md`。调查顺序：学校官网/部门公告 → 场馆或食堂现场公告 → 负责人确认 → 其他线索。无法取得可靠依据时保持空白或标记 `待核实`，不得推测开放时间、菜品、价格或营养值。

## 13. 第二轮预计修改文件与最小实施顺序（本轮不修改）

1. **冻结设计版本**：将专业审核后的规则参数和目录复制为新的不可变版本；draft 仍留作历史，不原地改为 reviewed。
2. **补齐安全输入**：预计修改 `cloudfunctions/userPortrait/portrait-config.js`、`validator.js`、`portrait-builder.js`、前端画像常量/service/编辑页，增加经审核的显式安全问卷字段；不得使用自由文本做医学推断。
3. **安全闸门先行**：在 `cloudfunctions/trainingPlan/` 新增 `safety-gate.js` 和纯函数测试；所有不合格输入必须在目录选择前短路。
4. **规则加载与资格检查**：新增 `rule-loader.js`，固定读取一个 `reviewed` 规则版本及相容目录版本；null 参数和 draft 状态直接失败。
5. **纯健康排程**：新增 `cycle-planner.js`、`goal-policy.js`、`exercise-selector.js`、`meal-policy.js`、`sleep-policy.js`；不得引用北航地点名或食堂名。
6. **独立资源匹配**：复用或替换现有 `resource-matcher.js`，输入只接收健康任务需要的能力/食物组标签和版本；无候选只返回降级。
7. **快照组装与校验**：新增 `plan-snapshot.js` 和 schema 校验；`plan-generator.js` 仅编排这些模块，替换当前临时 7 日逻辑。
8. **读取契约**：预计修改 `services/training-plan-service.js`、`services/today-plan-service.js`，让“我的方案”和“培养”读取同一份快照。
9. **页面实现另行授权**：预计修改 `pages/my-plan/` 展示总体摘要、`pages/cultivation/` 展示当天切片；本轮不实施。
10. **回归与迁移**：新增安全闸门、目标差异、周期、恢复、资源降级、版本冲突和旧快照不变测试；验证后再决定是否部署。

预计还会更新 `constants/` 的稳定状态码与字段枚举，以及 `docs/TRAINING_PLAN_DATA.md` 的最终集合契约。实现时仍不得把北航地点写入健康规则模块，不得覆盖当前已生成方案。

## 14. 自动测试清单

- 安全闸门：缺失、未成年、限制不明/存在、医疗意图、激进目标、版本冲突；
- 规则版本：所有阈值来自单一规则集，无页面或条件分支散落常量；
- 目标规则：三个主要目标和两个保守目标的差异与禁止项；
- 周期：固定 4 周、准备/主要/放松齐全、初学者按时长→频率→强度顺序；
- 恢复：连续高负荷日和强度上限测试；
- 资源：能力标签全包含、开放时间、预约限制、过期记录排除；
- 降级：无场地/无食堂候选不导致健康方案失败；
- 营养：`nutritionSource` 缺失时 `estimatedKcal` 必须为 `null`；
- 解耦：替换校区或资源版本不改变相同输入下的健康安排；
- 快照：资源更新后旧 plan JSON 完全不变；
- 契约：输出可转换为 `constants/today-plan.js`，推荐与实际记录不混合；
- JSON：Schema、枚举、唯一 ID、引用完整性、日期格式、状态流；
- 安全语言：不出现诊断、治疗承诺、快速减重或夸大营养描述。

## 15. 必须由专业或学校部门确认的内容

- 医生/运动医学人员：安全闸门、成人适用范围、停止运动警示、体重目标不合理边界；
- 注册营养师：目标间膳食差异、份量表达、是否以及何时可显示热量、过敏与特殊饮食边界；
- 体育教师/社会体育指导员：运动目录、强度分级、4 周渐进幅度、动作替代、恢复间隔；
- 北航体育场馆主管部门：场地名称、位置、能力、器材、开放/预约/身份/收费及临时关闭机制；
- 北航后勤及食堂管理部门：食堂名称、楼层、供餐时间、清真信息、窗口与菜品供应；
- 产品/法务/合规：健康免责声明、隐私、特殊服务类目和上线审核要求。

在上述审查完成前，专业规则集只能保持 `draft/preview`。当前生成器仅可输出带明确免责声明的保守通用健康管理建议；不得把草案包装为医疗建议，也不得让待核实北航资源成为具体地点或菜品推荐。
