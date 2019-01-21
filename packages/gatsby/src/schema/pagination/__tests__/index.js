const { paginate } = require(`..`)

describe(`Paginate query results`, () => {
  const results = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]

  it(`returns results`, async () => {
    const args = { limit: 1 }
    const nodes = paginate(results, args).edges.map(({ node }) => node)
    expect(nodes).toEqual([results[0]])
  })

  it(`returns next and previos nodes`, async () => {
    const args = { limit: 3 }
    const next = paginate(results, args).edges.map(({ next }) => next)
    const prev = paginate(results, args).edges.map(({ previous }) => previous)
    expect(next).toEqual([results[1], results[2], undefined])
    expect(prev).toEqual([undefined, results[0], results[1]])
  })

  it(`returns correct pagination info with limit only`, async () => {
    const args = { limit: 2 }
    const { pageInfo, totalCount } = paginate(results, args)
    expect(totalCount).toBe(2)
    expect(pageInfo).toEqual({
      currentPage: 1,
      hasNextPage: true,
      hasPreviousPage: false,
      itemCount: 4,
      pageCount: 2,
      perPage: 2,
    })
  })

  it(`returns correct pagination info with skip and limit`, async () => {
    const args = { skip: 1, limit: 2 }
    const { pageInfo, totalCount } = paginate(results, args)
    expect(totalCount).toBe(2)
    expect(pageInfo).toEqual({
      currentPage: 2,
      hasNextPage: true,
      hasPreviousPage: true,
      itemCount: 4,
      pageCount: 3,
      perPage: 2,
    })
  })

  it(`returns correct pagination info with skip and limit`, async () => {
    const args = { skip: 2, limit: 2 }
    const { pageInfo, totalCount } = paginate(results, args)
    expect(totalCount).toBe(2)
    expect(pageInfo).toEqual({
      currentPage: 2,
      hasNextPage: false,
      hasPreviousPage: true,
      itemCount: 4,
      pageCount: 2,
      perPage: 2,
    })
  })

  it(`returns correct pagination info with skip only`, async () => {
    const args = { skip: 1 }
    const { pageInfo, totalCount } = paginate(results, args)
    expect(totalCount).toBe(3)
    expect(pageInfo).toEqual({
      currentPage: 2,
      hasNextPage: false,
      hasPreviousPage: true,
      itemCount: 4,
      pageCount: 2,
      perPage: undefined,
    })
  })
})
