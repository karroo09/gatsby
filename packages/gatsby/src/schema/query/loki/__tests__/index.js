if (process.env.GATSBY_DB_NODES === `loki`) {
  const { store } = require(`../../../../redux`)
  const { getNodeTypeCollection } = require(`../../../../db/loki/nodes`)
  const lokiDb = require(`../../../../db/loki/index`)
  const { findMany } = require(`../../../resolvers`)
  const { range } = require(`../../../utils`)

  function makeNodes() {
    return [
      {
        id: `1`,
        internal: { type: `Test` },
        children: [],
        foo: `bar`,
      },
    ]
  }

  let buildSchema

  const runQueries = async (nodes, n) => {
    for (const node of nodes) {
      store.dispatch({ type: `CREATE_NODE`, payload: node })
    }

    const schema = await buildSchema()

    const args = { filter: { foo: { eq: `bar` } } }

    return Promise.all(
      range(n).map(() => findMany(`Test`)({ args, info: { schema } }))
    )
  }

  describe(`query indexing`, () => {
    beforeEach(async () => {
      await lokiDb.start()
      store.dispatch({ type: `DELETE_CACHE` })
      const { schemaComposer } = require(`graphql-compose`)
      schemaComposer.clear()
      jest.isolateModules(() => {
        buildSchema = require(`../../../schema`).buildSchema
      })
    })

    it(`does not create index when query run 1 time`, async () => {
      await runQueries(makeNodes(), 1)
      const coll = getNodeTypeCollection(`Test`)
      expect(coll.binaryIndices.hasOwnProperty(`foo`)).toEqual(false)
    })

    it(`creates index when query run 5 times`, async () => {
      await runQueries(makeNodes(), 5)
      const coll = getNodeTypeCollection(`Test`)
      expect(coll.binaryIndices.hasOwnProperty(`foo`)).toEqual(true)
    })
  })
} else {
  it(`skipping loki nodes-query-test`, () => {
    expect(true).toEqual(true)
  })
}
