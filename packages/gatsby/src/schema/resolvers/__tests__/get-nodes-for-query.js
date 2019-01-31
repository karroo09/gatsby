const { TypeComposer, schemaComposer } = require(`graphql-compose`)
const { GraphQLBoolean, GraphQLSchema } = require(`graphql`)

const getNodesForQuery = require(`../get-nodes-for-query`)
const getQueryFields = require(`../get-query-fields`)

const nodes = [
  { id: 1, internal: { type: `Foo` }, bool: true, array: [0, 1] },
  {
    id: 2,
    internal: { type: `Foo` },
    bool: false,
    array: [2, 3],
    withResolver: null,
    added: [[{ added: true }, { added: true }], [{ added: true }]],
  },
  {
    id: 3,
    internal: { type: `Foo` },
    bool: true,
    array: [4, 5],
    withResolver: `foo`,
    deeply: [
      [{ nested: [true, false], nestedResolver: `foo` }, { counter: true }],
      [{ nestedResolver: `foo` }, { nestedResolver: `foo`, counter: true }],
    ],
  },
  {
    id: 4,
    internal: { type: `Sparse` },
    null: null,
    sparse: [null, null],
    sparseResolver: true,
  },
  {
    id: 100,
    internal: { type: `Arg` },
    arg: 1,
  },
]

const getNodesByType = type => nodes.filter(n => n.internal.type === type)

const { trackObjects } = require(`../../utils/node-tracking`)
jest.mock(`../../utils/node-tracking`)

const counter = jest.fn()

TypeComposer.create({
  name: `Foo`,
  fields: {
    id: `ID!`,
    internal: `type Internal { type: String! }`,
    bool: `Boolean`,
    array: `[Int!]!`,
    withResolver: {
      type: `String`,
      resolve: () => `bar`,
    },
    deeply: [
      [
        TypeComposer.create({
          name: `Nested`,
          fields: {
            counter: {
              type: `Boolean`,
              resolve: counter,
            },
            nested: `[Boolean!]`,
            nestedResolver: {
              type: `[String!]!`,
              resolve: () => [`foo`],
            },
          },
        }),
      ],
    ],
    added: [
      [
        TypeComposer.create({
          name: `Added`,
          fields: {
            added: {
              type: `Foo`,
              resolve: () => ({
                deeply: [
                  [{ nestedResolver: true }, { counter: true }],
                  [{ nestedResolver: true }, { counter: true }],
                ],
              }),
            },
          },
        }),
      ],
    ],
  },
})

TypeComposer.create({
  name: `Sparse`,
  fields: {
    null: `Boolean`,
    sparse: [`Int`],
    sparseResolver: {
      type: [[`Foo`]],
      resolve: () => [null, [null, null]],
    },
  },
})

TypeComposer.create({
  name: `Arg`,
  fields: {
    arg: {
      type: `Int`,
      args: {
        arg: { type: `Int`, defaultValue: 2 },
      },
      resolve: (source, args) => args.arg,
    },
  },
})

schemaComposer.Query.addFields({ foo: `Foo`, sparse: `Sparse`, arg: `Arg` })
const schema = schemaComposer.buildSchema()

describe(`Get nodes for query`, () => {
  describe(`Development build`, () => {
    it(`caches single node`, async () => {
      const typeName = `Foo`
      const type = schema.getType(typeName)
      const filter = { id: { ne: 0 }, array: { nin: [10] } }

      const nodes = getNodesByType(typeName)
      const queryFields = getQueryFields({ args: { filter } })
      const queryNodes = await getNodesForQuery(
        type,
        nodes,
        queryFields,
        {},
        schema
      )
      const sameQueryNodes = await getNodesForQuery(
        type,
        nodes,
        queryFields,
        {},
        schema
      )
      expect(queryNodes[0]).toBe(sameQueryNodes[0])
    })

    it(`tracks objects`, async () => {
      trackObjects.mockReset()

      const typeName = `Foo`
      const type = schema.getType(typeName)
      const nodes = getNodesByType(typeName)

      const filter = { id: { eq: 0 }, withResolver: { ne: `` } }
      const queryFields = getQueryFields({ args: { filter } })
      await getNodesForQuery(type, nodes, queryFields, {}, schema)
      expect(trackObjects).toHaveBeenCalledTimes(3)
    })

    it(`resolves resolver function for non-null filter fields`, async () => {
      const typeName = `Foo`
      const type = schema.getType(typeName)
      const filter = { withResolver: { ne: `qux` } }

      const nodes = getNodesByType(typeName)
      const queryFields = getQueryFields({ args: { filter } })
      const queryNodes = await getNodesForQuery(
        type,
        nodes,
        queryFields,
        {},
        schema
      )
      expect(queryNodes).not.toEqual(nodes)

      expect(nodes[0].withResolver).toBeUndefined()
      expect(queryNodes[0].withResolver).toBe(`bar`)

      expect(nodes[1].withResolver).toBeNull()
      expect(queryNodes[1].withResolver).toBe(`bar`)

      expect(nodes[2].withResolver).toBe(`foo`)
      expect(queryNodes[2].withResolver).toBe(`bar`)
    })

    it(`resolves resolver function for nested non-null filter fields`, async () => {
      const typeName = `Foo`
      const type = schema.getType(typeName)
      const filter = {
        deeply: {
          counter: { eq: true },
          nested: { eq: true },
          nestedResolver: { eq: true },
        },
      }

      const nodes = getNodesByType(typeName)
      const queryFields = getQueryFields({ args: { filter } })
      const queryNodes = await getNodesForQuery(
        type,
        nodes,
        queryFields,
        {},
        schema
      )

      expect(nodes[0].deeply).toBeUndefined()
      expect(queryNodes[0].deeply).toBeUndefined()

      expect(counter).toHaveBeenCalledTimes(4)
      expect(counter.mock.calls[0][3]).toEqual({
        fieldName: `counter`,
        parentType: schemaComposer.get(`Nested`).getType(),
        returnType: GraphQLBoolean,
        schema: expect.any(GraphQLSchema),
      })

      expect(nodes[2].deeply[0][0].nested).toEqual([true, false])
      expect(queryNodes[2].deeply[0][0].nested).toEqual([true, false])

      expect(nodes[2].deeply[0][0].nestedResolver).toBe(`foo`)
      expect(queryNodes[2].deeply[0][0].nestedResolver).toEqual([`foo`])
    })

    it(`does not mutate nodes`, async () => {
      const typeName = `Foo`
      const type = schema.getType(typeName)
      const filter = {
        array: { nin: [10] },
        withResolver: { eq: true },
        deeply: { nestedResolver: { eq: true } },
      }
      const queryFields = getQueryFields({ args: { filter } })

      const nodes = getNodesByType(typeName)
      const nodesCopy = JSON.parse(JSON.stringify(nodes))
      await getNodesForQuery(type, nodes, queryFields, {}, schema)
      expect(nodes).toEqual(nodesCopy)
    })

    it(`handles filter on field added by resolver`, async () => {
      counter.mockReset()

      const typeName = `Foo`
      const type = schema.getType(typeName)
      const filter = {
        added: {
          added: {
            deeply: {
              counter: { eq: true },
              nested: { eq: true },
              nestedResolver: { eq: true },
            },
          },
        },
      }

      const nodes = getNodesByType(typeName)
      const queryFields = getQueryFields({ args: { filter } })
      const queryNodes = await getNodesForQuery(
        type,
        nodes,
        queryFields,
        {},
        schema
      )

      expect(counter).toHaveBeenCalledTimes(12)
      expect(
        queryNodes[1].added[0][0].added.deeply[0][0].nestedResolver
      ).toEqual([`foo`])
      expect(
        queryNodes[1].added[1][0].added.deeply[1][0].nestedResolver
      ).toEqual([`foo`])
      expect(
        queryNodes[1].added[0][1].added.deeply[0][0].nestedResolver
      ).toEqual([`foo`])
    })

    it(`handles sparse array of arrays`, async () => {
      const typeName = `Sparse`
      const type = schema.getType(typeName)
      const filter = {
        null: { eq: true },
        sparse: { eq: true },
        sparseResolver: { eq: true },
      }

      const nodes = getNodesByType(typeName)
      const queryFields = getQueryFields({ args: { filter } })
      const queryNodes = await getNodesForQuery(
        type,
        nodes,
        queryFields,
        {},
        schema
      )
      expect(queryNodes[0].null).toBeNull()
      expect(queryNodes[0].sparse[0]).toBeNull()
      expect(queryNodes[0].sparseResolver[0]).toBeNull()
      expect(queryNodes[0].sparseResolver[1][0]).toBeNull()
    })

    it(`passes default values to the resolver`, async () => {
      const typeName = `Arg`
      const type = schema.getType(typeName)
      const filter = { arg: { eq: true } }

      const nodes = getNodesByType(typeName)
      const queryFields = getQueryFields({ args: { filter } })
      const queryNodes = await getNodesForQuery(
        type,
        nodes,
        queryFields,
        {},
        schema
      )
      expect(queryNodes[0].arg).toBe(2)
    })
  })

  describe(`Production build`, () => {
    jest.resetModules()

    const getNodesForQuery = require(`../get-nodes-for-query`)

    jest.mock(`../../utils/is-production-build`, () => true)

    const nodes = [{ id: 1, internal: { type: `Foo` } }]

    const { TypeComposer } = require(`graphql-compose`)
    TypeComposer.create({
      name: `Foo`,
      fields: {
        id: `ID`,
        withResolver: {
          type: `String`,
          resolve: () => {},
        },
      },
    })

    schemaComposer.Query.addFields({ foo: `Foo` })
    const schema = schemaComposer.buildSchema()

    it(`caches nodes`, async () => {
      const typeName = `Foo`
      const type = schema.getType(typeName)
      const filter = { id: { ne: 0 }, withResolver: { ne: `` } }

      const queryFields = getQueryFields({ args: { filter } })
      const queryNodes = await getNodesForQuery(
        type,
        nodes,
        queryFields,
        {},
        schema
      )
      const sameQueryNodes = await getNodesForQuery(
        type,
        nodes,
        queryFields,
        {},
        schema
      )
      expect(queryNodes).toBe(sameQueryNodes)
    })
  })
})
