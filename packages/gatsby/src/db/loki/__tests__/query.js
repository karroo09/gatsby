if (process.env.GATSBY_DB_NODES === `loki`) {
  const _ = require(`lodash`)
  const { SchemaComposer } = require(`graphql-compose`)
  const { store } = require(`../../../redux`)
  const { createNodesDb } = require(`../..`)

  const makeNodes = () => [
    {
      id: `1`,
      internal: { type: `Test` },
      children: [],
      foo: `bar`,
    },
  ]

  describe(`query indexing`, () => {
    let db
    beforeEach(async () => {
      db = await createNodesDb()
      store.dispatch({ type: `DELETE_CACHE` })
    })

    const runQueries = async (nodes, n) => {
      for (const node of nodes) {
        store.dispatch({ type: `CREATE_NODE`, payload: node })
      }

      const sc = new SchemaComposer()
      sc.createTC(`type Test { foo: String }`)
      sc.Query.addFields({ test: { type: `Test`, resolve: () => `Test` } })
      const schema = sc.buildSchema()
      const type = schema.getType(`Test`)

      const query = { filter: { foo: { eq: `bar` } } }
      const args = { query, types: [type], schema }
      return await Promise.all(_.map(new Array(n), () => db.runQuery(args)))
    }

    it(`does not create index when query run 1 time`, async () => {
      debugger
      await runQueries(makeNodes(), 1)
      const coll = db.db.getCollection(`Test`)
      expect(coll.binaryIndices.hasOwnProperty(`foo`)).toEqual(false)
    })

    it(`creates index when query run 5 times`, async () => {
      await runQueries(makeNodes(), 5)
      const coll = db.db.getCollection(`Test`)
      expect(coll.binaryIndices.hasOwnProperty(`foo`)).toEqual(true)
    })
  })
} else {
  it(`skipping loki nodes-query-test`, () => {
    expect(true).toEqual(true)
  })
}
