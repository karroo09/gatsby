// TODO: Avoid passing schema around

const { GraphQLNonNull } = require(`graphql`)

const { store } = require(`../../redux`)
const { getNodesByType } = require(`../db`)
const { dropQueryOperators } = require(`../query`)
const { hasResolvers, isProductionBuild } = require(`../utils`)
const { trackObjects } = require(`../utils/node-tracking`)

const { emitter } = require(`../../redux`)
let isBootstrapFinished = false
emitter.on(`BOOTSTRAP_FINISHED`, () => (isBootstrapFinished = true))

const cache = new Map()
const nodeCache = new Map()

// const getLinkResolver = (astNode, type) => {
//   const linkDirective = astNode.directives.find(
//     directive => directive.name.value === `link`
//   )
//   if (linkDirective) {
//     const { GraphQLList } = require(`graphql`)
//     const { findOne, findMany, link } = require(`./resolvers`)

//     const by = linkDirective.arguments.find(
//       argument => argument.name.value === `by`
//     ).value.value

//     return link({ by })(
//       type instanceof GraphQLList
//         ? findMany(type.ofType.name)
//         : findOne(type.name)
//     )
//   }
//   return null
// }

// TODO: Filter sparse arrays?

const resolveValue = (value, filterValue, type, schema) => {
  // TODO: Maybe use const { getNullableType } = require(`graphql`)
  const nullableType = type instanceof GraphQLNonNull ? type.ofType : type
  // FIXME: We probably have to check that node data and schema are actually in sync,
  // i.e. both are arrays or scalars
  // return Array.isArray(value) && nullableType instanceof GraphQLList
  return Array.isArray(value)
    ? Promise.all(
        value.map(item =>
          resolveValue(item, filterValue, nullableType.ofType, schema)
        )
      )
    : prepareForQuery(value, filterValue, nullableType, schema)
}

const prepareForQuery = (node, filter, parentType, schema) => {
  // FIXME: Make this a .map() and resolve with Promise.all.
  // .reduce() works sequentially: must resolve `acc` before the next iteration
  // Promise.all(
  //   Object.entries(filter)
  //     .map(async ([fieldName, filterValue]) => {
  //       // ...
  //       return result && [fieldName, result]
  //     })
  //     .filter(Boolean)
  // ).then(fields =>
  //   fields.reduce((acc, [key, value]) => (acc[key] = value) && acc, node)
  // )

  const fields = parentType.getFields()

  const queryNode = Object.entries(filter).reduce(
    async (acc, [fieldName, filterValue]) => {
      const node = await acc

      const { type, args, resolve } = fields[fieldName]

      // FIXME: This is just to test if manually calling the link directive
      // resolver would work (it does). Instead we should use the executable
      // schema where the link resolvers are already added.
      // let { resolve, type, astNode } = tc.getFieldConfig(fieldName)
      // resolve = (astNode && getLinkResolver(astNode, type)) || resolv

      // const value =
      //   typeof resolver === `function`
      //     ? await resolver(
      //         node,
      //         {},
      //         {},
      //         { fieldName, parentType: {}, returnType: type, schema }
      //       )
      //     : node[fieldName]

      // node[fieldName] =
      //   filterValue !== true && value != null
      //     ? await resolveValue(value, filterValue, tc.getFieldTC(fieldName))
      //     : value

      if (typeof resolve === `function`) {
        const defaultValues = args.reduce((acc, { name, defaultValue }) => {
          acc[name] = defaultValue
          return acc
        }, {})
        node[fieldName] = await resolve(
          node,
          defaultValues,
          {},
          { fieldName, parentType, returnType: type, schema }
        )
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
        node[fieldName] = await resolveValue(value, filterValue, type, schema)
      }

      return node
    },
    // FIXME: Shallow copy the node, to avoid mutating the nodes in the store.
    // Possible alternative: start reducing not from node, but from {}, and copy fields
    // when no resolver.
    { ...node }
  )
  return queryNode
}

const getNodesForQuery = async (type, filter) => {
  const nodes = await getNodesByType(type)

  if (!filter) return nodes

  const filterFields = dropQueryOperators(filter)

  let cacheKey
  if (isProductionBuild || !isBootstrapFinished) {
    cacheKey = JSON.stringify({ type, count: nodes.length, filterFields })
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey)
    }
  }

  // Use executable schema from store (includes resolvers added by @link directive).
  // Alternatively, call @link resolvers manually.
  const { schema } = store.getState()

  // Just an experiment. This works as well -- but does not cache resolved nodes.
  // const { execute, parse } = require(`graphql`)
  // const queryField = `all${type}`
  // const query = `{ ${queryField} { ${Object.keys(filterFields).join(`, `)} } }`
  // const { data, errors } = await execute({ schema, document: parse(query) })
  // const queryNodes = data && data[queryField]

  const parentType = schema.getType(type)

  // If there are no resolvers to call manually, we can just return nodes.
  if (!hasResolvers(parentType, filterFields)) {
    return nodes
  }

  const queryNodes = Promise.all(
    nodes.map(async node => {
      const cacheKey = JSON.stringify({
        id: node.id,
        digest: node.internal.contentDigest,
        filterFields,
      })
      if (nodeCache.has(cacheKey)) {
        return nodeCache.get(cacheKey)
      }

      const queryNode = prepareForQuery(node, filterFields, parentType, schema)

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
