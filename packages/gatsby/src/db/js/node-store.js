const fs = require(`fs-extra`)

class NodeStore {
  constructor(saveFile) {
    this.nodes = new Map()
    this.nodesByType = new Map()
    this.saveFile = saveFile

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
}

module.exports = NodeStore
