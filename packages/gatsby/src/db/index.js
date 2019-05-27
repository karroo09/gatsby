const fs = require(`fs-extra`)
const path = require(`path`)
const { store } = require(`../redux`)

const backend = process.env.GATSBY_DB_NODES || `js`

interface NodeStore {
  getNode: (id: string) => any | undefined;
  getNodes: () => Array<any>;
  getNodesByType: (type: string) => Array<any>;
  getTypes: () => Array<string>;
  // XXX(freiksenet): types
  runQuery: (...args: any) => any | undefined;
}

const createNodesDb = async fileName => {
  // FIXME:
  const saveFile = fileName + `.` + backend
  fs.ensureDirSync(path.dirname(saveFile))

  let db: NodeStore
  switch (backend) {
    case `js`: {
      const JsStore = require(`./js/store`)
      db = new JsStore(saveFile)
      break
    }
    case `loki`: {
      const LokiDb = require(`./loki/store`)
      db = new LokiDb(saveFile)
      break
    }
    default:
      throw new Error(`Unsupported node-store backend ${backend}`)
  }

  await db.start()

  store.dispatch({
    type: `SET_NODES_DB`,
    payload: {
      backend,
      db,
      path: saveFile,
    },
  })

  return db
}

module.exports = {
  createNodesDb,
}
