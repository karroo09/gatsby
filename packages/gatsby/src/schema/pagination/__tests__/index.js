const { paginate } = require(`..`)

describe(`Paginate query results`, () => {
  const results = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]

  it(`returns results`, async () => {
    const args = { limit: 1 }
    const { items } = paginate(results, args)
    expect(items).toEqual([results[0]])
  })

  it(`returns correct pagination info with limit only`, async () => {
    const args = { limit: 2 }
    const { pageInfo, count } = paginate(results, args)
    expect(count).toBe(2)
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
    const { pageInfo, count } = paginate(results, args)
    expect(count).toBe(2)
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
    const { pageInfo, count } = paginate(results, args)
    expect(count).toBe(2)
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
    const { pageInfo, count } = paginate(results, args)
    expect(count).toBe(3)
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
