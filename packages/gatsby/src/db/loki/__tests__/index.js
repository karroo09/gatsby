const LokiDb = require(`../store`)

describe(`db`, () => {
  let db
  beforeEach(async () => {
    db = new LokiDb()
    await db.start()
  })

  it(`should create meta collection for all nodes`, () => {
    const nodeMetaColl = db.db.getCollection(`gatsby:nodes`)
    expect(nodeMetaColl).toBeDefined()
    expect(db.metaCollection).toBe(nodeMetaColl)
  })
})
