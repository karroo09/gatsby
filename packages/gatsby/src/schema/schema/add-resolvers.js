const { findMany, findOne } = require(`../resolvers`)
const { getInputArgs } = require(`../input`)
const { paginate, getPaginationTC } = require(`../pagination`)

const addResolvers = tc => {
  const typeName = tc.getTypeName()
  const [filter, sort, fields] = getInputArgs(tc)
  tc.addResolver({
    name: `findOne`,
    type: tc,
    args: {
      // FIXME: Should be on à `filter` field
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
  // TODO: Add `byId` and `byIds` resolvers (and root query fields)
  // TODO: Maybe add findChild/findChildren resolvers for use in add-convenience-children-fields
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
      const results = await findMany(typeName)(rp)
      return paginate(results, rp.args)
    },
  })
}

module.exports = addResolvers
