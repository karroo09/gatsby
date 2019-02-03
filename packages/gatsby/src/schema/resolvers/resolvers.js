const { isAbstractType } = require(`graphql`)

const { getById, getNodesByType } = require(`../db`)
const { query } = require(`../query`)
const getNodesForQuery = require(`./get-nodes-for-query`)
const getQueryFields = require(`./get-query-fields`)
const withPageDependencies = require(`./page-dependencies`)
const withSpecialCases = require(`./special-cases`)
const { hasResolvers } = require(`../utils`)

// findById and findByIds are only used on fields of type `Node`

const findById = () => ({ args }) => getById(args.id)

const findByIds = () => ({ args }) =>
  Array.isArray(args.ids) ? args.ids.map(getById).filter(Boolean) : []

const find = typeName => async (rp, firstResultOnly) => {
  const queryArgs = withSpecialCases({ type: typeName, ...rp })
  const { schema } = rp.info
  const type = schema.getType(typeName)
  const possibleTypes = isAbstractType(type)
    ? schema.getPossibleTypes(type)
    : [type]

  const queryFields = getQueryFields(rp)
  const nodes = (await Promise.all(
    possibleTypes.map(type => getNodesByType(type.name))
  )).reduce((acc, nodesOfType) => acc.concat(nodesOfType), [])

  let queryNodes
  if (
    !Object.keys(queryFields).length ||
    !possibleTypes.some(type => hasResolvers(type, queryFields))
  ) {
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

  // We pass `queryNodes` *and* `types`, because Loki will fetch
  // a node collection by `type.name`, but Sift expects the nodes as an
  // array. Also: we pass the `type` and not `typeName`, because Loki
  // needs the field configs to translate `$in` and `$nin`
  // operators on `GraphQLList` fields into `$containsAny` and `$containsNone`.
  // This should only be a temporary solution.
  // TODO: For now, only use Loki when we query only one node type.
  // Figure out a good way to query multiple collections with find(), or
  // combine ResultSets before chaining sort().
  const typesForLoki =
    nodes === queryNodes && possibleTypes.length === 1 ? type : undefined
  return query(queryNodes, queryArgs, firstResultOnly, typesForLoki)
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
  findMany: withPageDependencies(findMany),
  findOne: withPageDependencies(findOne),
}
