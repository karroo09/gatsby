const { store } = require(`../../redux`)
const { actions } = require(`../../redux/actions`)
const { buildSchema } = require(`../schema`)
const graphql = require(`../../internal-plugins/query-runner/graphql`)

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

nodes.forEach(node => {
  store.dispatch(actions.createNode(node, { name: `test` }))
})

jest.mock(`../../utils/api-runner-node`, () => (api, options) => {
  switch (api) {
    case `addTypeDefs`:
      options.addTypeDefs(`
        interface FooBar {
          foobar: Int
        }

        union FBUnion = Foo | Bar

        type Foo implements FooBar & Node {
          foobar: Int
          foo: Int
        }

        type Bar implements FooBar & Node {
          foobar: Int
          bar: Int
        }

        type Custom implements Node {
          foo: Foo @link(by: "foo")
          bar: Bar @link(by: "bar")
          foobar: FooBar @link(by: "foobar")
          allFoobar: [FooBar] @link(by: "foobar")
          fbUnion: FBUnion @link(by: "foobar")
          allFBUnion: [FBUnion] @link(by: "foobar")
        }
      `)
  }
  return []
})

describe(`Abstract types`, () => {
  beforeAll(async () => {
    const schema = await buildSchema()
    store.dispatch({
      type: `SET_SCHEMA`,
      payload: schema,
    })
  })

  it.only(`handles linking to interfaces and unions`, async () => {
    const query = `
      {
        foo { id }
        bar { id }
        custom {
          foo { id }
          bar { id }
          foobar {
            ... on Foo { id }
            ... on Bar { id }
          }
          allFoobar {
            ... on Foo { id }
            ... on Bar { id }
          }
          fbUnion {
            ... on Foo { id }
            ... on Bar { id }
          }
          allFBUnion {
            ... on Foo { id }
            ... on Bar { id }
          }
        }
      }
    `
    const results = await graphql(query)
    const expected = {
      foo: { id: `foo1` },
      bar: { id: `bar1` },
      custom: {
        foo: { id: `foo1` },
        bar: { id: `bar1` },
        foobar: { id: `foo1` },
        allFoobar: [{ id: `foo1` }, { id: `bar1` }],
        fbUnion: { id: `foo1` },
        allFBUnion: [{ id: `foo1` }, { id: `bar1` }],
      },
    }
    expect(results.errors).toBeUndefined()
    expect(results.data).toEqual(expected)
  })
})
