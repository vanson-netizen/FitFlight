// 由 scripts/build-community-image-config.js 生成；修改集中清单后重新生成。
const PLACEHOLDER_IMAGE = '/assets/community/placeholder.svg'
const IMAGE_ENTRIES = Object.freeze([
  {
    "src": "/assets/community/community-home-sports.jpg",
    "ids": [],
    "home": "sport",
    "focus": [
      0.5,
      0
    ],
    "note": "保留三位跑者头部及动作，裁去底部道路"
  },
  {
    "src": "/assets/community/community-home-dining.jpg",
    "ids": [],
    "home": "food",
    "focus": [
      0.5,
      0.5
    ]
  },
  {
    "src": "/assets/community/community-home-forum.jpg",
    "ids": [],
    "home": "forum",
    "focus": [
      0.5,
      0.85
    ]
  },
  {
    "src": "/assets/community/venue-xueyuan-gym-179643f6a0.jpg",
    "ids": [
      "venue-xueyuan-gym-179643f6a0"
    ],
    "focus": [
      0.5,
      0.65
    ],
    "note": "保留坐姿及跑步人物头部"
  },
  {
    "src": "/assets/community/venue-xueyuan-gym-d8d6990026.jpg",
    "ids": [
      "venue-xueyuan-gym-d8d6990026"
    ],
    "focus": [
      0.5,
      0.6
    ],
    "note": "保留左侧器械后人物头部"
  },
  {
    "src": "/assets/community/venue-xueyuan-gym-34926a4072.jpg",
    "ids": [
      "venue-xueyuan-gym-34926a4072"
    ],
    "focus": [
      0.5,
      0.55
    ]
  },
  {
    "src": "/assets/community/venue-xueyuan-gym-7212bc20d5.jpg",
    "ids": [
      "venue-xueyuan-gym-7212bc20d5"
    ],
    "focus": [
      0.5,
      0.6
    ]
  },
  {
    "src": "/assets/community/venue-xueyuan-swimming-019329917c.jpg",
    "ids": [
      "venue-xueyuan-swimming-019329917c"
    ],
    "focus": [
      0.5,
      0.5
    ]
  },
  {
    "src": "/assets/community/venue-xueyuan-ball-sports-284873dc9d.jpg",
    "ids": [
      "venue-xueyuan-ball-sports-284873dc9d"
    ],
    "focus": [
      0.5,
      0.6
    ]
  },
  {
    "src": "/assets/community/venue-xueyuan-ball-sports-f36627c68a.jpg",
    "ids": [
      "venue-xueyuan-ball-sports-f36627c68a"
    ],
    "focus": [
      0.5,
      0.65
    ],
    "note": "CSV主馆；照片含环场观众席"
  },
  {
    "src": "/assets/community/venue-xueyuan-ball-sports-b69bcc106d.jpg",
    "ids": [
      "venue-xueyuan-ball-sports-b69bcc106d"
    ],
    "focus": [
      0.5,
      0.65
    ],
    "note": "CSV训练馆（副馆）；照片无看台、多片训练场"
  },
  {
    "src": "/assets/community/dining-xueyuan-hall-b96eba561e.jpg",
    "ids": [
      "dining-xueyuan-hall-b96eba561e"
    ],
    "focus": [
      0.5,
      0
    ],
    "note": "保留左上两位人物头部，不做居中裁剪"
  },
  {
    "src": "/assets/community/dining-xueyuan-hall-1f269a4cb6.jpg",
    "ids": [
      "dining-xueyuan-hall-1f269a4cb6"
    ],
    "focus": [
      0.5,
      0.7
    ],
    "note": "保留柜台后人员可见头部"
  },
  {
    "src": "/assets/community/dining-xueyuan-hall-e9ba17ae34.jpg",
    "ids": [
      "dining-xueyuan-hall-e9ba17ae34",
      "dining-xueyuan-hall-a171d7fc11"
    ],
    "focus": [
      0.5,
      1
    ],
    "note": "下对齐保留门前行人，裁去天空"
  },
  {
    "src": "/assets/community/dining-xueyuan-hall-4f5c07a4f2.jpg",
    "ids": [
      "dining-xueyuan-hall-4f5c07a4f2"
    ],
    "focus": [
      0.5,
      0.6
    ],
    "crop": [
      0,
      0.2,
      0.92
    ],
    "note": "裁去原图右边已不完整人物；保留中间顾客及工作人员头部"
  },
  {
    "src": "/assets/community/dining-xueyuan-hall-b3ae834b90.jpg",
    "ids": [
      "dining-xueyuan-hall-b3ae834b90",
      "dining-xueyuan-hall-131f02dc64",
      "dining-xueyuan-hall-52a647c53c"
    ],
    "focus": [
      0.5,
      1
    ],
    "note": "下对齐保留门前行人头部和动作"
  },
  {
    "src": "/assets/community/dining-xueyuan-hall-d519415fe8.jpg",
    "ids": [
      "dining-xueyuan-hall-d519415fe8"
    ],
    "focus": [
      0.5,
      0.2
    ],
    "note": "Crop upward to exclude the incomplete passerby at the original lower-left edge"
  },
  {
    "src": "/assets/community/food-xueyuan-option-bf22a4c884.jpg",
    "ids": [
      "food-xueyuan-option-bf22a4c884"
    ],
    "focus": [
      0.5,
      0.7
    ],
    "note": "只保留菜品区域，去掉顶部工作人员残影"
  },
  {
    "src": "/assets/community/food-xueyuan-option-af35c57c1a.jpg",
    "ids": [
      "food-xueyuan-option-af35c57c1a"
    ],
    "focus": [
      0.5,
      0.5
    ]
  },
  {
    "src": "/assets/community/merchant-xueyuan-road-manwei-light-meal.jpg",
    "ids": [
      "dining-xueyuan-road-manwei-light-meal"
    ],
    "focus": [
      0.75,
      0.3
    ],
    "crop": [
      0.42,
      0.12,
      0.58
    ],
    "note": "使用新商家图右侧餐品区域，排除原图无头人物与外卖平台操作栏"
  },
  {
    "src": "/assets/community/food-xueyuan-option-bd51c94c2f.jpg",
    "ids": [
      "food-xueyuan-option-bd51c94c2f"
    ],
    "focus": [
      0.5,
      0.75
    ],
    "note": "Confirmed by user: Heyi dining hall, floor 2; food content only, never merchant cover"
  }
])

const resourceImages = new Map(IMAGE_ENTRIES.flatMap((entry) => entry.ids.map((id) => [id, entry.src])))
const homeImages = new Map(IMAGE_ENTRIES.filter((entry) => entry.home).map((entry) => [entry.home, entry.src]))

function resourceImage(record) {
  if (record.cardType === 'merchant') return resourceImages.get(record.diningHallId) || PLACEHOLDER_IMAGE
  if (Array.isArray(record.sourceDiningHallIds)) {
    const covers = [...new Set(record.sourceDiningHallIds.map((id) => resourceImages.get(id)).filter(Boolean))]
    return covers.length === 1 ? covers[0] : PLACEHOLDER_IMAGE
  }
  return resourceImages.get(record.resourceId) || PLACEHOLDER_IMAGE
}

function homeImage(id) { return homeImages.get(id) || PLACEHOLDER_IMAGE }

// 首页缩短后，在保留 16:9 副本原比例的前提下移动图片裁剪窗口。
const HOME_FOCUS = Object.freeze({ sport: 0, food: 0.5, forum: 0.85 })
function homeFocus(id) { return HOME_FOCUS[id] === undefined ? 0.5 : HOME_FOCUS[id] }

module.exports = { PLACEHOLDER_IMAGE, IMAGE_ENTRIES, resourceImage, homeImage, homeFocus }
