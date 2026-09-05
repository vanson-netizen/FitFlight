const assert = require('assert')
const release = require('../cloudfunctions/campusResourceAdmin/buaa-resources-student-v1.json')
const { writeChangedRecords } = require('../cloudfunctions/campusResourceAdmin/transaction-writer')

function clone(value) { return JSON.parse(JSON.stringify(value)) }

function createFakeDb({ failAtWrite = 0 } = {}) {
  const state = new Map()
  const calls = []
  let writes = 0
  return {
    state,
    calls,
    serverDate: () => 'SERVER_DATE',
    async runTransaction(callback) {
      const staged = new Map([...state].map(([key, value]) => [key, clone(value)]))
      const transaction = {
        collection(collectionName) {
          return {
            doc(id) {
              const key = `${collectionName}/${id}`
              return {
                async get() {
                  if (!staged.has(key)) throw new Error('not exist')
                  return { data: clone(staged.get(key)) }
                },
                async set({ data }) {
                  calls.push({ operation: 'set', collectionName, id, data: clone(data) })
                  writes += 1
                  if (failAtWrite && writes === failAtWrite) throw new Error('injected transaction failure')
                  staged.set(key, { _id: id, ...clone(data) })
                },
                async update({ data }) {
                  calls.push({ operation: 'update', collectionName, id, data: clone(data) })
                  writes += 1
                  if (failAtWrite && writes === failAtWrite) throw new Error('injected transaction failure')
                  staged.set(key, { ...staged.get(key), ...clone(data), _id: id })
                }
              }
            }
          }
        }
      }
      await callback(transaction)
      state.clear()
      for (const [key, value] of staged) state.set(key, value)
    }
  }
}

const records = Object.entries(release.collections).flatMap(([collection, items]) => items.map((item) => ({ collection, id: item._id })))
const fixedIds = Object.values(release.collections).flat().map((record) => record._id)
assert.strictEqual(records.length, 23)
assert.strictEqual(new Set(fixedIds).size, 23)

;(async () => {
  const db = createFakeDb()
  await writeChangedRecords(db, release, records)
  assert.strictEqual(db.state.size, 23)
  assert.strictEqual(db.calls.length, 23)
  db.calls.forEach((call) => {
    assert.ok(fixedIds.includes(call.id), `doc() did not use stable ID: ${call.id}`)
    assert.ok(!Object.prototype.hasOwnProperty.call(call.data, '_id'), `${call.operation}.data contains _id`)
  })

  const callsAfterFirstImport = db.calls.length
  await writeChangedRecords(db, release, records)
  assert.strictEqual(db.calls.length, callsAfterFirstImport, 'identical repeat import should be unchanged')
  assert.strictEqual(db.state.size, 23, 'identical repeat import created duplicates')

  const rollbackDb = createFakeDb({ failAtWrite: 2 })
  await assert.rejects(() => writeChangedRecords(rollbackDb, release, records), /injected transaction failure/)
  assert.strictEqual(rollbackDb.state.size, 0, 'failed transaction left partial records')

  console.log('CampusResourceAdmin transaction, stable ID, rollback and unchanged tests passed.')
})().catch((error) => { console.error(error); process.exitCode = 1 })
