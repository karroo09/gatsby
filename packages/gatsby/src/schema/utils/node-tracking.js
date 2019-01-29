const parentNodes = new WeakMap()

// FIXME: Do we need to track empty arrays and objects?
const trackObjects = node => {
  const convert = obj => {
    Object.values(obj).forEach(value => {
      // isObject(value) || Array.isArray(value)
      // TODO: && !(value instanceof Date)
      if (value && typeof value === `object` && !parentNodes.has(value)) {
        parentNodes.set(value, node.id)
        convert(value)
      }
    })
  }
  // TODO: Exclude `internal`
  convert(node)
}

const getParentNodeId = obj => parentNodes.get(obj)

module.exports = {
  getParentNodeId,
  trackObjects,
}
