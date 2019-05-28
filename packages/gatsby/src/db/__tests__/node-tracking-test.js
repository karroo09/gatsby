const { store } = require(`../../redux`)
const {
  boundActionCreators: { createNode },
} = require(`../../redux/actions`)
const {
  findRootNodeAncestor,
  trackInlineObjectsInRootNode,
} = require(`../node-tracking`)
const { createNodesDb } = require(`..`)

function makeNode() {
  return {
    id: `id1`,
    parent: null,
    children: [],
    inlineObject: {
      field: `fieldOfFirstNode`,
    },
    inlineArray: [1, 2, 3],
    internal: {
      type: `Test`,
      contentDigest: `digest1`,
      owner: `test`,
    },
  }
}

describe(`track root nodes`, () => {
  let db
  beforeEach(async () => {
    db = await createNodesDb()
    const nodes = [makeNode()]
    store.dispatch({ type: `DELETE_CACHE` })
    for (const node of nodes) {
      store.dispatch({ type: `CREATE_NODE`, payload: node })
    }
    nodes.forEach(trackInlineObjectsInRootNode)
    createNode(
      {
        id: `id2`,
        parent: null,
        children: [],
        inlineObject: {
          field: `fieldOfSecondNode`,
        },
        inlineArray: [1, 2, 3],
        internal: {
          type: `Test`,
          contentDigest: `digest2`,
        },
      },
      {
        name: `test`,
      }
    )
  })

  describe(`Tracks nodes read from redux state cache`, () => {
    it(`Tracks inline objects`, () => {
      const node = db.getNode(`id1`)
      const inlineObject = node.inlineObject
      const trackedRootNode = findRootNodeAncestor(inlineObject)

      expect(trackedRootNode).toEqual(node)
    })

    it(`Tracks inline arrays`, () => {
      const node = db.getNode(`id1`)
      const inlineObject = node.inlineArray
      const trackedRootNode = findRootNodeAncestor(inlineObject)

      expect(trackedRootNode).toEqual(node)
    })

    it(`Doesn't track copied objects`, () => {
      const node = db.getNode(`id1`)
      const copiedInlineObject = { ...node.inlineObject }
      const trackedRootNode = findRootNodeAncestor(copiedInlineObject)

      expect(trackedRootNode).not.toEqual(node)
    })
  })

  describe(`Tracks nodes created using createNode action`, () => {
    it(`Tracks inline objects`, () => {
      const node = db.getNode(`id2`)
      const inlineObject = node.inlineObject
      const trackedRootNode = findRootNodeAncestor(inlineObject)

      expect(trackedRootNode).toEqual(node)
    })
  })

  describe(`Tracks nodes returned by queries`, () => {
    let type

    beforeAll(async () => {
      const { createSchemaComposer } = require(`../../schema/schema-composer`)
      const {
        addInferredFields,
      } = require(`../../schema/infer/add-inferred-fields`)
      const { getExampleValue } = require(`../../schema/infer/example-value`)

      const sc = createSchemaComposer()
      const typeName = `Test`
      const tc = sc.createObjectTC(typeName)
      addInferredFields({
        schemaComposer: sc,
        typeComposer: tc,
        exampleValue: getExampleValue({ nodes: [makeNode()], typeName }),
      })
      type = tc.getType()
    })

    it(`Tracks objects when running query without filter`, async () => {
      const result = await db.runQuery({
        query: {},
        types: [type],
        firstOnly: false,
      })

      expect(result.length).toEqual(2)
      expect(findRootNodeAncestor(result[0].inlineObject)).toEqual(result[0])
      expect(findRootNodeAncestor(result[1].inlineObject)).toEqual(result[1])
    })

    it(`Tracks objects when running query with filter`, async () => {
      const result = await db.runQuery({
        query: {
          filter: {
            inlineObject: {
              field: {
                eq: `fieldOfSecondNode`,
              },
            },
          },
        },
        types: [type],
        firstOnly: false,
      })

      expect(result.length).toEqual(1)
      expect(findRootNodeAncestor(result[0].inlineObject)).toEqual(result[0])
    })
  })
})
