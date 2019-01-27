const { graphql } = require(`graphql`)

const { store } = require(`../../../redux`)
// FIXME: enable after rebase on current master
// require(`../../../db/__tests__/fixtures/ensure-loki`)()

const makeNodes = () => [
  { id: `child_1`, internal: { type: `Child` }, hair: `brown`, children: [] },
  {
    id: `child_2`,
    internal: { type: `Child` },
    children: [],
    hair: `blonde`,
    height: 101,
  },
  {
    id: `linked_A`,
    internal: { type: `Linked_A` },
    children: [],
    array: [{ linked___NODE: `linked_B` }],
    single: { linked___NODE: `linked_B` },
  },
  { id: `linked_B`, internal: { type: `Linked_B` }, children: [] },
]

describe(`[legacy] filtering on linked nodes`, () => {
  let buildSchema

  async function runQuery(query, nodes = makeNodes()) {
    for (const node of nodes) {
      store.dispatch({ type: `CREATE_NODE`, payload: node })
    }

    const schema = await buildSchema()

    const context = { path: `foo` }
    const { data, errors } = await graphql(schema, query, context, context)
    expect(errors).not.toBeDefined()
    return data
  }

  beforeEach(() => {
    store.dispatch({ type: `DELETE_CACHE` })
    const { schemaComposer } = require(`graphql-compose`)
    schemaComposer.clear()
    jest.isolateModules(() => {
      buildSchema = require(`../../schema`).buildSchema
    })
  })

  it(`filters on linked nodes via id`, async () => {
    const nodes = makeNodes().concat([
      {
        id: `child_2_link`,
        internal: { type: `Test` },
        children: [],
        linked___NODE: `child_2`,
        foo: `bar`,
      },
      {
        id: `child_1_linked`,
        internal: { type: `Test` },
        children: [],
        linked___NODE: `child_1`,
        foo: `baz`,
      },
    ])
    const result = await runQuery(
      `
        {
          allTest(filter: { linked: { hair: { eq: "blonde" } } }) {
            edges { node { linked { hair, height }, foo } }
          }
        }
      `,
      nodes
    )
    expect(result.allTest.edges.length).toEqual(1)
    expect(result.allTest.edges[0].node.linked.hair).toEqual(`blonde`)
    expect(result.allTest.edges[0].node.linked.height).toEqual(101)
    expect(result.allTest.edges[0].node.foo).toEqual(`bar`)
  })

  it(`returns nested linked fields`, async () => {
    const nodes = [
      {
        id: `child_2`,
        internal: { type: `Child` },
        children: [],
        hair: `blonde`,
        height: 101,
      },
      {
        id: `child_1_link`,
        internal: { type: `Test` },
        children: [],
        nested: {
          linked___NODE: `child_2`,
        },
        foo: `bar`,
      },
    ]
    const result = await runQuery(
      `
        {
          allTest(filter: { nested: { linked: { hair: { eq: "blonde" } } } }) {
            edges { node { nested { linked { hair, height } }, foo } }
          }
        }
      `,
      nodes
    )
    expect(result.allTest.edges[0].node.nested.linked.hair).toEqual(`blonde`)
    expect(result.allTest.edges[0].node.nested.linked.height).toEqual(101)
    expect(result.allTest.edges[0].node.foo).toEqual(`bar`)
  })

  it(`returns all matching linked nodes`, async () => {
    const nodes = makeNodes().concat([
      {
        id: `child_2_link`,
        internal: { type: `Test` },
        children: [],
        linked___NODE: `child_2`,
        foo: `bar`,
      },
      {
        id: `child_2_link2`,
        internal: { type: `Test` },
        children: [],
        linked___NODE: `child_2`,
        foo: `baz`,
      },
    ])
    const result = await runQuery(
      `
        {
          allTest(filter: { linked: { hair: { eq: "blonde" } } }) {
            edges { node { linked { hair, height }, foo } }
          }
        }
      `,
      nodes
    )
    expect(result.allTest.edges[0].node.linked.hair).toEqual(`blonde`)
    expect(result.allTest.edges[0].node.linked.height).toEqual(101)
    expect(result.allTest.edges[0].node.foo).toEqual(`bar`)
    expect(result.allTest.edges[1].node.foo).toEqual(`baz`)
  })

  it(`handles elemMatch operator`, async () => {
    const nodes = makeNodes().concat([
      {
        id: `1`,
        internal: { type: `Test` },
        children: [],
        linked___NODE: [`child_1`, `child_2`],
        foo: `bar`,
      },
      {
        id: `2`,
        internal: { type: `Test` },
        children: [],
        linked___NODE: [`child_1`],
        foo: `baz`,
      },
      {
        id: `3`,
        internal: { type: `Test` },
        children: [],
        linked___NODE: [`child_2`],
        foo: `foo`,
      },
      {
        id: `4`,
        internal: { type: `Test` },
        children: [],
        array: [{ linked___NODE: [`child_1`, `child_2`] }],
        foo: `lorem`,
      },
      {
        id: `5`,
        internal: { type: `Test` },
        children: [],
        array: [{ linked___NODE: [`child_1`] }, { linked___NODE: [`child_2`] }],
        foo: `ipsum`,
      },
      {
        id: `6`,
        internal: { type: `Test` },
        children: [],
        array: [{ linked___NODE: [`child_1`] }],
        foo: `sit`,
      },
      {
        id: `7`,
        internal: { type: `Test` },
        children: [],
        array: [{ linked___NODE: [`child_2`] }],
        foo: `dolor`,
      },
      {
        id: `8`,
        internal: { type: `Test` },
        children: [],
        foo: `ipsum`,
      },
    ])
    const result = await runQuery(
      `
        {
          eq:allTest(filter: { linked: { elemMatch: { hair: { eq: "brown" } } } }) {
            edges { node { foo } }
          }
          in:allTest(filter: { linked: { elemMatch: { hair: { in: ["brown", "blonde"] } } } }) {
            edges { node { foo } }
          }
          insideInlineArrayEq:allTest(filter: { array: { elemMatch: { linked: { elemMatch: { hair: { eq: "brown" } } } } } }) {
            edges { node { foo } }
          }
          insideInlineArrayIn:allTest(filter: { array: { elemMatch: { linked: { elemMatch: { hair: { in: ["brown", "blonde"] } } } } } }) {
            edges { node { foo } }
          }
        }
      `,
      nodes
    )

    const itemToEdge = item => ({ node: { foo: item } })

    expect(result.eq.edges).toEqual([`bar`, `baz`].map(itemToEdge))
    expect(result.in.edges).toEqual([`bar`, `baz`, `foo`].map(itemToEdge))
    expect(result.insideInlineArrayEq.edges).toEqual(
      [`lorem`, `ipsum`, `sit`].map(itemToEdge)
    )
    expect(result.insideInlineArrayIn.edges).toEqual(
      [`lorem`, `ipsum`, `sit`, `dolor`].map(itemToEdge)
    )
  })

  it(`doesn't mutate node object`, async () => {
    // We now infer the InputObjectType from the ObjectType, not from exampleValue
  })

  it(`skips fields with missing nodes`, async () => {
    // We now infer the InputObjectType from the ObjectType, not from exampleValue
  })
})
