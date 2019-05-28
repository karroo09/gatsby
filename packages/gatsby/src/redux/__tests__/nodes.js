const { actions } = require(`../actions`)
const nodeReducer = require(`../reducers/nodes`)
const nodeTouchedReducer = require(`../reducers/nodes-touched`)
const { createNodesDb } = require(`../../db`)

describe(`Create and update nodes`, () => {
  let db
  beforeEach(async () => {
    db = await createNodesDb()
  })

  it(`allows creating nodes`, () => {
    const action = actions.createNode(
      {
        id: `hi`,
        children: [],
        parent: `test`,
        internal: {
          contentDigest: `hasdfljds`,
          type: `Test`,
        },
        pickle: true,
      },
      {
        name: `tests`,
      }
    )
    expect(action).toMatchSnapshot()
    expect(
      nodeReducer({ db }, action)
        .db.getNodes()
        .map(({ $loki, ...node }) => node)
    ).toMatchSnapshot()
  })

  it(`allows updating nodes`, () => {
    const action = actions.createNode(
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
    const updateAction = actions.createNode(
      {
        id: `hi`,
        children: [],
        parent: `test`,
        internal: {
          contentDigest: `hasdfljds`,
          type: `Test`,
        },
        pickle: false,
        deep: {
          array: [1, 2],
        },
        deep2: {
          boom: `foo`,
        },
      },
      {
        name: `tests`,
      }
    )
    const state = nodeReducer({ db }, action)
    const currentDb = nodeReducer(state, updateAction).db
    expect(currentDb.getNode(`hi`).pickle).toEqual(false)
    expect(currentDb.getNode(`hi`).deep.array[0]).toEqual(1)
    expect(currentDb.getNode(`hi`).deep2.boom).toEqual(`foo`)
  })

  it(`nodes that are added are also "touched"`, () => {
    const action = actions.createNode(
      {
        id: `hi`,
        children: [],
        parent: `test`,
        internal: {
          contentDigest: `hasdfljds`,
          type: `Test`,
        },
        pickle: true,
      },
      {
        name: `tests`,
      }
    )
    const state = nodeTouchedReducer({ db }, action)
    expect(state[`hi`]).toBe(true)
  })

  it(`allows adding fields to nodes`, () => {
    const action = actions.createNode(
      {
        id: `hi`,
        children: [],
        parent: `test`,
        internal: {
          contentDigest: `hasdfljds`,
          type: `Test`,
        },
        pickle: true,
      },
      {
        name: `tests`,
      }
    )
    const state = nodeReducer({ db }, action)

    const addFieldAction = actions.createNodeField(
      {
        node: state.db.getNode(`hi`),
        name: `joy`,
        value: `soul's delight`,
      },
      {
        name: `test`,
      }
    )
    const nodes = nodeReducer(state, addFieldAction)
      .db.getNodes()
      .map(({ $loki, ...node }) => node)
    expect(nodes).toMatchSnapshot()
  })

  it(`throws error if a field is updated by a plugin not its owner`, () => {
    const action = actions.createNode(
      {
        id: `hi`,
        children: [],
        parent: `test`,
        internal: {
          contentDigest: `hasdfljds`,
          type: `Test`,
        },
        pickle: true,
      },
      {
        name: `tests`,
      }
    )
    const state = nodeReducer({ db }, action)

    const addFieldAction = actions.createNodeField(
      {
        node: state.db.getNode(`hi`),
        name: `joy`,
        value: `soul's delight`,
      },
      {
        name: `test`,
      }
    )
    const currentDb = nodeReducer(state, addFieldAction).db

    function callActionCreator() {
      actions.createNodeField(
        {
          node: currentDb.getNode(`hi`),
          name: `joy`,
          value: `soul's delight`,
        },
        {
          name: `test2`,
        }
      )
    }
    expect(callActionCreator).toThrowErrorMatchingSnapshot()
  })

  it(`throws error if a node is created by a plugin not its owner`, () => {
    actions.createNode(
      {
        id: `hi`,
        children: [],
        parent: `test`,
        internal: {
          contentDigest: `hasdfljds`,
          type: `mineOnly`,
        },
        pickle: true,
      },
      {
        name: `pluginA`,
      }
    )

    function callActionCreator() {
      actions.createNode(
        {
          id: `hi2`,
          children: [],
          parent: `test`,
          internal: {
            contentDigest: `hasdfljds`,
            type: `mineOnly`,
          },
          pickle: true,
        },
        {
          name: `pluginB`,
        }
      )
    }

    expect(callActionCreator).toThrowErrorMatchingSnapshot()
  })

  it(`throws error if a node sets a value on "fields"`, () => {
    function callActionCreator() {
      actions.createNode(
        {
          id: `hi`,
          children: [],
          parent: `test`,
          fields: {
            test: `I can't do this but I like to test boundaries`,
          },
          internal: {
            contentDigest: `hasdfljds`,
            type: `mineOnly`,
          },
          pickle: true,
        },
        {
          name: `pluginA`,
        }
      )
    }

    expect(callActionCreator).toThrowErrorMatchingSnapshot()
  })
})
