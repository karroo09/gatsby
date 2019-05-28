const LokiDb = require(`../store`)

const type = `Test`
const node = {
  id: `1`,
  foo: `bar`,
  internal: { type },
}

describe(`node`, () => {
  let db
  beforeEach(async () => {
    db = new LokiDb()
    await db.start()
  })

  it(`should create node ID index`, () => {
    db.create(node)
    const nodeMetaColl = db.metaCollection
    expect(nodeMetaColl).toBeDefined()
    const nodeMeta = nodeMetaColl.by(`id`, node.id)
    expect(nodeMeta).toEqual({ $loki: 1, id: `1`, type: `Test` })
    const nodeTypeColl = db.db.getCollection(type)
    expect(nodeTypeColl).toBeDefined()
    expect(nodeTypeColl.name).toEqual(type)
    expect(nodeTypeColl.by(`id`, node.id)).toEqual(node)
  })

  it(`should delete node ID index`, () => {
    db.delete(node)
    const nodeMetaColl = db.metaCollection
    const nodeMeta = nodeMetaColl.by(`id`, node.id)
    expect(nodeMeta).toBeUndefined()
  })
})
