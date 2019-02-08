const {
  GraphQLObjectType,
  GraphQLNonNull,
  GraphQLID,
  GraphQLString,
  GraphQLList,
} = require(`graphql`)

jest.mock(`../../utils/node-tracking`)

const { findMany, findOne } = require(`../../resolvers/resolvers`)

const { store } = require(`../../../redux`)
require(`../../../db/__tests__/fixtures/ensure-loki`)()

const makeNodes = () => [
  {
    id: `id_1`,
    string: `foo`,
    internal: {
      type: `NotTest`,
    },
    children: [],
  },
  {
    id: `id_2`,
    string: `bar`,
    internal: {
      type: `Test`,
    },
    children: [],
  },
  {
    id: `id_3`,
    string: `baz`,
    internal: {
      type: `Test`,
    },
    children: [],
  },
  {
    id: `id_4`,
    string: `qux`,
    internal: {
      type: `Test`,
    },
    children: [],
    first: {
      willBeResolved: `willBeResolved`,
      second: [
        {
          willBeResolved: `willBeResolved`,
          third: {
            foo: `foo`,
          },
        },
      ],
    },
  },
]

let buildSchema
const runQuery = async (args, nodes = makeNodes(), firstResultOnly) => {
  for (const node of nodes) {
    store.dispatch({ type: `CREATE_NODE`, payload: node })
  }

  const schema = await buildSchema()

  const context = { path: `foo` }
  const resolver = firstResultOnly ? findOne : findMany
  return resolver(`Test`)({ args, context, info: { schema } })
}

beforeEach(() => {
  store.dispatch({ type: `DELETE_CACHE` })
  const { schemaComposer } = require(`graphql-compose`)
  schemaComposer.clear()
  const TestTC = schemaComposer.createTC({
    name: `Test`,
    fields: {
      id: `ID!`,
      string: `String`,
      first: schemaComposer.createTC({
        name: `First`,
        fields: {
          willBeResolved: {
            type: `String`,
            resolve: () => `resolvedValue`,
          },
          second: {
            type: [
              schemaComposer.createTC({
                name: `Second`,
                fields: {
                  willBeResolved: {
                    type: `String`,
                    resolve: () => `resolvedValue`,
                  },
                  third: schemaComposer.createTC({
                    name: `Third`,
                    fields: {
                      foo: `String`,
                    },
                  }),
                },
              }),
            ],
          },
        },
      }),
    },
  })
  schemaComposer.Query.addFields({ test: TestTC })
  jest.isolateModules(() => {
    buildSchema = require(`../../schema`).buildSchema
  })
})

describe(`run-sift`, () => {
  describe(`filters by just id correctly`, () => {
    it(`eq operator`, async () => {
      const queryArgs = { id: { eq: `id_2` } }
      const nodes = makeNodes()

      const resultSingular = await runQuery(queryArgs, nodes, true)
      const resultMany = await runQuery({ filter: queryArgs }, nodes)

      expect(resultSingular).toEqual(nodes[1])
      expect(resultMany).toEqual([nodes[1]])
    })

    it(`eq operator honors type`, async () => {
      const queryArgs = { id: { eq: `id_1` } }
      const nodes = makeNodes()

      const resultSingular = await runQuery(queryArgs, nodes, true)
      const resultMany = await runQuery({ filter: queryArgs }, nodes)

      // `id-1` node is not of queried type, so results should be empty
      expect(resultSingular).toEqual(null)
      expect(resultMany).toEqual([])
    })

    it(`non-eq operator`, async () => {
      const queryArgs = { id: { ne: `id_2` } }
      const nodes = makeNodes()

      const resultSingular = await runQuery(queryArgs, nodes, true)
      const resultMany = await runQuery({ filter: queryArgs }, nodes)

      expect(resultSingular).toEqual(nodes[2])
      expect(resultMany).toEqual([nodes[2], nodes[3]])
    })
  })

  it(`resolves fields before querying`, async () => {
    const queryArgs = {
      first: {
        willBeResolved: { eq: `resolvedValue` },
        second: {
          elemMatch: {
            willBeResolved: { eq: `resolvedValue` },
            third: {
              foo: { eq: `foo` },
            },
          },
        },
      },
    }

    const nodes = makeNodes()
    const result = await runQuery(queryArgs, nodes, true)

    expect(result.id).toBe(`id_4`)
  })
})
