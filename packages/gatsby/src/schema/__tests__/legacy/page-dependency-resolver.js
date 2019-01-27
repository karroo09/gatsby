const pageDependencyResolver = require(`../../resolvers/page-dependencies`)

describe(`[legacy] page-dependency-resolver`, () => {
  it(`should handle nulls in results`, async () => {
    const innerResolver = () => () => [null]
    const resolver = pageDependencyResolver(innerResolver)
    const result = await resolver()({}, {})
    expect(result).toEqual([null])
  })
})
