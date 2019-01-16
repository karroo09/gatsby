const { findMany, findOne } = require(`../resolvers`)
const { getInputArgs } = require(`../input`)
const {
  paginate,
  getPaginationTC,
  getProjectedField,
} = require(`../pagination`)

const addResolvers = tc => {
  const typeName = tc.getTypeName()
  const [filter, sort, fields] = getInputArgs(tc)
  tc.addResolver({
    name: `findOne`,
    type: tc,
    args: {
      ...filter.getFields(),
    },
    resolve: findOne(typeName),
  })
  tc.addResolver({
    name: `findMany`,
    type: [tc],
    args: {
      filter,
      sort,
      skip: `Int`,
      limit: `Int`,
    },
    resolve: findMany(typeName),
  })
  tc.addResolver({
    name: `findManyPaginated`,
    type: getPaginationTC(tc, fields),
    args: {
      filter,
      sort,
      skip: `Int`,
      limit: `Int`,
      // page: `Int`,
      // perPage: { type: `Int`, defaultValue: 20 },
    },
    resolve: async rp => {
      // Include `group` and `distinct` field for `getNodesForQuery`.
      // This is necessary so the field values are resolved, and grouping
      // by linked node fields is possible.
      if (rp.projection.group) {
        rp.projection.group = getProjectedField(rp.info, `group`)
      }
      if (rp.projection.distinct) {
        rp.projection.distinct = getProjectedField(rp.info, `distinct`)
      }
      const results = await findMany(typeName)(rp)
      return paginate(results, rp.args)
    },
  })
}

module.exports = addResolvers
