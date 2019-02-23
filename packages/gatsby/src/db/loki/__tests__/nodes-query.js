if (process.env.GATSBY_DB_NODES === `loki`) {
  const _ = require(`lodash`)
  const { createNodesDb } = require(`..`)
  const { store } = require(`../../../redux`)
  const nodeTypes = require(`../../../schema/build-node-types`)
  const runQuery = require(`../nodes-query`)

  const createNodes = () => {
    return [
      {
        id: `1`,
        internal: { type: `Test` },
        children: [],
        foo: `bar`,
      },
    ]
  }

  const runQueries = (nodes, n) => {
    store.dispatch({ type: `DELETE_CACHE` })
    nodes.forEach(node =>
      store.dispatch({ type: `CREATE_NODE`, payload: node })
    )

    const gqlType = nodeTypes.buildNodeObjectType({
      typeName: `Test`,
      nodes,
      pluginFields: [],
      processedTypes: {},
    })

    const queryArgs = { filter: { foo: { eq: `bar` } } }
    const args = { gqlType, queryArgs }
    return Promise.all(_.map(new Array(n), () => runQuery(args)))
  }

  describe(`query indexing`, () => {
    let nodesDb
    beforeAll(() => {
      nodesDb = createNodesDb()
    })

    it(`does not create index when query run 1 time`, async () => {
      await runQueries(createNodes(), 1)
      const collection = nodesDb.getCollection(`nodes`)
      expect(collection.binaryIndices.hasOwnProperty(`foo`)).toEqual(false)
    })

    it(`creates index when query run 5 times`, async () => {
      await runQueries(createNodes(), 5)
      const collection = nodesDb.getCollection(`nodes`)
      expect(collection.binaryIndices.hasOwnProperty(`foo`)).toEqual(true)
    })
  })
} else {
  it(`skipping loki nodes-query-test`, () => {
    expect(true).toEqual(true)
  })
}
