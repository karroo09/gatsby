const { SchemaComposer, ObjectTypeComposer } = require(`graphql-compose`)
const { store } = require(`..`)
const { createNodesDb } = require(`../../db/index`)

jest.mock(`../../db/node-tracking`, () => {
  return {
    trackInlineObjectsInRootNode: () => jest.fn(),
  }
})

const nodes = [
  {
    id: `id_1`,
    string: `foo`,
    internal: {
      type: `notTest`,
    },
  },
  {
    id: `id_2`,
    string: `bar`,
    internal: {
      type: `Test`,
    },
  },
  {
    id: `id_3`,
    string: `baz`,
    internal: {
      type: `Test`,
    },
  },
  {
    id: `id_4`,
    string: `qux`,
    internal: {
      type: `Test`,
    },
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

describe(`run-sift`, () => {
  let db
  beforeAll(async () => {
    db = await createNodesDb()
    nodes.forEach(node => {
      store.dispatch({ type: `CREATE_NODE`, payload: node })
    })
  })

  const sc = new SchemaComposer()
  ObjectTypeComposer.create(
    {
      name: `Test`,
      fields: {
        id: `ID!`,
        string: `String`,
        first: `First`,
      },
    },
    sc
  )
  ObjectTypeComposer.create(
    {
      name: `First`,
      fields: {
        willBeResolved: {
          type: `String`,
          resolve: () => `resolvedValue`,
        },
        second: `[Second]`,
      },
    },
    sc
  )
  ObjectTypeComposer.create(
    {
      name: `Second`,
      fields: {
        willBeResolved: {
          type: `String`,
          resolve: () => `resolvedValue`,
        },
        third: `type Third { foo: String }`,
      },
    },
    sc
  )
  sc.Query.addFields({ test: `Test` })
  const schema = sc.buildSchema()
  const type = schema.getType(`Test`)

  describe(`filters by just id correctly`, () => {
    it(`eq operator`, async () => {
      const query = {
        filter: {
          id: { eq: `id_2` },
        },
      }

      const resultSingular = await db.runQuery({
        types: [type],
        query,
        firstOnly: true,
        schema,
      })

      const resultMany = await db.runQuery({
        types: [type],
        query,
        firstOnly: false,
        schema,
      })

      expect(resultSingular).toEqual(nodes[1])
      expect(resultMany).toEqual([nodes[1]])
    })

    it(`eq operator honors type`, async () => {
      const query = {
        filter: {
          id: { eq: `id_1` },
        },
      }

      const resultSingular = await db.runQuery({
        types: [type],
        query,
        firstOnly: true,
        schema,
      })

      const resultMany = await db.runQuery({
        types: [type],
        query,
        firstOnly: false,
        schema,
      })

      // `id-1` node is not of queried type, so results should be empty
      expect(resultSingular).toBeNull()
      expect(resultMany).toEqual([])
    })

    it(`non-eq operator`, async () => {
      const query = {
        filter: {
          id: { ne: `id_2` },
        },
      }

      const resultSingular = await db.runQuery({
        types: [type],
        query,
        firstOnly: true,
        schema,
      })

      const resultMany = await db.runQuery({
        types: [type],
        query,
        firstOnly: false,
        schema,
      })

      expect(resultSingular).toEqual(nodes[2])
      expect(resultMany).toEqual([nodes[2], nodes[3]])
    })
  })

  it(`resolves fields before querying`, async () => {
    const query = {
      filter: {
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
      },
    }

    const result = await db.runQuery({
      types: [type],
      query,
      firstOnly: true,
      schema,
    })

    expect(result).not.toBeNull()
    expect(result.id).toBe(`id_4`)
  })
})
