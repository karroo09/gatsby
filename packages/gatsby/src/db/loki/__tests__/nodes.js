if (process.env.GATSBY_DB_NODES === `loki`) {
  const { createNodesDb } = require(`..`)
  const { store } = require(`../../../redux`)

  const createNode = () => {
    return {
      id: `1`,
      foo: `bar`,
      internal: { type: `Test` },
    }
  }

  describe(`node`, () => {
    let nodesDb
    beforeAll(() => {
      nodesDb = createNodesDb()
    })

    beforeEach(() => {
      store.dispatch({ type: `DELETE_CACHE` })
    })

    it(`should create node`, () => {
      const node = createNode()
      store.dispatch({ type: `CREATE_NODE`, payload: node })

      const collection = nodesDb.getCollection(`nodes`)
      const createdNode = collection.by(`id`, node.id)
      expect(createdNode).toBe(node)

      const view = collection.getDynamicView(node.internal.type)
      expect(view).toBeDefined()
    })

    it(`should delete node`, () => {
      const node = createNode()
      store.dispatch({ type: `CREATE_NODE`, payload: node })
      store.dispatch({ type: `DELETE_NODE`, payload: node })

      const collection = nodesDb.getCollection(`nodes`)
      const nonExistingNode = collection.by(`id`, node.id)
      expect(nonExistingNode).toBeUndefined()

      // Should we remove DynamicView when no more nodes of a type in store?
      // const view = collection.getDynamicView(node.internal.type)
      // expect(view).toBeUndefined()
    })
  })
} else {
  it(`skipping loki nodes test`, () => {
    expect(true).toEqual(true)
  })
}
