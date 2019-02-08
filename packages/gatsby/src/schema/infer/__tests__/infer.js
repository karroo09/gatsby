const { TypeComposer, GraphQLJSON, schemaComposer } = require(`graphql-compose`)
const { GraphQLBoolean, GraphQLList, GraphQLObjectType } = require(`graphql`)

const { addInferredFields } = require(`../infer`)

const nodes = [
  {
    id: `file1`,
    parent: null,
    internal: { type: `File` },
    dir: `/home/me/foo`,
  },
  {
    id: `foo1`,
    parent: `file1`,
    internal: { type: `Foo` },
    filePath: `./bar/baz.txt`,
    filePaths: [[`./bar/baz.txt`]],
  },
  {
    id: `file2`,
    parent: null,
    internal: { type: `File` },
    absolutePath: `/home/me/foo/bar/baz.txt`,
  },
  {
    id: `link1`,
    internal: { type: `Link` },
    linkedById: `link2`,
    linkedByField: 1,
    linkedByNestedField: 2,
    linkedByNestedArray: 3,
    linkedByNestedArrayOfObjectsField: 4,
    manyLinkedById: [`link2`],
    manyLinkedByField: [1],
    manyLinkedByNestedField: [2],
    manyLinkedByNestedArray: [3],
    manyLinkedByNestedArrayOfObjectsField: [4],
  },
  {
    id: `link2`,
    internal: { type: `Linked` },
    foo: 1,
    nested: {
      foo: 2,
      array: [3],
      arrayOfObjects: [{ foo: 4 }],
    },
  },
  {
    id: `linkNode1`,
    internal: { type: `NodeLink` },
    linkedById___NODE: `linkNode2`,
    arrayId: [{ linkedById___NODE: `linkNode2` }],
    manyLinkedById___NODE: [`linkNode2`],
    manyArrayId: [{ manyLinkedById___NODE: [`linkNode2`] }],
    linkedByField___NODE___field: 1,
    arrayField: [{ linkedByField___NODE___field: 1 }],
    manyLinkedByField___NODE___field: [1],
    manyArrayField: [{ manyLinkedByField___NODE___field: [1] }],
  },
  {
    id: `linkNode2`,
    internal: { type: `NodeLinked` },
    field: 1,
  },
  {
    id: `linkNodeName1`,
    ünvälid___NODE: `linkNodeName2`,
    internal: { type: `LinkNode` },
  },
  { id: `linkNodeName2`, internal: { type: `LinkedNode` } },
]

require(`../../../db/__tests__/fixtures/ensure-loki`)()
const { getById } = require(`../../db`)
beforeAll(() => {
  const { store } = require(`../../../redux`)
  nodes.forEach(node => store.dispatch({ type: `CREATE_NODE`, payload: node }))
})

TypeComposer.create(`File`)

describe(`Type inference`, () => {
  // beforeEach(() => {
  //   schemaComposer.clear()
  // })

  it(`infers correct fieldconfigs from example value and adds them to type`, () => {
    const exampleValue = {
      array: [1],
      bigInt: 1e10,
      bool: true,
      dateString: `2018-01-01`,
      dateStrings: [`2018-01-01`],
      dateObject: new Date(`2018-01-01`),
      dateObjects: [new Date(`2018-01-01`)],
      float: 0.1,
      int: 1,
      nestedArray: [[1]],
      nonExistingFilePath: `./foobar.txt`,
      string: `Foo bar`,
      stringObject: new String(`Foo bar`),
    }

    const typeName = `Bar`
    const tc = TypeComposer.createTemp(typeName)

    addInferredFields(tc, exampleValue, typeName)

    const fields = tc.getFields()
    const expected = {
      array: { type: [`Int`] },
      bigInt: { type: `Float` },
      bool: { type: `Boolean` },
      dateString: {
        type: `Date`,
        astNode: expect.objectContaining({ directives: expect.any(Array) }),
      },
      dateStrings: {
        type: [`Date`],
        astNode: expect.objectContaining({ directives: expect.any(Array) }),
      },
      dateObject: {
        type: `Date`,
        astNode: expect.objectContaining({ directives: expect.any(Array) }),
      },
      dateObjects: {
        type: [`Date`],
        astNode: expect.objectContaining({ directives: expect.any(Array) }),
      },
      float: { type: `Float` },
      int: { type: `Int` },
      nestedArray: { type: [[`Int`]] },
      nonExistingFilePath: { type: `String` },
      string: { type: `String` },
      stringObject: { type: `String` },
    }
    expect(fields).toEqual(expected)
  })

  it(`creates new type for nested field`, () => {
    const exampleValue = {
      foo: [[{ bar: [{ qux: { foo: `Bar` } }] }]],
    }

    const typeName = `Baz`
    const tc = TypeComposer.createTemp({
      name: typeName,
      fields: {
        foo: [
          [
            TypeComposer.createTemp({
              name: `BazFoo`,
              fields: {
                bar: [
                  TypeComposer.createTemp({
                    name: `BazFooBar`,
                    fields: { baz: `Int` },
                  }),
                ],
              },
            }),
          ],
        ],
      },
    })

    addInferredFields(tc, exampleValue, typeName)

    const addedType = tc
      .getFieldTC(`foo`)
      .getFieldTC(`bar`)
      .getFieldTC(`qux`)
    expect(addedType.getTypeName()).toBe(`BazFooBarQux`)
  })

  it(`extends existing types`, () => {
    const exampleValue = {
      existing: {
        nested: { baz: true },
        nestedArray: [{ foo: `bar`, bar: true, baz: [[{ foo: true }]] }],
        deeplyNested: [[{ foo: { bar: 1, qux: { foo: true } } }]],
      },
    }

    // TODO: Maybe write this in SDL for better readability
    const typeName = `Qux`
    const tc = TypeComposer.createTemp({
      name: typeName,
      fields: {
        existing: TypeComposer.createTemp({
          name: `Existing`,
          fields: {
            foo: `Boolean`,
            nested: TypeComposer.createTemp({
              name: `Nested`,
              fields: { bar: `Int` },
            }),
            nestedArray: [
              TypeComposer.createTemp({
                name: `NestedArray`,
                fields: { qux: `Int` },
              }),
            ],
            deeplyNested: [
              [
                TypeComposer.createTemp({
                  name: `DeeplyNested`,
                  fields: {
                    foo: TypeComposer.create({
                      name: `DeeplyNestedFoo`,
                      fields: { baz: `Int` },
                    }),
                  },
                }),
              ],
            ],
          },
        }),
      },
    })

    addInferredFields(tc, exampleValue, typeName)

    const existingType = tc.getFieldTC(`existing`)
    const existingFields = existingType.getFieldNames()
    expect(existingFields).toEqual([
      `foo`,
      `nested`,
      `nestedArray`,
      `deeplyNested`,
    ])

    const nestedType = existingType.getFieldTC(`nested`)
    const nestedFields = nestedType.getFieldNames()
    expect(nestedFields).toEqual([`bar`, `baz`])

    const nestedArrayType = existingType.getFieldTC(`nestedArray`)
    const nestedArrayFields = nestedArrayType.getFieldNames()
    expect(nestedArrayFields).toEqual([`qux`, `foo`, `bar`, `baz`])

    const nestedArrayAddedType = nestedArrayType.getFieldTC(`baz`)
    const nestedArrayAddedFields = nestedArrayAddedType.getFieldNames()
    expect(nestedArrayAddedFields).toEqual([`foo`])

    const nestedArrayAddedFieldType = nestedArrayType.getFieldType(`baz`)
    expect(nestedArrayAddedFieldType).toBeInstanceOf(GraphQLList)
    expect(nestedArrayAddedFieldType.ofType).toBeInstanceOf(GraphQLList)
    expect(nestedArrayAddedFieldType.ofType.ofType).toBeInstanceOf(
      GraphQLObjectType
    )

    const deeplyNestedType = existingType.getFieldTC(`deeplyNested`)
    const deeplyNestedFields = deeplyNestedType.getFieldNames()
    expect(deeplyNestedFields).toEqual([`foo`])

    const deeplyNestedFooType = deeplyNestedType.getFieldTC(`foo`)
    const deeplyNestedFooFields = deeplyNestedFooType.getFieldNames()
    expect(deeplyNestedFooFields).toEqual([`baz`, `bar`, `qux`])

    const deeplyNestedFooAddedType = deeplyNestedFooType.getFieldTC(`qux`)
    const deeplyNestedFooAddedFields = deeplyNestedFooAddedType.getFieldNames()
    expect(deeplyNestedFooAddedFields).toEqual([`foo`])
  })

  it(`does not overwrite pre-existing fields`, () => {
    const exampleValue = {
      foo: 1,
      bar: [1],
      baz: [true],
      qux: [[true]],
      nested: 1,
      nestedObject: { foo: 1 },
    }

    const typeName = `Foo`
    const tc = TypeComposer.createTemp({
      name: typeName,
      fields: {
        foo: `Boolean`,
        bar: [`Boolean`],
        baz: `Boolean`,
        qux: [`Boolean`],
        nested: TypeComposer.createTemp({
          name: `Nested`,
          fields: {
            foo: `Boolean`,
          },
        }),
        nestedObject: `Boolean`,
      },
    })

    addInferredFields(tc, exampleValue, typeName)

    expect(tc.getFieldType(`foo`)).toBe(GraphQLBoolean)
    expect(tc.getFieldType(`bar`)).toBeInstanceOf(GraphQLList)
    expect(tc.getFieldType(`bar`).ofType).toBe(GraphQLBoolean)
    expect(tc.getFieldType(`baz`)).toBe(GraphQLBoolean)
    expect(tc.getFieldType(`qux`)).toBeInstanceOf(GraphQLList)
    expect(tc.getFieldType(`qux`).ofType).toBe(GraphQLBoolean)
    expect(tc.getFieldType(`nested`)).toBeInstanceOf(GraphQLObjectType)
    expect(tc.getFieldType(`nestedObject`)).toBe(GraphQLBoolean)
  })

  it(`honors MAX_DEPTH setting`, () => {
    const exampleValue = {
      foo: { bar: { baz: { qux: { foo: { bar: { baz: true } } } } } },
    }

    const typeName = `Foo`
    const tc = TypeComposer.createTemp(typeName)

    addInferredFields(tc, exampleValue, typeName)

    const addedType = tc
      .getFieldTC(`foo`)
      .getFieldTC(`bar`)
      .getFieldTC(`baz`)
      .getFieldTC(`qux`)
      .getFieldTC(`foo`)
      .getFieldType(`bar`)
    expect(addedType).toBe(GraphQLJSON)
  })

  describe(`File type inference`, () => {
    it(`infers File type from filepath if filepath exists in db`, () => {
      const exampleValue = getById(`foo1`)

      const typeName = `Foo`
      const tc = TypeComposer.createTemp(typeName)
      addInferredFields(tc, exampleValue, typeName)

      const filePathField = tc.getField(`filePath`)
      expect(filePathField.type).toBe(`File`)
      expect(filePathField.resolve).toBeInstanceOf(Function)

      const filePathsField = tc.getField(`filePaths`)
      expect(filePathsField.type).toEqual([[`File`]])
      expect(filePathsField.resolve).toBeInstanceOf(Function)
    })

    it.skip(`does not infer File types when File is not registered`, () => {
      schemaComposer.delete(`File`)

      const exampleValue = getById(`foo1`)

      const typeName = `Foo`
      const tc = TypeComposer.createTemp(typeName)
      addInferredFields(tc, exampleValue, typeName)

      const filePathField = tc.getField(`filePath`)
      expect(filePathField.type).toBe(`String`)

      const filePathsField = tc.getField(`filePaths`)
      expect(filePathsField.type).toEqual([[`String`]])
    })
  })

  describe(`handles mappings defined in gatsby-config.js`, () => {
    let linkExampleValue, linkTypeName, LinkTC
    let linkedExampleValue, linkedTypeName, LinkedTC

    beforeAll(() => {
      const { store } = require(`../../../redux`)
      store.dispatch({
        type: `SET_SITE_CONFIG`,
        payload: {
          mapping: {
            [`Link.linkedById`]: `Linked`,
            [`Link.linkedByField`]: `Linked.foo`,
            [`Link.linkedByNestedField`]: `Linked.nested.foo`,
            [`Link.linkedByNestedArray`]: `Linked.nested.array`,
            [`Link.linkedByNestedArrayOfObjectsField`]: `Linked.nested.arrayOfObjects.foo`,
            [`Link.manyLinkedById`]: `Linked`,
            [`Link.manyLinkedByField`]: `Linked.foo`,
            [`Link.manyLinkedByNestedField`]: `Linked.nested.foo`,
            [`Link.manyLinkedByNestedArray`]: `Linked.nested.array`,
            [`Link.manyLinkedByNestedArrayOfObjectsField`]: `Linked.nested.arrayOfObjects.foo`,
          },
        },
      })

      linkExampleValue = getById(`link1`)
      linkTypeName = `Link`
      LinkTC = TypeComposer.create(linkTypeName)

      linkedExampleValue = getById(`link2`)
      linkedTypeName = `Linked`
      LinkedTC = TypeComposer.create(linkedTypeName)

      addInferredFields(LinkTC, linkExampleValue, linkTypeName)
      addInferredFields(LinkedTC, linkedExampleValue, linkedTypeName)
    })

    it(`infers correct type of foreign-key fields`, () => {
      const linkFields = LinkTC.getFields()
      expect(linkFields.linkedById.type).toBe(`Linked`)
      expect(linkFields.linkedByField.type).toBe(`Linked`)
      expect(linkFields.linkedByNestedField.type).toBe(`Linked`)
      expect(linkFields.linkedByNestedArray.type).toBe(`Linked`)
      expect(linkFields.linkedByNestedArrayOfObjectsField.type).toBe(`Linked`)
      expect(linkFields.manyLinkedById.type).toEqual([`Linked`])
      expect(linkFields.manyLinkedByField.type).toEqual([`Linked`])
      expect(linkFields.manyLinkedByNestedField.type).toEqual([`Linked`])
      expect(linkFields.manyLinkedByNestedArray.type).toEqual([`Linked`])
      expect(linkFields.manyLinkedByNestedArrayOfObjectsField.type).toEqual([
        `Linked`,
      ])
    })

    it(`adds resolvers`, async () => {
      const linkFields = LinkTC.getFields()
      const returnType = LinkedTC.getType()
      const returnTypeList = LinkedTC.getTypePlural()
      schemaComposer.Query.addFields({ link: LinkTC, linked: LinkedTC })
      const schema = schemaComposer.buildSchema()

      const getResult = async fieldName => {
        const resolver = linkFields[fieldName].resolve
        expect(resolver).toBeInstanceOf(Function)
        return resolver(
          linkExampleValue,
          {},
          {},
          {
            fieldName,
            returnType: fieldName.startsWith(`many`)
              ? returnTypeList
              : returnType,
            schema,
          }
        )
      }

      expect(await getResult(`linkedById`)).toEqual(linkedExampleValue)
      expect(await getResult(`linkedByField`)).toEqual(linkedExampleValue)
      expect(await getResult(`linkedByNestedField`)).toEqual(linkedExampleValue)
      expect(await getResult(`linkedByNestedArray`)).toEqual(linkedExampleValue)
      expect(await getResult(`linkedByNestedArrayOfObjectsField`)).toEqual(
        linkedExampleValue
      )
      expect(await getResult(`manyLinkedById`)).toEqual([linkedExampleValue])
      expect(await getResult(`manyLinkedByField`)).toEqual([linkedExampleValue])
      expect(await getResult(`manyLinkedByNestedField`)).toEqual([
        linkedExampleValue,
      ])
      expect(await getResult(`manyLinkedByNestedArray`)).toEqual([
        linkedExampleValue,
      ])
      expect(await getResult(`manyLinkedByNestedArrayOfObjectsField`)).toEqual([
        linkedExampleValue,
      ])
    })
  })

  describe(`handles foreign-key fields with ___NODE convention`, () => {
    let linkExampleValue, linkTypeName, LinkTC
    let linkedExampleValue, linkedTypeName, LinkedTC

    beforeAll(() => {
      linkExampleValue = getById(`linkNode1`)
      linkTypeName = `NodeLink`
      LinkTC = TypeComposer.create(linkTypeName)

      linkedExampleValue = getById(`linkNode2`)
      linkedTypeName = `NodeLinked`
      LinkedTC = TypeComposer.create(linkedTypeName)

      addInferredFields(LinkTC, linkExampleValue, linkTypeName)
      addInferredFields(LinkedTC, linkedExampleValue, linkedTypeName)
    })

    it(`infers correct type of foreign-key fields and strips postfix from field name`, () => {
      const {
        linkedById,
        arrayId,
        manyLinkedById,
        manyArrayId,
        linkedByField,
        arrayField,
        manyLinkedByField,
        manyArrayField,
      } = LinkTC.getFields()
      expect(linkedById.type).toBe(`NodeLinked`)
      expect(arrayId.type[0].getFields().linkedById.type).toBe(`NodeLinked`)
      expect(manyLinkedById.type).toEqual([`NodeLinked`])
      expect(manyArrayId.type[0].getFields().manyLinkedById.type).toEqual([
        `NodeLinked`,
      ])
      expect(linkedByField.type).toBe(`NodeLinked`)
      expect(arrayField.type[0].getFields().linkedByField.type).toBe(
        `NodeLinked`
      )
      expect(manyLinkedByField.type).toEqual([`NodeLinked`])
      expect(manyArrayField.type[0].getFields().manyLinkedByField.type).toEqual(
        [`NodeLinked`]
      )
    })

    it(`adds resolvers`, async () => {
      const linkFields = LinkTC.getFields()
      const returnType = LinkedTC.getType()
      const returnTypeList = LinkedTC.getTypePlural()
      schemaComposer.Query.addFields({ link: LinkTC, linked: LinkedTC })
      const schema = schemaComposer.buildSchema()

      const getResult = async fieldName => {
        const resolver = linkFields[fieldName].resolve
        expect(resolver).toBeInstanceOf(Function)
        return resolver(
          linkExampleValue,
          {},
          {},
          {
            fieldName,
            returnType: fieldName.startsWith(`many`)
              ? returnTypeList
              : returnType,
            schema,
          }
        )
      }

      expect(await getResult(`linkedById`)).toEqual(linkedExampleValue)
      expect(await getResult(`manyLinkedById`)).toEqual([linkedExampleValue])
      expect(await getResult(`linkedByField`)).toEqual(linkedExampleValue)
      expect(await getResult(`manyLinkedByField`)).toEqual([linkedExampleValue])
    })
  })

  describe(`Invalid characters in field name`, () => {
    it(`converts invalid characters to underscores`, () => {
      const exampleValue = { ünvälid: true }

      const typeName = `Foo`
      const tc = TypeComposer.createTemp(typeName)
      addInferredFields(tc, exampleValue, typeName)

      expect(tc.hasField(`_nv_lid`)).toBeTruthy()
      expect(tc.hasField(`ünvälid`)).toBeFalsy()
    })

    it(`adds a proxy resolver to the original field name`, () => {
      const exampleValue = { ünvälid: true }

      const typeName = `Foo`
      const tc = TypeComposer.createTemp(typeName)
      addInferredFields(tc, exampleValue, typeName)

      const { resolve } = tc.getFieldConfig(`_nv_lid`)
      expect(resolve).toBeInstanceOf(Function)

      let result
      result = resolve({ ünvälid: `foo` }, {}, {}, { fieldName: `_nv_lid` })
      expect(result).toBe(`foo`)
      result = resolve({ _nv_alid: `foo` }, {}, {}, { fieldName: `_nv_lid` })
      expect(result).toBeUndefined()
    })

    it(`throws when converted field name already exists`, () => {
      const exampleValue = { ünvälid: true, _nv_lid: true }

      const typeName = `Foo`
      const tc = TypeComposer.createTemp(typeName)
      const fn = () => addInferredFields(tc, exampleValue, typeName)

      expect(fn).toThrow()
    })

    it(`converts invalid characters in ___NODE fields to underscores`, () => {
      const exampleValue = { ünvälid___NODE: `linkNodeName2` }

      const typeName = `Foo`
      const tc = TypeComposer.createTemp(typeName)
      addInferredFields(tc, exampleValue, typeName)

      expect(tc.hasField(`_nv_lid`)).toBeTruthy()
      expect(tc.hasField(`ünvälid`)).toBeFalsy()
      expect(tc.hasField(`ünvälid___NODE`)).toBeFalsy()
    })

    it(`adds a proxy resolver on ___NODE fields to the original field name`, async () => {
      const linkNode = getById(`linkNodeName1`)
      const linkTypeName = `LinkNode`
      const LinkTC = TypeComposer.create(linkTypeName)

      const linkedNode = getById(`linkNodeName2`)
      const linkedTypeName = `LinkedNode`
      const LinkedTC = TypeComposer.create(linkedTypeName)

      addInferredFields(LinkTC, linkNode, linkTypeName)
      addInferredFields(LinkedTC, linkedNode, linkedTypeName)

      schemaComposer.Query.addFields({ link: LinkTC, linked: LinkedTC })
      const schema = schemaComposer.buildSchema()
      const returnType = LinkedTC.getType()

      const { resolve } = LinkTC.getFieldConfig(`_nv_lid`)
      expect(resolve).toBeInstanceOf(Function)

      let result
      result = await resolve(
        linkNode,
        {},
        {},
        { fieldName: `_nv_lid`, returnType, schema }
      )
      expect(result).toBe(linkedNode)
    })
  })
})
