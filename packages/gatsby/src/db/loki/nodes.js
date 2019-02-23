const { store } = require(`../../redux`)

const getNode = id => {
  if (id == null) return null

  const { nodes } = store.getState()
  if (!nodes) return null

  const collection = nodes.getCollection(`nodes`)
  return collection.by(`id`, id) || null
}

const getNodes = () => {
  const { nodes } = store.getState()
  if (!nodes) return []

  const collection = nodes.getCollection(`nodes`)
  return collection.data
}

const getNodesByType = type => {
  if (!type) return []

  const { nodes } = store.getState()
  if (!nodes) return null

  const collection = nodes.getCollection(`nodes`)
  const view = collection.getDynamicView(type)
  return view ? view.data() : []
}

const getTypes = () => {
  const { nodes } = store.getState()
  if (!nodes) return null

  const collection = nodes.getCollection(`nodes`)
  const views = collection.DynamicViews
  // NOTE: This will only work as long as we don't add
  // DynmicViews for anything other than node types.
  return views.map(view => view.name)
}

const getNodeAndSavePathDependency = (id, path) => {
  if (id == null) return null

  const node = getNode(id)

  if (path && node) {
    const createPageDependency = require(`../../redux/actions/add-page-dependency`)
    createPageDependency({ nodeId: id, path })
  }

  return node
}

const hasNodeChanged = (id, digest) => {
  const node = getNode(id)
  if (!node) return true
  return node.internal.contentDigest !== digest
}

module.exports = {
  getNode,
  getNodes,
  getNodesByType,
  getTypes,
  getNodeAndSavePathDependency,
  hasNodeChanged,
}
