const { getById, getNodesByType } = require(`../db`)
const { findOne, findMany } = require(`../resolvers`)
const { oneOf } = require(`../query`)

const addConvenienceChildrenFields = tc => {
  const typeName = tc.getTypeName()
  const nodes = getNodesByType(typeName)

  const hasChildrenByType = nodes.reduce((acc, node) => {
    const children = node.children.map(getById)
    const childrenCountByType = children.reduce((acc, child) => {
      const { type } = child.internal
      acc[type] = acc[type] + 1 || 1
      return acc
    }, {})
    Object.entries(childrenCountByType).forEach(([type, count]) => {
      acc[type] = Boolean(acc[type]) || count > 1
    })
    return acc
  }, {})

  Object.entries(hasChildrenByType).forEach(([typeName, hasChildren]) => {
    const fieldName = (hasChildren ? `children` : `child`) + typeName
    const fieldConfig = hasChildren
      ? {
          type: [typeName],
          resolve: (source, args, context, info) =>
            findMany(typeName)({
              source,
              args: { filter: { id: oneOf(source.children) } },
              context,
              info,
            }),
        }
      : {
          type: typeName,
          resolve: (source, args, context, info) =>
            findOne(typeName)({
              source,
              args: { id: oneOf(source.children) },
              context,
              info,
            }),
        }
    const field = { [fieldName]: fieldConfig }
    tc.addFields(field)
  })
}

module.exports = addConvenienceChildrenFields
