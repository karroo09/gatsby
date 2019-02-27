const { store } = require(`../redux`)

const backend = process.env.GATSBY_DB_NODES || `js`

const createNodesDb = saveFile => {
  let db
  switch (backend) {
    case `js`: {
      const JsStore = require(`./js/node-store`)
      db = new JsStore(saveFile)
      break
    }
    case `loki`: {
      const LokiDb = require(`./loki/nodes`)
      db = new LokiDb(saveFile)
      break
    }
    default:
      throw new Error(
        `Unsupported DB nodes backend (value of env var GATSBY_DB_NODES)`
      )
  }

  store.dispatch({
    type: `SET_NODES_DB`,
    payload: {
      db,
      path: saveFile,
    },
  })

  return db
}

module.exports = {
  createNodesDb,
}
