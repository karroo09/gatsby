const { actions } = require(`../../redux/actions`)
const { store } = require(`../../redux`)
const { createNodesDb } = require(`..`)

const report = require(`gatsby-cli/lib/reporter`)
jest.mock(`gatsby-cli/lib/reporter`)

describe(`nodes db tests`, () => {
  let db
  beforeEach(async () => {
    db = await createNodesDb()
    store.dispatch({ type: `DELETE_CACHE` })
  })

  it(`deletes previously transformed children nodes when the parent node is updated`, () => {
    store.dispatch(
      actions.createNode(
        {
          id: `hi`,
          children: [],
          parent: null,
          internal: {
            contentDigest: `hasdfljds`,
            type: `Test`,
          },
        },
        {
          name: `tests`,
        }
      )
    )
    store.dispatch(
      actions.createNode(
        {
          id: `hi-1`,
          children: [],
          parent: `hi`,
          internal: {
            contentDigest: `hasdfljds-1`,
            type: `Test-1`,
          },
        },
        {
          name: `tests`,
        }
      )
    )
    store.dispatch(
      actions.createParentChildLink(
        {
          parent: db.getNode(`hi`),
          child: db.getNode(`hi-1`),
        },
        {
          name: `tests`,
        }
      )
    )
    store.dispatch(
      actions.createNode(
        {
          id: `hi-1-1`,
          children: [],
          parent: `hi-1`,
          internal: {
            contentDigest: `hasdfljds-1-1`,
            type: `Test-1-1`,
          },
        },
        {
          name: `tests`,
        }
      )
    )
    store.dispatch(
      actions.createParentChildLink(
        {
          parent: db.getNode(`hi-1`),
          child: db.getNode(`hi-1-1`),
        },
        {
          name: `tests`,
        }
      )
    )
    store.dispatch(
      actions.createNode(
        {
          id: `hi`,
          children: [],
          parent: `test`,
          internal: {
            contentDigest: `hasdfljds2`,
            type: `Test`,
          },
        },
        {
          name: `tests`,
        }
      )
    )
    expect(db.getNodes()).toHaveLength(1)
  })

  it(`deletes previously transformed children nodes when the parent node is deleted`, () => {
    store.dispatch(
      actions.createNode(
        {
          id: `hi`,
          children: [],
          parent: `test`,
          internal: {
            contentDigest: `hasdfljds`,
            type: `Test`,
          },
        },
        {
          name: `tests`,
        }
      )
    )
    store.dispatch(
      actions.createNode(
        {
          id: `hi2`,
          children: [],
          parent: `test`,
          internal: {
            contentDigest: `hasdfljds`,
            type: `Test`,
          },
        },
        {
          name: `tests`,
        }
      )
    )
    store.dispatch(
      actions.createNode(
        {
          id: `hi-1`,
          children: [],
          parent: `hi`,
          internal: {
            contentDigest: `hasdfljds-1`,
            type: `Test-1`,
          },
        },
        {
          name: `tests`,
        }
      )
    )
    store.dispatch(
      actions.createParentChildLink(
        {
          parent: db.getNode(`hi`),
          child: db.getNode(`hi-1`),
        },
        {
          name: `tests`,
        }
      )
    )
    store.dispatch(
      actions.createNode(
        {
          id: `hi-1-1`,
          children: [],
          parent: `hi-1`,
          internal: {
            contentDigest: `hasdfljds-1-1`,
            type: `Test-1-1`,
          },
        },
        {
          name: `tests`,
        }
      )
    )
    store.dispatch(
      actions.createParentChildLink(
        {
          parent: db.getNode(`hi-1`),
          child: db.getNode(`hi-1-1`),
        },
        {
          name: `tests`,
        }
      )
    )
    store.dispatch(
      actions.deleteNode(
        {
          node: db.getNode(`hi`),
        },
        {
          name: `tests`,
        }
      )
    )
    expect(db.getNodes()).toHaveLength(1)
  })

  it(`deletes previously transformed children nodes when parent nodes are deleted`, () => {
    store.dispatch(
      actions.createNode(
        {
          id: `hi`,
          children: [],
          parent: `test`,
          internal: {
            contentDigest: `hasdfljds`,
            type: `Test`,
          },
        },
        {
          name: `tests`,
        }
      )
    )
    store.dispatch(
      actions.createNode(
        {
          id: `hi-1`,
          children: [],
          parent: `hi`,
          internal: {
            contentDigest: `hasdfljds-1`,
            type: `Test-1`,
          },
        },
        {
          name: `tests`,
        }
      )
    )
    store.dispatch(
      actions.createParentChildLink(
        {
          parent: db.getNode(`hi`),
          child: db.getNode(`hi-1`),
        },
        {
          name: `tests`,
        }
      )
    )
    store.dispatch(
      actions.createNode(
        {
          id: `hi-1-1`,
          children: [],
          parent: `hi-1`,
          internal: {
            contentDigest: `hasdfljds-1-1`,
            type: `Test-1-1`,
          },
        },
        {
          name: `tests`,
        }
      )
    )
    store.dispatch(
      actions.createParentChildLink(
        {
          parent: db.getNode(`hi-1`),
          child: db.getNode(`hi-1-1`),
        },
        {
          name: `tests`,
        }
      )
    )
    store.dispatch(
      actions.deleteNode(
        { node: db.getNode(`hi`) },
        {
          name: `tests`,
        }
      )
    )
    expect(db.getNodes()).toHaveLength(0)
  })

  it(`allows deleting nodes`, () => {
    store.dispatch(
      actions.createNode(
        {
          id: `hi`,
          children: [],
          parent: `test`,
          internal: {
            contentDigest: `hasdfljds`,
            type: `Test`,
          },
          pickle: true,
          deep: {
            array: [
              0,
              1,
              {
                boom: true,
              },
            ],
          },
        },
        {
          name: `tests`,
        }
      )
    )
    store.dispatch(
      actions.deleteNode({
        node: db.getNode(`hi`),
      })
    )
    expect(db.getNode(`hi`)).toBeNull()
  })

  it(`warns when using old deleteNode signature `, () => {
    store.dispatch(
      actions.createNode(
        {
          id: `hi`,
          children: [],
          parent: `test`,
          internal: {
            contentDigest: `hasdfljds`,
            type: `Test`,
          },
        },
        {
          name: `tests`,
        }
      )
    )
    expect(db.getNode(`hi`)).toMatchObject({ id: `hi` })
    store.dispatch(
      actions.deleteNode(`hi`, db.getNode(`hi`), {
        name: `tests`,
      })
    )
    expect(db.getNode(`hi`)).toBeNull()
    const deprecationNotice =
      `Calling "deleteNode" with a nodeId is deprecated. Please pass an ` +
      `object containing a full node instead: deleteNode({ node }). ` +
      `"deleteNode" was called by tests`
    expect(report.warn).toHaveBeenCalledWith(deprecationNotice)
  })

  it(`does not crash when delete node is called on undefined`, () => {
    actions.deleteNode(undefined, {
      name: `tests`,
    })
    expect(db.getNodes()).toHaveLength(0)
  })
})
