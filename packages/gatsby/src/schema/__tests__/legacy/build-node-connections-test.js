const { graphql } = require(`graphql`)

const { store } = require(`../../../redux`)
// FIXME: enable after rebase on current master
// require(`../../../db/__tests__/fixtures/ensure-loki`)()

const createPageDependency = require(`../../../redux/actions/add-page-dependency`)
jest.mock(`../../../redux/actions/add-page-dependency`)

const makeNodes = () => [
  {
    id: `p1`,
    internal: { type: `Parent` },
    hair: `red`,
    children: [`c1`, `c2`, `r1`],
  },
  {
    id: `r1`,
    internal: { type: `Relative` },
    hair: `black`,
    children: [],
    parent: `p1`,
  },
  {
    id: `c1`,
    internal: { type: `Child` },
    hair: `brown`,
    children: [],
    parent: `p1`,
  },
  {
    id: `c2`,
    internal: { type: `Child` },
    hair: `blonde`,
    children: [],
    parent: `p1`,
  },
]

describe(`[legacy] build-node-connections`, () => {
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

  it(`should result in a valid queryable schema`, async () => {
    const { allParent, allChild, allRelative } = await runQuery(
      `
      {
        allParent(filter: { id: { eq: "p1" } }) {
          edges {
            node {
              hair
            }
          }
        }
        allChild(filter: { id: { eq: "c1" } }) {
          edges {
            node {
              hair
            }
          }
        }
        allRelative(filter: { id: { eq: "r1" } }) {
          edges {
            node {
              hair
            }
          }
        }
      }
    `
    )
    expect(allParent.edges[0].node.hair).toEqual(`red`)
    expect(allChild.edges[0].node.hair).toEqual(`brown`)
    expect(allRelative.edges[0].node.hair).toEqual(`black`)
  })

  it(`should link children automatically`, async () => {
    const { allParent } = await runQuery(
      `
      {
        allParent(filter: { id: { eq: "p1" } }) {
          edges {
            node {
              children {
                id
              }
            }
          }
        }
      }
    `
    )
    expect(allParent.edges[0].node.children).toBeDefined()
    expect(allParent.edges[0].node.children.map(c => c.id)).toEqual([
      `c1`,
      `c2`,
      `r1`,
    ])
  })

  it(`should create typed children fields`, async () => {
    const { allParent } = await runQuery(
      `
      {
        allParent(filter: { id: { eq: "p1" } }) {
          edges {
            node {
              childrenChild { # lol
                id
              }
            }
          }
        }
      }
    `
    )
    expect(allParent.edges[0].node.childrenChild).toBeDefined()
    expect(allParent.edges[0].node.childrenChild.map(c => c.id)).toEqual([
      `c1`,
      `c2`,
    ])
  })

  it(`should create typed child field for singular children`, async () => {
    const { allParent } = await runQuery(
      `
      {
        allParent(filter: { id: { eq: "p1" } }) {
          edges {
            node {
              childRelative { # lol
                id
              }
            }
          }
        }
      }
    `
    )

    expect(allParent.edges[0].node.childRelative).toBeDefined()
    expect(allParent.edges[0].node.childRelative.id).toEqual(`r1`)
  })

  it(`should create page dependency`, async () => {
    await runQuery(
      `
      {
        allParent(filter: { id: { eq: "p1" } }) {
          edges {
            node {
              childRelative { # lol
                id
              }
            }
          }
        }
      }
    `
    )

    expect(createPageDependency).toHaveBeenCalledWith({
      path: `foo`,
      connection: `Parent`,
    })
  })
})
