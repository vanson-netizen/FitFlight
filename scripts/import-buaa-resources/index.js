const fs = require('fs')
const path = require('path')
const { readCsv, buildResources, compare } = require('../campus-resource-import/core')

function main() {
  const sourceDir = process.argv[2]
  const outputPath = process.argv[3]
  const dataVersion = process.argv[4] || 'buaa-student-curated-2026-09-03-v1'
  if (!sourceDir) throw new Error('用法：node scripts/import-buaa-resources <CSV目录> [dry-run报告路径] [dataVersion]')
  const resources = buildResources({ venueRows: readCsv(path.join(sourceDir, '运动.csv')), hallRows: readCsv(path.join(sourceDir, '餐厅.csv')), foodRows: readCsv(path.join(sourceDir, '菜品.csv')), dataVersion })
  const changes = Object.fromEntries(Object.entries(resources.collections).map(([name, records]) => [name, compare(records)]))
  const report = { mode: 'dry-run', willWriteDatabase: false, allOrNothingEligible: resources.errors.length === 0 && resources.blocked.length === 0, sourceDir, resourceDataVersion: dataVersion, counts: Object.fromEntries(Object.entries(resources.collections).map(([name, records]) => [name, records.length])), changes, blocked: resources.blocked, errors: resources.errors, generatedIds: Object.fromEntries(Object.entries(resources.collections).map(([name, records]) => [name, records.map((item) => ({ id: item._id, name: item.name || item.dishName, contentHash: item.contentHash }))])), transformedRecords: resources.collections }
  const json = `${JSON.stringify(report, null, 2)}\n`
  if (outputPath) { fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true }); fs.writeFileSync(outputPath, json, 'utf8') }
  process.stdout.write(json)
  if (resources.errors.length) process.exitCode = 1
}

if (require.main === module) main()
module.exports = { main }
