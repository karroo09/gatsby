const Loki = require(`lokijs`)
const customComparators = require(`./custom-comparators`)

Loki.Comparators.lt = customComparators.ltHelper
Loki.Comparators.gt = customComparators.gtHelper

class NodeStore {
  constructor(saveFile) {
    this.saveFile = saveFile
    this.metaCollection = null
    this.db = new Loki(saveFile, {
      autoload: true,
      autoloadCallback: err => {
        if (err) throw err
        this.initialize()
      },
    })
  }

  createCollection(name) {
    return this.db.addCollection(name, {
      unique: [`id`],
      indices: [`id`],
      disableMeta: true,
    })
  }

  initialize() {
    this.metaCollection = this.createCollection(`gatsby:nodes`)
  }

  clear() {
    this.db.collections.forEach(collection =>
      this.db.removeCollection(collection.name)
    )
    this.initialize()
  }

  create(node) {
    const { type } = node.internal

    // Upsert
    const oldNode = this.getNode(node.id)
    if (oldNode) {
      this.delete(oldNode)
    }

    this.metaCollection.insert({ id: node.id, type })
    if (!this.db.getCollection(type)) {
      this.createCollection(type)
    }
    this.db.getCollection(type).insert(node)
  }

  update(node) {
    if (!node.$loki) debugger
    const { type } = node.internal
    this.db.getCollection(type).update(node)
  }

  delete(node) {
    const { type } = node.internal
    const meta = this.metaCollection.by(`id`, node.id)
    if (meta) {
      this.metaCollection.remove(meta)
      const collection = this.db.getCollection(type)
      collection.remove(node)
      if (!collection.data.length) {
        this.db.removeCollection(collection.name)
      }
    }
  }

  // Deprecated
  deleteMany(ids) {
    ids.forEach(id => {
      const node = this.getNode(id)
      if (node) {
        this.delete(node)
      }
    })
  }

  getNode(id) {
    if (id == null) return null

    const meta = this.metaCollection.by(`id`, id)
    if (!meta) return null

    const { type } = meta
    return this.db.getCollection(type).by(`id`, id) || null
  }

  getNodes() {
    const types = this.getTypes()
    return types.reduce(
      (acc, type) => acc.concat(this.db.getCollection(type).data),
      []
    )
  }

  getNodesByType(type) {
    if (!type) return []

    const collection = this.db.getCollection(type)
    if (collection) {
      return collection.data
    }
    return []
  }

  getTypes() {
    return this.db.collections
      .map(collection => collection.name)
      .filter(name => name !== this.metaCollection.name)
  }

  saveState() {
    if (!this.saveFile) return Promise.resolve()
    return new Promise((resolve, reject) => {
      this.db.saveDatabase(err => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }
}

module.exports = NodeStore
