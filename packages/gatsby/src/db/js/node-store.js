const fs = require(`fs`)

class NodeStore {
  constructor(saveFile) {
    this.nodes = new Map()
    this.nodesByType = new Map()
    this.saveFile = saveFile

    if (fs.existsSync(this.saveFile)) {
      const nodes = fs.readFileSync(this.saveFile)
      this.nodes = new Map(nodes)
      this.nodes.forEach(node => {
        const { type } = node.internal
        if (!this.nodesByType.has(type)) {
          this.nodesByType.set(type, new Map())
        }
        this.nodesByType.get(type).set(node.id, node)
      })
    }

    // TODO: In the CRUD methods, maybe move the if(this.nodes) check from the reducer there
  }

  clear() {
    this.nodes = new Map()
  }

  create(node) {
    this.nodes.set(node.id, node)
  }

  update(node) {
    this.nodes.set(node.id, node)
  }

  delete(node) {
    this.nodes.delete(node.id)
  }

  deleteMany(ids) {
    ids.forEach(id => this.nodes.delete(id))
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
    return this.getNodes().filter(node => node.internal.type === type)
    // return Array.from(this.nodesByType.get(type))
  }

  getTypes() {
    return Array.from(
      this.getNodes().reduce((acc, node) => {
        acc.add(node.internal.type)
        return acc
      }, new Set())
    )
    // return Array.from(this.nodesByType.keys())
  }

  saveState() {
    if (!this.saveFile) return Promise.resolve()
    const serializedStore = Array.from(this.nodes.entries())
    return fs.write(this.saveFile, serializedStore)
  }
}

module.exports = NodeStore
