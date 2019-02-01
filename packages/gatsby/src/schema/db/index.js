const {
  getNode,
  getNodes,
  getNodesByType,
  getTypes,
} = require(`../../db/nodes`)

// The `id` field can already be resolved to a full node.
// In that case just return it.
const getById = id => {
  if (id == null) return null
  const node = typeof id === `object` ? id : getNode(id)
  return node || null
}

module.exports = {
  getById,
  getNodes,
  getNodesByType,
  getTypes,
}
