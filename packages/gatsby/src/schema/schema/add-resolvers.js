const { TypeComposer } = require(`graphql-compose`)

const { findMany, findOne } = require(`../resolvers`)
const { getInputArgs } = require(`../input`)
const { paginate } = require(`../pagination`)

// TODO: Make those fields NonNull?
const PageInfoTC = TypeComposer.create({
  name: `PageInfo`,
  fields: {
    currentPage: `Int`,
    hasNextPage: `Boolean`,
    hasPreviousPage: `Boolean`,
    itemCount: `Int`,
    pageCount: `Int`,
    perPage: `Int`,
  },
})

const getPaginationType = tc => {
  const typeName = tc.getTypeName()
  // TODO: get or create
  return TypeComposer.create({
    name: `Page` + typeName,
    fields: {
      count: `Int`,
      items: [tc],
      pageInfo: PageInfoTC,
    },
  })
}

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
    name: `pagination`,
    type: getPaginationType(tc),
    args: {
      filter,
      sort,
      skip: `Int`,
      limit: { type: `Int`, defaultValue: 20 },
      // page: `Int`,
      // perPage: { type: `Int`, defaultValue: 20 },
    },
    resolve: paginate(typeName),
  })
}

module.exports = addResolvers
