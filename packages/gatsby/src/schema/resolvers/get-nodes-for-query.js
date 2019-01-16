const { getNullableType } = require(`graphql`)

const { getNodesByType } = require(`../db`)
const { dropQueryOperators } = require(`../query`)
const {
  hasResolvers,
  isProductionBuild,
  merge,
  pathToObject,
} = require(`../utils`)
const { trackObjects } = require(`../utils/node-tracking`)

const { emitter } = require(`../../redux`)
let isBootstrapFinished = false
emitter.on(`BOOTSTRAP_FINISHED`, () => (isBootstrapFinished = true))

const cache = new Map()
const nodeCache = new Map()

// TODO: Filter sparse arrays?

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
      // Maybe be more explicit: `const isLeaf = !isObject(filterValue)`
      // TODO:
      // * Do we have to check if
      //   - isObject(value) || Array.isArray(value) ?
      //   i.e. can we rely on the filter being correct? or the node data not being wrong?
      //   also: do we have to check that TC and field value are in sync with regards to
      //   being scalar or array?
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

const getNodesForQuery = async (
  typeName,
  args,
  context,
  schema,
  projection
) => {
  const nodes = await getNodesByType(typeName)

  const { filter, sort } = args || {}
  const { group, distinct } = projection || {}

  const filterFields = filter ? dropQueryOperators(filter) : {}
  const sortFields = sort ? sort.fields : []

  const fields = merge(
    filterFields,
    ...sortFields.map(pathToObject),
    pathToObject(group),
    pathToObject(distinct)
  )

  if (!Object.keys(fields).length) return nodes

  let cacheKey
  if (isProductionBuild || !isBootstrapFinished) {
    cacheKey = JSON.stringify({ typeName, count: nodes.length, fields })
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey)
    }
  }

  const type = schema.getType(typeName)

  // If there are no resolvers to call manually, we can just return nodes.
  if (!hasResolvers(type, fields)) {
    return nodes
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

  if (isProductionBuild || !isBootstrapFinished) {
    cache.set(cacheKey, queryNodes)
  }

  return queryNodes
}

module.exports = getNodesForQuery
