const { getNullableType } = require(`graphql`)

const { isProductionBuild } = require(`../utils`)
const { trackObjects } = require(`../utils/node-tracking`)

const cache = new Map()
const nodeCache = new Map()

const resolveValue = (value, filterValue, type, context, schema) => {
  const nullableType = getNullableType(type)
  // FIXME: We probably have to check that node data and schema are actually in sync,
  // i.e. both are arrays or scalars
  // return Array.isArray(value) && nullableType instanceof GraphQLList
  return Array.isArray(value)
    ? Promise.all(
        value.map(item =>
          resolveValue(item, filterValue, nullableType.ofType, context, schema)
        )
      )
    : prepareForQuery(value, filterValue, nullableType, context, schema)
}

const prepareForQuery = (node, filter, parentType, context, schema) => {
  const fields = parentType.getFields()

  const queryNode = Object.entries(filter).reduce(
    async (acc, [fieldName, filterValue]) => {
      const node = await acc

      const { type, args, resolve } = fields[fieldName]

      if (typeof resolve === `function`) {
        const defaultValues = args.reduce((acc, { name, defaultValue }) => {
          acc[name] = defaultValue
          return acc
        }, {})
        node[fieldName] = await resolve(node, defaultValues, context, {
          fieldName,
          parentType,
          returnType: type,
          schema,
        })
      }

      // `dropQueryOperators` sets value to `true` for leaf values.
      const isLeaf = filterValue === true
      const value = node[fieldName]

      if (!isLeaf && value != null) {
        node[fieldName] = await resolveValue(
          value,
          filterValue,
          type,
          context,
          schema
        )
      }

      return node
    },
    { ...node }
  )
  return queryNode
}

const getNodesForQuery = (type, nodes, fields, context, schema) => {
  let cacheKey
  if (isProductionBuild) {
    cacheKey = JSON.stringify({
      typeName: type.name,
      count: nodes.length,
      fields,
    })
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey)
    }
  }

  const queryNodes = Promise.all(
    nodes.map(async node => {
      const cacheKey = JSON.stringify({
        id: node.id,
        digest: node.internal.contentDigest,
        fields,
      })
      if (nodeCache.has(cacheKey)) {
        return nodeCache.get(cacheKey)
      }

      const queryNode = prepareForQuery(node, fields, type, context, schema)

      nodeCache.set(cacheKey, queryNode)
      trackObjects(await queryNode)
      return queryNode
    })
  )

  if (isProductionBuild) {
    cache.set(cacheKey, queryNodes)
  }

  return queryNodes
}

module.exports = getNodesForQuery
