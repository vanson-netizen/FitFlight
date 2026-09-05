const MEAL_LABELS = Object.freeze({ breakfast: '早餐', lunch: '午餐', dinner: '晚餐', lateNight: '夜宵' })

function displayText(value) {
  if (value === null || value === undefined) return ''
  const text = String(value).trim()
  return /^(null|undefined)$/i.test(text) ? '' : text
}

function normalizeName(value) {
  // 仅统一空白和字符宽度，不把不同餐厅按所在建筑合并。
  return displayText(value).normalize('NFKC').replace(/\s+/g, '')
}

function mealPeriods(record) {
  return [...new Set([...(record.mealPeriods || record.mealTypes || []),
    ...Object.keys(record.mealPeriodText || {}).filter((key) => displayText(record.mealPeriodText[key]))])]
}

function hoursText(record) {
  return displayText(record.openHoursText) || Object.entries(record.mealPeriodText || {})
    .filter(([, value]) => displayText(value))
    .map(([key, value]) => `${MEAL_LABELS[key] || key} ${displayText(value)}`).join('；')
}

function effectiveFoodHours(food) {
  const own = [food.openHoursText, food.supplyDaysText].map(displayText)
    .find((value) => value && value !== '与食堂相同')
  if (own) return own
  // 父记录由接口按外键读取；再次校验 ID，绝不按名称或聚合卡片找时间。
  const parent = food.parentDiningHall
  return (food.diningHallId && parent && parent.diningHallId === food.diningHallId && hoursText(parent)) || '营业时间待确认'
}

function aggregateDiningHalls(records) {
  const groups = new Map()
  records.forEach((record) => {
    const name = normalizeName(record.name)
    const key = JSON.stringify([displayText(record.campus), displayText(record.insideOrOutsideCampus), name])
    if (!groups.has(key)) groups.set(key, {
      resourceId: `community-dining:${key}`, category: 'dining_hall', name,
      campus: record.campus, insideOrOutsideCampus: record.insideOrOutsideCampus,
      sourceDiningHallIds: [], floors: [], floorDetails: [], mealPeriods: [], openHoursByFloor: [],
      verificationStatus: record.verificationStatus, verifiedAt: record.verifiedAt, validUntil: record.validUntil
    })
    const group = groups.get(key)
    const id = record.diningHallId || record.resourceId
    const floor = displayText(record.floor === undefined ? record.floorOrWindow : record.floor)
    if (!group.sourceDiningHallIds.includes(id)) group.sourceDiningHallIds.push(id)
    if (floor && !group.floors.includes(floor)) group.floors.push(floor)
    group.floorDetails.push({
      diningHallId: id, floor: floor || null, locationText: record.locationText,
      openHoursText: record.openHoursText, mealPeriodText: record.mealPeriodText,
      mealPeriods: mealPeriods(record), halalAvailable: record.halalAvailable
    })
    group.openHoursByFloor.push({ diningHallId: id, floor: floor || null,
      openHoursText: record.openHoursText, mealPeriodText: record.mealPeriodText })
    group.mealPeriods = [...new Set([...group.mealPeriods, ...mealPeriods(record)])]
  })
  return [...groups.values()].map((group) => {
    const locations = [...new Set(group.floorDetails.map((floor) => displayText(floor.locationText)
      .replace(/\s*[（(]?\s*(?:B\d+|\d+|[一二三四五六七八九十]+)\s*(?:楼|层|F)\s*[）)]?\s*$/i, '').trim()).filter(Boolean))]
    return { ...group, mealTypes: group.mealPeriods, diningLocationText: locations[0] === group.name ? '' : locations[0] || '',
      verificationLabel: '人工整理、信息仅供参考' }
  })
}

function merchantCard(parent, foods) {
  const uniqueFoods = [...new Map(foods.map((food) => [food.resourceId, food])).values()]
  return {
    resourceId: `community-merchant:${parent.diningHallId}`, cardType: 'merchant',
    category: 'healthy_light_meal', diningHallId: parent.diningHallId,
    name: parent.name, campus: parent.campus, insideOrOutsideCampus: parent.insideOrOutsideCampus,
    diningLocationText: displayText(parent.locationText) || '线上外卖',
    openHoursText: parent.openHoursText,
    effectiveOpenHoursText: hoursText(parent).replace(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/g, '$1–$2') || '营业时间待确认',
    sourceFoodOptionIds: uniqueFoods.map((food) => food.resourceId),
    foodItems: uniqueFoods.map((food) => ({ ...food, effectiveOpenHoursText: effectiveFoodHours({ ...food, parentDiningHall: parent }) })),
    description: `提供：${[...new Set(uniqueFoods.map((food) => displayText(food.name)).filter(Boolean))].join('、')}`,
    mealTypes: [...new Set(uniqueFoods.flatMap(mealPeriods))],
    verificationStatus: parent.verificationStatus, verifiedAt: parent.verifiedAt, validUntil: parent.validUntil
  }
}

module.exports = { MEAL_LABELS, displayText, aggregateDiningHalls, effectiveFoodHours, merchantCard }
