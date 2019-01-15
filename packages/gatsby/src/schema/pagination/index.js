const { TypeComposer } = require(`graphql-compose`)

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

const getPaginationTC = tc => {
  const typeName = tc.getTypeName()
  // TODO: get or create
  return TypeComposer.create({
    name: typeName + `Page`,
    fields: {
      count: `Int`,
      items: [tc],
      pageInfo: PageInfoTC,
    },
  })
}

const paginate = (results, { skip = 0, limit }) => {
  const count = results.length
  const items = results.slice(skip, limit && skip + limit)

  // const { page = 1, perPage } = rp.args
  // const pageCount = Math.ceil(count / perPage)
  // const currentPage = page
  // const hasPreviousPage = page > 1
  // const hasNextPage = page * perPage < count // currentPage < pageCount

  const pageCount = limit
    ? Math.ceil(skip / limit) + Math.ceil((count - skip) / limit)
    : skip
      ? 2
      : 1
  const currentPage = limit ? Math.ceil(skip / limit) + 1 : skip ? 2 : 1 // Math.min(currentPage, pageCount)
  const hasPreviousPage = currentPage > 1
  const hasNextPage = skip + limit < count // currentPage < pageCount

  // FIXME: Should `count` be the number of all query results (before skip/limit),
  // or `items.length`?
  return {
    count: items.length,
    items,
    pageInfo: {
      currentPage,
      hasNextPage,
      hasPreviousPage,
      itemCount: count,
      pageCount,
      perPage: limit,
    },
  }
}

module.exports = { paginate, getPaginationTC }
