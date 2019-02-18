const { graphql } = require(`graphql`)
const { store } = require(`../../redux`)
const { build } = require(`../index`)
const withResolverContext = require(`../context`)
require(`../../db/__tests__/fixtures/ensure-loki`)()

jest.mock(`../../utils/api-runner-node`)
const apiRunnerNode = require(`../../utils/api-runner-node`)

const nodes = [
  {
    id: `file1`,
    parent: null,
    children: [`foo1`],
    internal: {
      type: `File`,
      contentDigest: `file1`,
    },
    name: `foo`,
  },
  {
    id: `file2`,
    parent: null,
    children: [`bar1`],
    internal: {
      type: `File`,
      contentDigest: `file2`,
    },
    name: `bar`,
  },
  {
    id: `foo1`,
    parent: `file1`,
    children: [],
    internal: {
      type: `Foo`,
      contentDigest: `foo1`,
    },
    foo: 3,
    foobar: 1,
  },
  {
    id: `bar1`,
    parent: `file2`,
    children: [],
    internal: {
      type: `Bar`,
      contentDigest: `bar1`,
    },
    bar: 2,
    foobar: 1,
  },
  {
    id: `custom`,
    parent: null,
    children: [],
    internal: {
      type: `Custom`,
      contentDigest: `custom`,
    },
    foo: 3,
    bar: 2,
    foobar: 1,
    allFoobar: 1,
    fbUnion: 1,
    allFBUnion: 1,
  },
]

const typeDefs = `
  interface FooBarIFace {
    foobar: Int
  }

  union FooBarUnion = Foo | Bar

  type Foo implements FooBarIFace & Node {
    foobar: Int
    foo: Int
  }

  type Bar implements FooBarIFace & Node {
    foobar: Int
    bar: Int
  }

  type Custom implements Node {
    foo: Foo
    bar: Bar
    foobar: FooBarIFace
    allFoobar: [FooBarIFace]
    fbUnion: FooBarUnion
    allFBUnion: [FooBarUnion]
  }
`

const mockAddResolvers = ({ addResolvers }) => {
  addResolvers({
    Custom: {
      foo: {
        resolve(source, args, context, info) {
          const fieldValue = source[info.fieldName]
          const nodes = context.nodeModel.getAllNodes({ type: `Foo` })
          return nodes.find(node => node.foo === fieldValue)
        },
      },
      bar: {
        resolve(source, args, context, info) {
          const fieldValue = source[info.fieldName]
          const nodes = context.nodeModel.getAllNodes({ type: `Bar` })
          return nodes.find(node => node.bar === fieldValue)
        },
      },
      foobar: {
        resolve(source, args, context, info) {
          const fieldValue = source[info.fieldName]
          const nodes = context.nodeModel.getAllNodes({ type: `FooBarIFace` })
          return nodes.find(node => node.foobar === fieldValue)
        },
      },
      allFoobar: {
        resolve(source, args, context, info) {
          const fieldValue = source[info.fieldName]
          // Needed because a field will already be resolved when included in the input filter
          if (fieldValue == null || Array.isArray(fieldValue)) {
            return fieldValue
          }
          const nodes = context.nodeModel.getAllNodes({ type: `FooBarIFace` })
          return nodes.filter(node => node.foobar === fieldValue)
        },
      },
      fbUnion: {
        resolve(source, args, context, info) {
          const fieldValue = source[info.fieldName]
          const nodes = context.nodeModel.getAllNodes({ type: `FooBarUnion` })
          return nodes.find(node => node.foobar === fieldValue)
        },
      },
      allFBUnion: {
        resolve(source, args, context, info) {
          const fieldValue = source[info.fieldName]
          const nodes = context.nodeModel.getAllNodes({ type: `FooBarUnion` })
          return nodes.filter(node => node.foobar === fieldValue)
        },
      },
    },
  })
}

describe(`Abstract types`, () => {
  let schema

  const runQuery = query =>
    graphql(schema, query, undefined, withResolverContext({}, schema))

  beforeAll(async () => {
    apiRunnerNode.mockImplementation((api, ...args) => {
      if (api === `addResolvers`) {
        return mockAddResolvers(...args)
      } else {
        return []
      }
    })

    store.dispatch({ type: `DELETE_CACHE` })
    nodes.forEach(node =>
      store.dispatch({ type: `CREATE_NODE`, payload: node })
    )

    store.dispatch({
      type: `ADD_TYPE_DEFS`,
      payload: typeDefs,
    })

    await build({})
    schema = store.getState().schema
  })

  it(`handles linking to interfaces and unions`, async () => {
    const query = `
      {
        foo { id, foo }
        bar { id, bar }
        custom {
          foo { id, foo }
          bar { id, bar }
          foobar {
            foobar
            ... on Foo { id, foo }
            ... on Bar { id, bar }
          }
          allFoobar {
            foobar
            ... on Foo { id, foo }
            ... on Bar { id, bar }
          }
          fbUnion {
            ... on Foo { id, foo }
            ... on Bar { id, bar }
          }
          allFBUnion {
            ... on Foo { id, foo }
            ... on Bar { id, bar }
          }
        }
      }
    `
    const results = await runQuery(query)
    const expected = {
      foo: { id: `foo1`, foo: 3 },
      bar: { id: `bar1`, bar: 2 },
      custom: {
        foo: { id: `foo1`, foo: 3 },
        bar: { id: `bar1`, bar: 2 },
        foobar: { id: `foo1`, foobar: 1, foo: 3 },
        allFoobar: [
          { id: `foo1`, foobar: 1, foo: 3 },
          { id: `bar1`, foobar: 1, bar: 2 },
        ],
        fbUnion: { id: `foo1`, foo: 3 },
        allFBUnion: [{ id: `foo1`, foo: 3 }, { id: `bar1`, bar: 2 }],
      },
    }
    expect(results.errors).toBeUndefined()
    expect(results.data).toEqual(expected)
  })

  it(`handles querying for interface fields`, async () => {
    const query = `
      {
        custom(
          allFoobar: {
            elemMatch: { foobar: { eq: 1 } }
          }
        ) {
          allFoobar {
            foobar
            ... on Bar { id }
          }
        }
      }
    `
    const results = await runQuery(query)
    const expected = {
      custom: {
        allFoobar: [
          {
            foobar: 1,
          },
          {
            id: `bar1`,
            foobar: 1,
          },
        ],
      },
    }
    expect(results.errors).toBeUndefined()
    expect(results.data).toEqual(expected)
  })
})
