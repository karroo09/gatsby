const fs = require(`fs-extra`)
const { query: queryWithSift } = require(`./query`)
const {
  getQueryFields,
  getFieldsWithResolvers,
  getMissingFields,
  merge,
} = require(`../common/query`)
const { getResolvedNodes } = require(`../common/get-resolved-nodes`)

class NodeStore {
  constructor(saveFile) {
    this.nodes = new Map()
    this.nodesByType = new Map()
    this.saveFile = saveFile

    this.cache = new Map()

    this.getNode = this.getNode.bind(this)
    this.getNodes = this.getNodes.bind(this)
    this.getNodesByType = this.getNodesByType.bind(this)
    this.getTypes = this.getTypes.bind(this)
  }

  start() {
    this.loadState()
  }

  clear() {
    this.nodes = new Map()
    this.nodesByType = new Map()
  }

  create(node) {
    this.nodes.set(node.id, node)

    const { type } = node.internal
    if (!this.nodesByType.has(type)) {
      this.nodesByType.set(type, new Map())
    }
    const nodesOfType = this.nodesByType.get(type)
    nodesOfType.set(node.id, node)
  }

  update(node) {
    this.nodes.set(node.id, node)

    const { type } = node.internal
    const nodesOfType = this.nodesByType.get(type)
    nodesOfType.set(node.id, node)
  }

  delete(node) {
    this.nodes.delete(node.id)

    const { type } = node.internal
    const nodesOfType = this.nodesByType.get(type)
    nodesOfType.delete(node.id)
    if (!nodesOfType.size) {
      this.nodesByType.delete(type)
    }
  }

  deleteMany(ids) {
    ids.forEach(id => this.nodes.delete(id))

    ids.forEach(id => {
      Array.from(this.nodesByType).some(([type, nodes]) => {
        if (nodes.has(id)) {
          nodes.delete(id)
          if (!nodes.size) {
            this.nodesByType.delete(type)
          }
          return true
        }
        return false
      })
    })
  }

  getNode(id) {
    if (id == null) return null
    return this.nodes.get(id) || null
  }

  getNodes() {
    return Array.from(this.nodes.values())
  }

  getNodesByType(type) {
    if (!type) return []
    if (!this.nodesByType.has(type)) return []
    return Array.from(this.nodesByType.get(type).values())
  }

  getTypes() {
    return Array.from(this.nodesByType.keys())
  }

  loadState() {
    if (this.saveFile && fs.existsSync(this.saveFile)) {
      const nodes = JSON.parse(fs.readFileSync(this.saveFile))
      this.nodes = new Map(nodes)
      this.nodes.forEach(node => {
        const { type } = node.internal
        if (!this.nodesByType.has(type)) {
          this.nodesByType.set(type, new Map())
        }
        this.nodesByType.get(type).set(node.id, node)
      })
    }
  }

  saveState() {
    if (!this.saveFile) return Promise.resolve()
    const serializedStore = JSON.stringify(Array.from(this.nodes.entries()))
    return fs.writeFile(this.saveFile, serializedStore)
  }

  clearCache() {
    this.cache = new Map()
  }

  getResolvedNodes(type, fields, schema) {
    const typeName = type.name
    const [
      prevResolvedFields = {},
      prevResolvedNodes = this.getNodesByType(typeName),
    ] = this.cache.get(typeName) || []

    const missingFields = getMissingFields(fields, prevResolvedFields)
    if (!Object.keys(missingFields).length) {
      return prevResolvedNodes
    }

    const resolvedNodes = getResolvedNodes({
      nodes: prevResolvedNodes,
      type,
      fields: missingFields,
      schema,
    })
    this.cache.set(typeName, [
      merge(prevResolvedFields, missingFields),
      resolvedNodes,
    ])
    return resolvedNodes
  }

  async runQuery({ query, firstOnly, types, schema }) {
    const queryFields = getQueryFields(query)

    let queryNodes = []
    if (!Object.keys(queryFields).length) {
      queryNodes = types.map(type => this.getNodesByType(type.name))
    } else {
      queryNodes = await Promise.all(
        types.map(type => {
          const queryFieldsWithResolvers = getFieldsWithResolvers(
            type,
            queryFields
          )
          if (!Object.keys(queryFieldsWithResolvers).length) {
            return this.getNodesByType(type.name)
          }
          return this.getResolvedNodes(type, queryFieldsWithResolvers, schema)
        })
      )
    }

    return queryWithSift(
      queryNodes.reduce((acc, nodes) => acc.concat(nodes)),
      query,
      firstOnly
    )
  }
}

module.exports = NodeStore
