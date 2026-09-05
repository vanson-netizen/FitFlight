const assert = require('assert')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const functionDir = path.resolve(__dirname, '../cloudfunctions/trainingPlan')
const assetNames = [
  '9.FitFlight_V1_Exercise_Library.json',
  '10.FitFlight_V1_Training_Templates.json',
  'buaa-resources.pending.1.json'
]

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
}

for (const name of assetNames) {
  const source = path.join(functionDir, 'data', name)
  const deployedCopy = path.join(functionDir, name)
  assert.ok(fs.existsSync(source), `missing source asset: data/${name}`)
  assert.ok(fs.existsSync(deployedCopy), `missing root deployment asset: ${name}`)
  assert.strictEqual(sha256(deployedCopy), sha256(source), `asset copy differs: ${name}`)
  assert.doesNotThrow(() => JSON.parse(fs.readFileSync(deployedCopy, 'utf8')), `invalid JSON: ${name}`)
}

const runtimeFiles = fs.readdirSync(functionDir).filter((name) => name.endsWith('.js'))
for (const filename of runtimeFiles) {
  const source = fs.readFileSync(path.join(functionDir, filename), 'utf8')
  const requires = [...source.matchAll(/require\(['"](\.\/[^'"]+\.json)['"]\)/g)].map((match) => match[1])
  for (const target of requires) assert.ok(fs.existsSync(path.resolve(functionDir, target)), `${filename} requires missing ${target}`)
  assert.ok(!/require\(['"]\.\/data\/[^'"]+\.json['"]\)/.test(source), `${filename} still loads runtime JSON from data/`)
}

const exerciseLibrary = require('../cloudfunctions/trainingPlan/9.FitFlight_V1_Exercise_Library.json')
const trainingTemplates = require('../cloudfunctions/trainingPlan/10.FitFlight_V1_Training_Templates.json')
assert.ok(Array.isArray(exerciseLibrary.records) && exerciseLibrary.records.length > 0, 'exercise library is empty')
assert.ok(trainingTemplates.sessionTemplates && Object.keys(trainingTemplates.sessionTemplates).length > 0, 'session templates are empty')
assert.strictEqual(trainingTemplates.exerciseLibraryVersion, exerciseLibrary.dataVersion, 'template exercise library version mismatch')
assert.doesNotThrow(() => require('../cloudfunctions/trainingPlan/resource-matcher'))
assert.doesNotThrow(() => require('../cloudfunctions/trainingPlan/executable-training'))
assert.doesNotThrow(() => require('../cloudfunctions/trainingPlan/plan-generator'))

console.log('TrainingPlan root runtime assets and references passed.')
