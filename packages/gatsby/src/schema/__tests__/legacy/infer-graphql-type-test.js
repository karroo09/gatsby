const { graphql } = require(`graphql`)

const { reportConflict } = require(`../../infer/type-conflict-reporter`)
jest.mock(`../../infer/type-conflict-reporter`)

const { store } = require(`../../../redux`)
// FIXME: enable after rebase on current master
// require(`../../db/__tests__/fixtures/ensure-loki`)()

const path = require(`path`)
const normalizePath = require(`normalize-path`)

const nodes = [
  {
    id: `foo`,
    parent: null,
    children: [],
    internal: { type: `Test` },
    name: `The Mad Max`,
    type: `Test`,
    "key-with..unsupported-values": true,
    hair: 1,
    date: `1012-11-01`,
    anArray: [1, 2, 3, 4],
    aNestedArray: [[1, 2, 3, 4], [5, 6, 7, 8]],
    anObjectArray: [
      { aString: `some string`, aNumber: 2, aBoolean: true },
      { aString: `some string`, aNumber: 2, anArray: [1, 2] },
      { anotherObjectArray: [{ bar: 10 }] },
    ],
    deepObject: {
      level: 1,
      deepObject: {
        level: 2,
        deepObject: {
          level: 3,
        },
      },
    },
    "with space": 1,
    "with-hyphen": 2,
    "with resolver": `1012-11-01`,
    123: 42,
    456: {
      testingTypeNameCreation: true,
    },
    aBoolean: true,
    externalUrl: `https://example.com/awesome.jpg`,
    domain: `pizza.com`,
    frontmatter: {
      date: `1012-11-01`,
      title: `The world of dash and adventure`,
      blue: 100,
    },
  },
  {
    id: `boo`,
    parent: null,
    children: [],
    internal: { type: `Test` },
    name: `The Mad Wax`,
    type: `Test`,
    hair: 2,
    date: `1984-10-12`,
    anArray: [1, 2, 5, 4],
    aNestedArray: [[1, 2, 3, 4]],
    anObjectArray: [{ anotherObjectArray: [{ baz: `quz` }] }],
    "with space": 3,
    "with-hyphen": 4,
    123: 24,
    frontmatter: {
      date: `1984-10-12`,
      title: `The world of slash and adventure`,
      blue: 10010,
    },
  },
]

let buildSchema
async function runQuery(nodes, query) {
  for (const node of nodes) {
    store.dispatch({ type: `CREATE_NODE`, payload: node })
  }

  const { schemaComposer } = require(`graphql-compose`)
  schemaComposer.Query.addFields({
    listNode: {
      type: [`Test`],
      resolve: () => nodes.filter(node => node.internal.type === `Test`),
    },
  })
  const schema = await buildSchema()

  const context = { path: `/` }
  return graphql(schema, `{ listNode { ${query} } }`, context, context)
}

describe(`[legacy] GraphQL type inferance`, () => {
  beforeEach(() => {
    store.dispatch({ type: `DELETE_CACHE` })
    const { schemaComposer } = require(`graphql-compose`)
    schemaComposer.clear()
    jest.isolateModules(() => {
      buildSchema = require(`../../schema`).buildSchema
    })
  })

  it(`filters out null example values`, async () => {
    let result = await runQuery(
      [
        {
          foo: null,
          bar: `baz`,
          internal: { type: `Test` },
          children: [],
          id: 1,
        },
      ],
      `
        foo
        bar
      `
    )
    expect(result.errors.length).toEqual(1)
    expect(result.errors[0].message).toMatch(
      `Cannot query field "foo" on type "Test".`
    )
  })

  it(`doesn't throw errors at ints longer than 32-bit`, async () => {
    const result = await runQuery(
      [
        {
          longint: 3000000000,
          internal: { type: `Test` },
          children: [],
          id: 1,
        },
      ],
      `
        longint
      `
    )
    expect(result.errors).toBeUndefined()
  })

  it(`prefers float when multiple number types`, async () => {
    let result = await runQuery(
      [
        { number: 1.1, internal: { type: `Test` }, children: [], id: 1 },
        { number: 1, internal: { type: `Test` }, children: [], id: 2 },
      ],
      `
        number
      `
    )
    expect(result.data.listNode[0].number).toEqual(1.1)
  })

  it(`filters out empty objects`, async () => {
    let result = await runQuery(
      [
        {
          foo: {},
          bar: `baz`,
          internal: { type: `Test` },
          children: [],
          id: 1,
        },
      ],
      `
        foo
        bar
      `
    )
    expect(result.errors.length).toEqual(1)
    expect(result.errors[0].message).toMatch(
      `Cannot query field "foo" on type "Test".`
    )
  })

  it(`filters out empty arrays`, async () => {
    let result = await runQuery(
      [
        {
          foo: [],
          bar: `baz`,
          internal: { type: `Test` },
          children: [],
          id: 1,
        },
      ],
      `
        foo
        bar
      `
    )
    expect(result.errors.length).toEqual(1)
    expect(result.errors[0].message).toMatch(
      `Cannot query field "foo" on type "Test".`
    )
  })

  it(`filters out sparse arrays`, async () => {
    let result = await runQuery(
      [
        {
          foo: [undefined, null, null],
          bar: `baz`,
          internal: { type: `Test` },
          children: [],
          id: 1,
        },
      ],
      `
        foo
        bar
      `
    )
    expect(result.errors.length).toEqual(1)
    expect(result.errors[0].message).toMatch(
      `Cannot query field "foo" on type "Test".`
    )
  })

  it(`Removes specific root fields`, () => {
    // We don't do that
  })

  it(`infers number types`, () => {
    const { getExampleValue } = require(`../../infer/example-value`)
    const { addInferredFields } = require(`../../infer/infer`)
    const { TypeComposer } = require(`graphql-compose`)

    const value = getExampleValue({
      nodes: [
        {
          int32: 42,
          float: 2.5,
          longint: 3000000000,
        },
      ],
    })
    const tc = TypeComposer.createTemp(`Test`)
    addInferredFields(tc, value)
    const fields = tc.getType().getFields()
    expect(fields.int32.type.name).toEqual(`Int`)
    expect(fields.float.type.name).toEqual(`Float`)
    expect(fields.longint.type.name).toEqual(`Float`)
  })

  it(`Handle invalid graphql field names`, async () => {
    let result = await runQuery(
      nodes,
      `
        with_space
        with_hyphen
        with_resolver(formatString:"DD.MM.YYYY")
        _23
        _56 {
          testingTypeNameCreation
        }
      `
    )

    expect(result.errors).not.toBeDefined()
    expect(result.data.listNode.length).toEqual(2)
    expect(result.data.listNode[0].with_space).toEqual(1)
    expect(result.data.listNode[0].with_hyphen).toEqual(2)
    expect(result.data.listNode[1].with_space).toEqual(3)
    expect(result.data.listNode[1].with_hyphen).toEqual(4)
    expect(result.data.listNode[0].with_resolver).toEqual(`01.11.1012`)
    expect(result.data.listNode[0]._23).toEqual(42)
    expect(result.data.listNode[1]._23).toEqual(24)
    expect(result.data.listNode[0]._56).toEqual(nodes[0][`456`])
  })

  describe(`Handles dates`, () => {
    it(`Handles integer with valid date format`, async () => {
      let result = await runQuery(
        [
          { number: 2018, internal: { type: `Test` }, children: [], id: 1 },
          { number: 1987, internal: { type: `Test` }, children: [], id: 1 },
        ],
        `
          number
        `
      )
      expect(result.data.listNode[0].number).toEqual(2018)
    })

    it(`Infers from Date objects`, async () => {
      let result = await runQuery(
        [
          {
            dateObject: new Date(Date.UTC(2012, 10, 5)),
            internal: { type: `Test` },
            children: [],
            id: 1,
          },
          {
            dateObject: new Date(Date.UTC(2012, 10, 5)),
            internal: { type: `Test` },
            children: [],
            id: 2,
          },
        ],
        `
          dateObject
        `
      )
      expect(result).toMatchSnapshot()
    })

    it(`Infers from array of Date objects`, async () => {
      let result = await runQuery(
        [
          {
            dateObject: [
              new Date(Date.UTC(2012, 10, 5)),
              new Date(Date.UTC(2012, 10, 6)),
            ],
            internal: { type: `Test` },
            children: [],
            id: 1,
          },
          {
            dateObject: [new Date(Date.UTC(2012, 10, 5))],
            internal: { type: `Test` },
            children: [],
            id: 2,
          },
        ],
        `
          dateObject
        `
      )
      expect(result).toMatchSnapshot()
    })

    it(`Infers from date strings`, async () => {
      let result = await runQuery(
        [
          {
            date: `1012-11-01`,
            internal: { type: `Test` },
            children: [],
            id: 1,
          },
        ],
        `
          date(formatString:"DD.MM.YYYY")
        `
      )

      expect(result.errors).not.toBeDefined()
      expect(result.data.listNode[0].date).toEqual(`01.11.1012`)
    })

    it(`Infers from arrays of date strings`, async () => {
      let result = await runQuery(
        [
          {
            date: [`1012-11-01`, `10390203`],
            internal: { type: `Test` },
            children: [],
            id: 1,
          },
        ],
        `
          date(formatString:"DD.MM.YYYY")
        `
      )

      expect(result.errors).not.toBeDefined()
      expect(result.data.listNode[0].date.length).toEqual(2)
      expect(result.data.listNode[0].date[0]).toEqual(`01.11.1012`)
      expect(result.data.listNode[0].date[1]).toEqual(`03.02.1039`)
    })
  })

  describe(`Linked inference from config mappings`, () => {
    store.dispatch({
      type: `SET_SITE_CONFIG`,
      payload: {
        mapping: {
          "Test.linkedOnID": `MappingTest`,
          "Test.linkedOnCustomField": `MappingTest.nestedField.mapTarget`,
        },
      },
    })

    const nodes = [
      {
        id: `node1`,
        children: [],
        internal: { type: `MappingTest` },
        label: `First node`,
        nestedField: {
          mapTarget: `test1`,
        },
      },
      {
        id: `node2`,
        children: [],
        internal: { type: `MappingTest` },
        label: `Second node`,
        nestedField: {
          mapTarget: `test2`,
        },
      },
      {
        id: `node3`,
        children: [],
        internal: { type: `MappingTest` },
        label: `Third node`,
        nestedField: {
          mapTarget: `test3`,
        },
      },
    ]

    it(`Links to single node by id`, async () => {
      let result = await runQuery(
        nodes.concat([
          {
            id: `test1`,
            children: [],
            internal: { type: `Test` },
            linkedOnID: `node1`,
          },
          {
            id: `test2`,
            children: [],
            internal: { type: `Test` },
            linkedOnID: `not_existing`,
          },
        ]),
        `
          linkedOnID {
            label
          }
        `
      )

      expect(result.errors).not.toBeDefined()
      expect(result.data.listNode.length).toEqual(2)
      expect(result.data.listNode[0].linkedOnID).toBeDefined()
      expect(result.data.listNode[1].linkedOnID).toEqual(null)
      expect(result.data.listNode[0].linkedOnID.label).toEqual(`First node`)
    })

    it(`Links to array of nodes by id`, async () => {
      let result = await runQuery(
        nodes.concat([
          {
            id: `test1`,
            children: [],
            internal: { type: `Test` },
            linkedOnID: [`node1`, `node2`],
          },
        ]),
        `
          linkedOnID {
            label
          }
        `
      )

      expect(result.errors).not.toBeDefined()
      expect(result.data.listNode.length).toEqual(1)
      expect(result.data.listNode[0].linkedOnID).toBeDefined()
      expect(result.data.listNode[0].linkedOnID.length).toEqual(2)
      expect(result.data.listNode[0].linkedOnID[0].label).toEqual(`First node`)
      expect(result.data.listNode[0].linkedOnID[1].label).toEqual(`Second node`)
    })

    it(`Links to single node by custom field`, async () => {
      let result = await runQuery(
        nodes.concat([
          {
            id: `test1`,
            children: [],
            internal: { type: `Test` },
            linkedOnCustomField: `test2`,
          },
          {
            id: `test2`,
            children: [],
            internal: { type: `Test` },
            linkedOnCustomField: `not_existing`,
          },
        ]),
        `
          linkedOnCustomField {
            label
          }
        `
      )

      expect(result.errors).not.toBeDefined()
      expect(result.data.listNode.length).toEqual(2)
      expect(result.data.listNode[0].linkedOnCustomField).toBeDefined()
      expect(result.data.listNode[1].linkedOnCustomField).toEqual(null)
      expect(result.data.listNode[0].linkedOnCustomField.label).toEqual(
        `Second node`
      )
    })

    it(`Links to array of nodes by custom field`, async () => {
      let result = await runQuery(
        nodes.concat([
          {
            id: `test1`,
            children: [],
            internal: { type: `Test` },
            linkedOnCustomField: [`test1`, `test3`],
          },
        ]),
        `
          linkedOnCustomField {
            label
          }
        `
      )

      expect(result.errors).not.toBeDefined()
      expect(result.data.listNode.length).toEqual(1)
      expect(result.data.listNode[0].linkedOnCustomField).toBeDefined()
      expect(result.data.listNode[0].linkedOnCustomField.length).toEqual(2)
      expect(result.data.listNode[0].linkedOnCustomField[0].label).toEqual(
        `First node`
      )
      expect(result.data.listNode[0].linkedOnCustomField[1].label).toEqual(
        `Third node`
      )
    })
  })

  describe(`Linked inference from file URIs`, () => {
    // const fileType = {
    //   name: `File`,
    //   nodeObjectType: new GraphQLObjectType({
    //     name: `File`,
    //     fields: inferObjectStructureFromNodes({
    //       nodes: [{ id: `file_1`, absolutePath: `path`, dir: `path` }],
    //       types: [{ name: `File` }],
    //     }),
    //   }),
    // }

    let dir = normalizePath(path.resolve(`/path/`))

    const nodes = [
      {
        id: `parent`,
        children: [`file1`],
        internal: { type: `File` },
        absolutePath: normalizePath(path.resolve(dir, `index.md`)),
        dir: dir,
      },
      {
        id: `file_1`,
        children: [],
        internal: { type: `File` },
        absolutePath: normalizePath(path.resolve(dir, `file_1.jpg`)),
        dir,
      },
      {
        id: `file_2`,
        children: [],
        internal: { type: `File` },
        absolutePath: normalizePath(path.resolve(dir, `file_2.txt`)),
        dir,
      },
    ]

    it(`Links to file node`, async () => {
      let result = await runQuery(
        nodes.concat([
          {
            id: `file1`,
            parent: `parent`,
            children: [],
            internal: { type: `Test` },
            file: `./file_1.jpg`,
          },
        ]),
        `
          file {
            absolutePath
          }
        `
      )

      expect(result.errors).not.toBeDefined()
      expect(result.data.listNode[0].file.absolutePath).toEqual(
        normalizePath(path.resolve(dir, `file_1.jpg`))
      )
    })

    it(`Links to array of file nodes`, async () => {
      let result = await runQuery(
        nodes.concat([
          {
            id: `file1`,
            parent: `parent`,
            children: [],
            internal: { type: `Test` },
            files: [`./file_1.jpg`, `./file_2.txt`],
          },
        ]),
        `
          files {
            absolutePath
          }
        `
      )

      expect(result.errors).not.toBeDefined()
      expect(result.data.listNode[0].files.length).toEqual(2)
      expect(result.data.listNode[0].files[0].absolutePath).toEqual(
        normalizePath(path.resolve(dir, `file_1.jpg`))
      )
      expect(result.data.listNode[0].files[1].absolutePath).toEqual(
        normalizePath(path.resolve(dir, `file_2.txt`))
      )
    })
  })

  describe(`Linked inference by __NODE convention`, () => {
    const { getExampleValue } = require(`../../infer/example-value`)
    const { addInferredFields } = require(`../../infer/infer`)
    const { TypeComposer } = require(`graphql-compose`)

    const nodes = [
      {
        id: `child_1`,
        children: [],
        internal: { type: `Child` },
        hair: `brown`,
      },
      {
        id: `child_2`,
        children: [],
        internal: { type: `Child` },
        hair: `blonde`,
      },
      {
        id: `pet_1`,
        children: [],
        internal: { type: `Pet` },
        species: `dog`,
      },
    ]

    it(`Links nodes`, async () => {
      let result = await runQuery(
        nodes.concat([
          {
            id: `test1`,
            children: [],
            internal: { type: `Test` },
            linked___NODE: `child_1`,
          },
        ]),
        `
          linked {
            hair
          }
        `
      )
      expect(result.errors).not.toBeDefined()
      expect(result.data.listNode[0].linked.hair).toEqual(`brown`)
    })

    it(`Links an array of nodes`, async () => {
      let result = await runQuery(
        nodes.concat([
          {
            id: `test1`,
            children: [],
            internal: { type: `Test` },
            linked___NODE: [`child_1`, `child_2`],
          },
        ]),
        `
          linked {
            hair
          }
        `
      )
      expect(result.errors).not.toBeDefined()
      expect(result.data.listNode[0].linked[0].hair).toEqual(`brown`)
      expect(result.data.listNode[0].linked[1].hair).toEqual(`blonde`)
    })

    it(`Links nodes by field`, async () => {
      let result = await runQuery(
        nodes.concat([
          {
            id: `test1`,
            children: [],
            internal: { type: `Test` },
            linked___NODE___hair: `brown`,
          },
        ]),
        `
          linked {
            hair
          }
        `
      )
      expect(result.errors).not.toBeDefined()
      expect(result.data.listNode[0].linked.hair).toEqual(`brown`)
    })

    it(`Links an array of nodes by field`, async () => {
      let result = await runQuery(
        nodes.concat([
          {
            id: `test1`,
            children: [],
            internal: { type: `Test` },
            linked___NODE___hair: [`brown`, `blonde`],
          },
        ]),
        `
          linked {
            hair
          }
        `
      )
      expect(result.errors).not.toBeDefined()
      expect(result.data.listNode[0].linked[0].hair).toEqual(`brown`)
      expect(result.data.listNode[0].linked[1].hair).toEqual(`blonde`)
    })

    it(`Errors clearly when missing nodes`, async () => {
      const value = getExampleValue({ nodes: [{ linked___NODE: `baz` }] })
      const tc = TypeComposer.createTemp(`Test`)

      // The error message does not include the field value any more, because
      // single field values might very well point nowhere (they will be null),
      // but we can still infer a type if at least one field value matches a type.
      expect(() => addInferredFields(tc, value)).toThrow(
        `Could not infer a GraphQL type for the field "linked___NODE".`
      )
    })

    it(`Errors clearly when missing types`, async () => {
      // We do not error at this point because the type might become available later
    })

    describe(`Creation of union types when array field is linking to multiple types`, () => {
      it(`Creates union types`, async () => {
        let result = await runQuery(
          nodes.concat([
            {
              id: `test1`,
              children: [],
              internal: { type: `Test` },
              linked___NODE: [`child_1`, `pet_1`],
            },
          ]),
          `
            linked {
              __typename
              ... on Child {
                hair
              }
              ... on Pet {
                species
              }
            }
          `
        )
        expect(result.errors).not.toBeDefined()
        expect(result.data.listNode[0].linked[0].hair).toEqual(`brown`)
        expect(result.data.listNode[0].linked[0].__typename).toEqual(`Child`)
        expect(result.data.listNode[0].linked[1].species).toEqual(`dog`)
        expect(result.data.listNode[0].linked[1].__typename).toEqual(`Pet`)
        store.dispatch({
          type: `CREATE_NODE`,
          payload: { id: `baz`, internal: { type: `Bar` } },
        })
      })

      it(`Uses same union type for same child node types and key`, () => {
        nodes.forEach(node =>
          store.dispatch({ type: `CREATE_NODE`, payload: node })
        )

        const firstValue = getExampleValue({
          nodes: [
            { test___NODE: [`pet_1`, `child_1`], internal: { type: `First` } },
          ],
        })
        const firstTC = TypeComposer.create(`First`)
        addInferredFields(firstTC, firstValue)
        const firstUnionType = firstTC.getFieldType(`test`).ofType

        const secondValue = getExampleValue({
          nodes: [
            { test___NODE: [`pet_1`, `child_2`], internal: { type: `Second` } },
          ],
        })
        const secondTC = TypeComposer.create(`Second`)
        addInferredFields(secondTC, secondValue)
        const secondUnionType = secondTC.getFieldType(`test`).ofType

        expect(firstUnionType.name).toBe(secondUnionType.name)
        expect(firstUnionType.getTypes()).toEqual(secondUnionType.getTypes())
        expect(firstUnionType).toBe(secondUnionType)
      })

      it(`Uses a different type for the same child node types with a different key`, () => {
        // We don't do that
      })

      it(`Uses a different type for different child node types with the same key`, () => {
        nodes
          .concat([{ id: `toy_1`, internal: { type: `Toy` } }])
          .forEach(node =>
            store.dispatch({ type: `CREATE_NODE`, payload: node })
          )

        const firstValue = getExampleValue({
          nodes: [
            { test___NODE: [`pet_1`, `child_1`], internal: { type: `First` } },
          ],
        })
        const firstTC = TypeComposer.create(`First`)
        addInferredFields(firstTC, firstValue)
        const firstUnionType = firstTC.getFieldType(`test`).ofType

        const secondValue = getExampleValue({
          nodes: [
            {
              test___NODE: [`pet_1`, `child_1`, `toy_1`],
              internal: { type: `Second` },
            },
          ],
        })
        const secondTC = TypeComposer.create(`Second`)
        addInferredFields(secondTC, secondValue)
        const secondUnionType = secondTC.getFieldType(`test`).ofType

        expect(firstUnionType.name).toBe(`ChildPetUnion`)
        expect(secondUnionType.name).toBe(`ChildPetToyUnion`)
        expect(firstUnionType.getTypes()).not.toEqual(
          secondUnionType.getTypes()
        )
        expect(firstUnionType).not.toBe(secondUnionType)
      })

      it(`Creates a new type after schema updates clear union types`, () => {
        // FIXME: We don't do that
      })

      it(`Uses a reliable naming convention`, () => {
        // FIXME: We do, but differenly
      })
    })
  })

  it(`Infers graphql type from array of nodes`, () =>
    runQuery(
      nodes,
      `
        hair,
        anArray,
        aNestedArray,
        anObjectArray {
          aNumber,
          aBoolean,
          anArray
          anotherObjectArray {
            bar
            baz
          }
        },
        deepObject {
          level
          deepObject {
            level
            deepObject {
              level
            }
          }
        }
        aBoolean,
        externalUrl,
        domain,
        date(formatString: "YYYY"),
        frontmatter {
          title,
          date(formatString: "YYYY")
        }
    `
    ).then(result => expect(result).toMatchSnapshot()))

  describe(`[legacy] type conflicts`, () => {
    beforeEach(() => {
      reportConflict.mockClear()
    })

    it(`catches conflicts and removes field`, async () => {
      let result = await runQuery(
        [
          {
            id: 1,
            children: [],
            internal: { type: `Test` },
            foo: `foo`,
            number: 1.1,
          },
          {
            id: 2,
            children: [],
            internal: { type: `Test` },
            foo: `bar`,
            number: `1`,
          },
        ],
        `
          foo
          number
        `
      )
      expect(reportConflict).toHaveBeenCalledTimes(1)

      expect(result.errors.length).toEqual(1)
      expect(result.errors[0].message).toMatch(
        `Cannot query field "number" on type "Test".`
      )
    })

    it(`does not warn about provided types`, async () => {
      // `ignoreFields` is now fixed to Node interface fields and `$loki`
    })
  })
})
