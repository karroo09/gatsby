const { findMany } = require(`../resolvers`)

const paginate = type => async rp => {
  const results = await findMany(type)(rp)
  const { skip = 0, limit } = rp.args
  const count = results.length
  const items = results.slice(skip, limit && skip + limit)

  // const { page = 1, perPage } = rp.args
  // const pageCount = Math.ceil(count / perPage)
  // const currentPage = page
  // const hasPreviousPage = page > 1
  // const hasNextPage = page * perPage < count // currentPage < pageCount

  const pageCount = limit
    ? Math.ceil(skip / limit) + Math.ceil((count - skip) / limit)
    : 1
  const currentPage = limit ? Math.ceil(skip / limit) + 1 : 1 // Math.min(currentPage, pageCount)
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

module.exports = { paginate }
