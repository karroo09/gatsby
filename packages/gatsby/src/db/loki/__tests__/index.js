const { createNodesDb } = require(`..`)

describe(`nodes db`, () => {
  let nodesDb
  beforeAll(() => {
    nodesDb = createNodesDb()
  })

  it(`should create nodes collection`, () => {
    const collection = nodesDb.getCollection(`nodes`)
    expect(collection).toBeDefined()
  })
})
