const {
  getNode,
  getNodes,
  getNodesByType,
  getTypes,
} = require(`../../db/nodes`)

// The `id` field can already be resolved to a full node.
// In that case just return it.
const getById = id =>
  id != null ? (typeof id === `object` ? id : getNode(id)) : null

module.exports = {
  getById,
  getNodes,
  getNodesByType,
  getTypes,
}
