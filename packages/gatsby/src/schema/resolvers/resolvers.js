const { getById } = require(`../db`)
const { query } = require(`../query`)
const getNodesForQuery = require(`./get-nodes-for-query`)
const withPageDependencies = require(`./page-dependencies`)
const withSpecialCases = require(`./special-cases`)

const findById = () => ({ args }) => getById(args.id)

const findByIds = () => ({ args }) =>
  Array.isArray(args.ids) ? args.ids.map(getById).filter(Boolean) : []

const findByIdsAndType = type => ({ args }, firstResultOnly) =>
  Array.isArray(args.ids)
    ? args.ids
        .map(getById)
        [firstResultOnly ? `find` : `filter`](
          node => node && node.internal.type === type
        ) || null
    : firstResultOnly
      ? null
      : []

const find = type => async (rp, firstResultOnly) => {
  const queryArgs = withSpecialCases({ type, ...rp })
  // Don't create page dependencies in getNodesForQuery
  /* eslint-disable-next-line no-unused-vars */
  const { path, ...context } = rp.context || {}
  return query(
    await getNodesForQuery(type, queryArgs.filter, context),
    queryArgs,
    firstResultOnly
  )
}

const findMany = type => async rp => find(type)(rp, false)

const findOne = type => rp => {
  // FIXME: filter args should be on a `filter` field
  rp.args = { filter: { ...rp.args } }
  return find(type)(rp, true)
}

module.exports = {
  findById: withPageDependencies(findById),
  findByIds: withPageDependencies(findByIds),
  findByIdsAndType: withPageDependencies(findByIdsAndType),
  findMany: withPageDependencies(findMany),
  findOne: withPageDependencies(findOne),
}
