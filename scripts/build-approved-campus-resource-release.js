const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { contentHash } = require('./campus-resource-import/core')

const DATA_VERSION = 'buaa-resources-student-v1'
function sha256File(filePath) { return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex') }

function addUtcDays(dateText, days) {
  const date = new Date(`${dateText}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) throw new Error(`无效确认日期：${dateText}`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function main() {
  const sourceDir = process.argv[2]
  const dryRunPath = process.argv[3] || path.resolve(__dirname, '../docs/buaa-resource-dry-run-2026-09-03.json')
  const outputPath = process.argv[4] || path.resolve(__dirname, '../cloudfunctions/campusResourceAdmin/buaa-resources-student-v1.json')
  if (!sourceDir) throw new Error('必须提供 CSV 源目录')
  const dryRun = JSON.parse(fs.readFileSync(dryRunPath, 'utf8'))
  if (!dryRun.allOrNothingEligible || dryRun.blocked.length || dryRun.errors.length) throw new Error('dry-run 尚未满足整批发布条件')
  const collections = Object.fromEntries(Object.entries(dryRun.transformedRecords).map(([name, records]) => [name, records.map((record) => {
    const next = { ...record, dataVersion: DATA_VERSION, status: 'verified', verifiedAt: record.confirmedAt, validUntil: addUtcDays(record.confirmedAt, 90), sourceType: 'student_curated', sourceText: '学生整理', curatedBy: 'student', displayNotice: '人工整理、信息仅供参考' }
    next.contentHash = contentHash(next)
    return next
  })]))
  const ids = Object.values(collections).flat().map((item) => item._id)
  const previousIds = Object.values(dryRun.transformedRecords).flat().map((item) => item._id)
  if (JSON.stringify(ids) !== JSON.stringify(previousIds)) throw new Error('发布批次稳定 ID 与 dry-run 不一致')
  const release = {
    schemaVersion: '1.0.0', targetEnvironmentId: 'cloud1-d2gdhogc6193c3024', dataVersion: DATA_VERSION,
    policy: { meaningOfVerified: '仅表示在本课程项目内允许参与展示和方案匹配，不代表北航官方认证', displayNotice: '人工整理、信息仅供参考' },
    sourceFiles: ['运动.csv', '餐厅.csv', '菜品.csv'].map((filename) => ({ filename, sha256: sha256File(path.join(sourceDir, filename)) })),
    counts: Object.fromEntries(Object.entries(collections).map(([name, records]) => [name, records.length])), collections
  }
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, `${JSON.stringify(release, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify({ outputPath, dataVersion: DATA_VERSION, counts: release.counts, stableIdsUnchanged: true }, null, 2))
}

if (require.main === module) main()
