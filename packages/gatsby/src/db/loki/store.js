const Loki = require(`@stefanprobst/lokijs`)
const { query: queryWithLoki } = require(`./query`)
const customComparators = require(`./custom-comparators`)
const {
  getQueryFields,
  getFieldsWithResolvers,
  getMissingFields,
  merge,
} = require(`../common/query`)
const { getResolvedNodes } = require(`../common/get-resolved-nodes`)

Loki.Comparators.lt = customComparators.ltHelper
Loki.Comparators.gt = customComparators.gtHelper

class NodeStore {
  constructor(saveFile) {
    this.saveFile = saveFile
    this.db = null
    this.metaCollection = null

    this.resolvedFields = new Map()
    this.resolvedNodesDb = new Loki()

    this.getNode = this.getNode.bind(this)
    this.getNodes = this.getNodes.bind(this)
    this.getNodesByType = this.getNodesByType.bind(this)
    this.getTypes = this.getTypes.bind(this)
  }

  start() {
    return new Promise((resolve, reject) => {
      this.db = new Loki(this.saveFile, {
        autoload: true,
        autoloadCallback: err => {
          if (err) {
            reject(err)
          } else {
            this.initialize()
            resolve()
          }
        },
      })
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
    this.clearCache()
    this.initialize()
  }

  create(node) {
    const { type } = node.internal

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
    const storedNode = node.$loki ? node : this.getNode(node.id)
    const { type } = storedNode.internal
    this.db.getCollection(type).update(storedNode)
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

  clearCache() {
    this.resolvedFields = new Map()
    // TODO: Clear instead of recreate?
    this.resolvedNodesDb = new Loki()
  }

  async getResolvedNodesCollection(type, fields, schema) {
    const typeName = type.name

    let prevResolvedFields = {}
    let resolvedNodesCollection
    if (this.resolvedFields.has(typeName)) {
      prevResolvedFields = this.resolvedFields.get(typeName)
      resolvedNodesCollection = this.resolvedNodesDb.getCollection(typeName)
    } else {
      this.resolvedFields.set(typeName, {})
      resolvedNodesCollection = this.resolvedNodesDb.addCollection(typeName)
      // NOTE: We unfortunately can neither clone a Loki DB, nor simply
      // insert nodes we get from another Loki collection because they will
      // have a `$loki` property which to Loki signals they are being updated.
      const nodes = this.getNodesByType(typeName).map(
        ({ $loki, ...node }) => node
      )
      resolvedNodesCollection.insert(nodes)
    }

    const missingFields = getMissingFields(fields, prevResolvedFields)
    if (!Object.keys(missingFields).length) {
      return [resolvedNodesCollection, type]
    }

    const resolvedNodes = await getResolvedNodes({
      nodes: resolvedNodesCollection.data,
      type,
      fields: missingFields,
      schema,
    })
    resolvedNodesCollection.update(resolvedNodes)
    this.resolvedFields.set(typeName, merge(prevResolvedFields, missingFields))
    return [resolvedNodesCollection, type]
  }

  async runQuery({ query, firstOnly, types, schema }) {
    const queryFields = getQueryFields(query)

    let collections = []
    if (!Object.keys(queryFields).length) {
      collections = types.map(type => [this.db.getCollection(type.name), type])
    } else {
      collections = await Promise.all(
        types.map(type => {
          const queryFieldsWithResolvers = getFieldsWithResolvers(
            type,
            queryFields
          )
          if (!Object.keys(queryFieldsWithResolvers).length) {
            return [this.db.getCollection(type.name), type]
          }
          return this.getResolvedNodesCollection(
            type,
            queryFieldsWithResolvers,
            schema
          )
        })
      )
    }

    return queryWithLoki(collections, query, firstOnly)
  }
}

module.exports = NodeStore
