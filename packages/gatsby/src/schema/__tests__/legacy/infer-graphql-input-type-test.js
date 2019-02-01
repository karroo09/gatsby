const { graphql } = require(`graphql`)

const { store } = require(`../../../redux`)

describe(`[legacy] GraphQL Input args`, () => {
  require(`../../../db/__tests__/fixtures/ensure-loki`)()

  let buildSchema, getInputArgs, addInferredType

  async function runQuery(nodes, query) {
    for (const node of nodes) {
      store.dispatch({ type: `CREATE_NODE`, payload: node })
    }

    const schema = await buildSchema()

    const context = { path: `foo` }
    return graphql(schema, query, context, context)
  }

  beforeEach(() => {
    store.dispatch({ type: `DELETE_CACHE` })
    const { schemaComposer } = require(`graphql-compose`)
    schemaComposer.clear()
    jest.isolateModules(() => {
      buildSchema = require(`../../schema`).buildSchema
      getInputArgs = require(`../../input`).getInputArgs
      addInferredType = require(`../../infer`).addInferredType
    })
  })

  it(`filters out null example values`, async () => {
    let result = await runQuery(
      [
        {
          id: `1`,
          children: [],
          internal: { type: `Bar` },
          foo: null,
          bar: `baz`,
        },
      ],
      `
        {
          allBar(filter: { foo: { eq: "bar" } }) {
            edges { node { bar } }
          }
        }
      `
    )
    expect(result.errors.length).toEqual(1)
    expect(result.errors[0].message).toMatch(
      `Field "foo" is not defined by type BarInput.`
    )
  })

  it(`filters out empty objects`, async () => {
    let result = await runQuery(
      [
        {
          id: `1`,
          children: [],
          internal: { type: `Bar` },
          foo: {},
          bar: `baz`,
        },
      ],
      `
        {
          allBar(filter: { foo: { eq: "bar" } }) {
            edges { node { bar } }
          }
        }
      `
    )
    expect(result.errors.length).toEqual(1)
    expect(result.errors[0].message).toMatch(
      `Field "foo" is not defined by type BarInput.`
    )
  })

  it(`filters out empty arrays`, async () => {
    let result = await runQuery(
      [
        {
          id: `1`,
          children: [],
          internal: { type: `Bar` },
          foo: [],
          bar: `baz`,
        },
      ],
      `
        {
          allBar(filter: { foo: { eq: "bar" } }) {
            edges { node { bar } }
          }
        }
      `
    )
    expect(result.errors.length).toEqual(1)
    expect(result.errors[0].message).toMatch(
      `Field "foo" is not defined by type BarInput.`
    )
  })

  it(`filters out sparse arrays`, async () => {
    let result = await runQuery(
      [
        {
          id: `1`,
          children: [],
          internal: { type: `Bar` },
          foo: [undefined, null, null],
          bar: `baz`,
        },
      ],
      `
        {
          allBar(filter: { foo: { eq: "bar" } }) {
            edges { node { bar } }
          }
        }
      `
    )
    expect(result.errors.length).toEqual(1)
    expect(result.errors[0].message).toMatch(
      `Field "foo" is not defined by type BarInput.`
    )
  })

  it(`uses correct keys for linked fields`, async () => {
    let result = await runQuery(
      [
        {
          id: `1`,
          children: [],
          internal: { type: `Bar` },
          linked___NODE: `baz`,
          foo: `bar`,
        },
        {
          id: `baz`,
          children: [],
          internal: { type: `Bar` },
          foo: `qux`,
        },
      ],
      `
        {
          allBar(filter: { linked___NODE: { foo: "qux" } }) {
            edges { node { linked { id } } }
          }
        }
      `
    )
    expect(result.errors.length).toEqual(1)
    expect(result.errors[0].message).toMatch(
      `Field "linked___NODE" is not defined by type BarInput.`
    )
  })

  it(`Replaces unsupported values in keys`, () => {
    store.dispatch({
      type: `CREATE_NODE`,
      payload: {
        internal: { type: `Test` },
        parent: `parent`,
        children: [`bar`],
        foo: {
          parent: `parent`,
          children: [`bar`],
          "foo-moo": `tasty`,
        },
      },
    })

    const tc = addInferredType(`Test`)
    const inferredFields = getInputArgs(tc)[0]
      .getType()
      .getFields()

    expect(Object.keys(inferredFields.foo.type.getFields())[2]).toEqual(
      `foo_moo`
    )
  })
  it(`Removes specific root fields`, () => {
    // We do *not* remove Node interface fields, they are useful for querying
  })

  it(`infers number types`, () => {
    store.dispatch({
      type: `CREATE_NODE`,
      payload: {
        internal: { type: `Numbers` },
        int32: 42,
        float: 2.5,
        longint: 3000000000,
      },
    })
    const tc = addInferredType(`Numbers`)
    const inferredFields = getInputArgs(tc)[0]
      .getType()
      .getFields()

    expect(inferredFields.int32.type.name).toBe(`IntQueryOperatorInput`)
    expect(inferredFields.float.type.name).toBe(`FloatQueryOperatorInput`)
    expect(inferredFields.longint.type.name).toBe(`FloatQueryOperatorInput`)
  })
})
