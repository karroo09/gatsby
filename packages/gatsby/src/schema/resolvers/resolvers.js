const { getById, getNodesByType } = require(`../db`)
const { query } = require(`../query`)
const getNodesForQuery = require(`./get-nodes-for-query`)
const getQueryFields = require(`./get-query-fields`)
const withPageDependencies = require(`./page-dependencies`)
const withSpecialCases = require(`./special-cases`)
const { hasResolvers } = require(`../utils`)

const findById = () => ({ args }) => getById(args.id)

const findByIds = () => ({ args }) =>
  Array.isArray(args.ids) ? args.ids.map(getById).filter(Boolean) : []

const findByIdsAndType = typeName => ({ args }, firstResultOnly) =>
  Array.isArray(args.ids)
    ? args.ids
        .map(getById)
        [firstResultOnly ? `find` : `filter`](
          node => node && node.internal.type === typeName
        ) || null
    : firstResultOnly
    ? null
    : []

const find = typeName => async (rp, firstResultOnly) => {
  const queryArgs = withSpecialCases({ type: typeName, ...rp })

  const queryFields = getQueryFields(rp)
  const nodes = await getNodesByType(typeName)

  const { schema } = rp.info
  const type = schema.getType(typeName)

  let queryNodes
  if (!Object.keys(queryFields).length || !hasResolvers(type, queryFields)) {
    queryNodes = nodes
  } else {
    // Don't create page dependencies in getNodesForQuery
    /* eslint-disable-next-line no-unused-vars */
    const { path, ...context } = rp.context || {}
    queryNodes = await getNodesForQuery(
      type,
      nodes,
      queryFields,
      context,
      schema
    )
  }

  // We pass `queryNodes` *and* `type`, because Loki will fetch
  // a node collection by `type.name`, but Sift expects the nodes as an
  // array. Also: we pass the `type` and not `typeName`, because Loki
  // needs the field configs to translate `$in` and `$nin`
  // operators on `GraphQLList` fields into `$containsAny` and `$containsNone`.
  // This should only be a temporary solution.
  const lokiCollectionType = nodes === queryNodes ? type : undefined
  return query(queryNodes, queryArgs, firstResultOnly, lokiCollectionType)
}

const findMany = typeName => async rp => find(typeName)(rp, false)

const findOne = typeName => rp => {
  // FIXME: filter args should be on a `filter` field
  rp.args = { filter: { ...rp.args } }
  return find(typeName)(rp, true)
}

module.exports = {
  findById: withPageDependencies(findById),
  findByIds: withPageDependencies(findByIds),
  findByIdsAndType: withPageDependencies(findByIdsAndType),
  findMany: withPageDependencies(findMany),
  findOne: withPageDependencies(findOne),
}
