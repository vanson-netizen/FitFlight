function findExpected(release, collectionName, id) {
  return release.collections[collectionName].find((record) => record._id === id)
}

async function writeChangedRecords(db, release, changed) {
  return db.runTransaction(async (transaction) => {
    for (const item of changed) {
      const expected = findExpected(release, item.collection, item.id)
      if (!expected) throw new Error(`fixed release record not found: ${item.collection}/${item.id}`)
      const { _id, ...documentData } = expected
      const document = transaction.collection(item.collection).doc(_id)
      const existing = await document.get().catch(() => ({ data: null }))
      if (existing.data && existing.data.contentHash === expected.contentHash) continue
      if (existing.data) {
        const updateData = { ...documentData, updatedAt: db.serverDate() }
        delete updateData.createdAt
        await document.update({ data: updateData })
      } else {
        await document.set({ data: { ...documentData, createdAt: db.serverDate(), updatedAt: db.serverDate() } })
      }
    }
  })
}

module.exports = { findExpected, writeChangedRecords }
