const fs = require(`fs-extra`)
const path = require(`path`)
const Loki = require(`lokijs`)
const { store } = require(`../../redux`)
const customComparators = require(`./custom-comparators`)

Loki.Comparators.lt = customComparators.ltHelper
Loki.Comparators.gt = customComparators.gtHelper

// TODO: Try LokiFsStructuredAdapter
const createOrLoadDb = saveFile =>
  new Promise((resolve, reject) => {
    const db = new Loki(saveFile, {
      autoload: true,
      autoloadCallback: err => {
        if (err) reject(err)

        const collection = db.getCollection(`nodes`)
        if (!collection) {
          db.addCollection(`nodes`, {
            unique: [`id`],
            indices: [`id`, `internal.type`],
            disableMeta: true,
          })
        }
        resolve(db)
      },
    })
  })

const createNodesDb = async saveFile => {
  if (saveFile) {
    const saveDir = path.dirname(saveFile)
    fs.ensureDirSync(saveDir)
  }

  const db = await createOrLoadDb(saveFile)
  store.dispatch({ type: `SET_DB_NODES`, payload: db })
  return db
}

const saveState = () =>
  new Promise((resolve, reject) => {
    const { nodes } = store.getState()
    if (nodes) {
      nodes.saveDatabase(err => {
        if (err) reject(err)
        resolve()
      })
    } else {
      reject(`No database found.`)
    }
  })

module.exports = {
  createNodesDb,
  saveState,
}
