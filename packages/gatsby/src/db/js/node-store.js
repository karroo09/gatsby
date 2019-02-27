class NodeStore {
  constructor(saveFile, nodes) {
    this.nodes = new Map()
    this.nodesByType = new Map()
    this.saveFile = saveFile

    // initialState.nodes = objectToMap(initialState.nodes)

    // initialState.nodesByType = new Map()
    // initialState.nodes.forEach(node => {
    //   const { type } = node.internal
    //   if (!initialState.nodesByType.has(type)) {
    //     initialState.nodesByType.set(type, new Map())
    //   }
    //   initialState.nodesByType.get(type).set(node.id, node)
    // })

    // TODO: In the CRUD methods, maybe move the if(this.nodes) check
    // from the reducer there
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
    // TODO:
    // Separate redux node store from the rest of
    // the app state when saving
    // save mapToObject(this.nodes)
    if (!this.saveFile) return Promise.resolve()
    const serializedStore = mapToObject(this.nodes)
    return fs.write(this.saveFile.serializedStore)
  }
}

module.exports = NodeStore
