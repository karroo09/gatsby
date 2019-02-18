const { SchemaComposer } = require(`graphql-compose`)
const {
  GraphQLInputObjectType,
  GraphQLBoolean,
  GraphQLList,
  GraphQLEnumType,
} = require(`graphql`)

const { getFilterInput } = require(`../filter`)
const {
  addNodeInterface,
  getNodeInterface,
} = require(`../../types/node-interface`)

const schemaComposer = new SchemaComposer()
const nodeInterfaceFields = getNodeInterface({ schemaComposer }).getFieldNames()
const operators = {
  bool: [`eq`, `ne`, `in`, `nin`],
  id: [`eq`, `ne`, `in`, `nin`],
  string: [`eq`, `ne`, `in`, `nin`, `regex`, `glob`],
  enum: [`eq`, `ne`, `in`, `nin`],
}
const typeComposer = schemaComposer.createTC({
  name: `Foo`,
  fields: {
    bool: `Boolean`,
    int: `Int`,
    float: `Float`,
    string: `String`,
    date: `Date`,
    json: `JSON`,
    array: [`Boolean`],
    nested: [`type Nested { bool: [Boolean!]! }`],
    enum: `enum CustomEnum { FOO BAR }`,
  },
})
addNodeInterface({ schemaComposer, typeComposer })
const filter = getFilterInput({ schemaComposer, typeComposer })
const itc = typeComposer.getITC()

describe(`Filter input`, () => {
  it(`constructs complete input filter`, () => {
    expect(filter.getType()).toBeInstanceOf(GraphQLInputObjectType)
    expect(filter.getFieldNames()).toEqual(
      itc.getFieldNames().filter(name => ![`json`].includes(name))
    )
  })

  it(`adds query operator fields`, () => {
    expect(filter.getFieldTC(`bool`).getFieldNames()).toEqual(operators.bool)
    expect(filter.getFieldTC(`array`).getFieldNames()).toEqual(operators.bool)
  })

  it(`does not mutate input`, () => {
    expect(itc.getFieldType(`bool`)).toBe(GraphQLBoolean)
    expect(itc.getFieldType(`array`)).toBeInstanceOf(GraphQLList)
    expect(itc.getFieldType(`array`).ofType).toBe(GraphQLBoolean)
  })

  it(`adds query operator fields for nested fields`, () => {
    expect(filter.getFieldTC(`nested`).getFieldNames()).toEqual([`elemMatch`])
  })

  it(`adds query operator field for arrays of objects`, () => {
    expect(
      filter
        .getFieldTC(`nested`)
        .getFieldTC(`elemMatch`)
        .getFieldNames()
    ).toEqual([`bool`])
  })

  it(`adds query operator fields for enum fields`, () => {
    expect(filter.getFieldTC(`enum`).getFieldNames()).toEqual(operators.enum)
    expect(filter.getFieldTC(`enum`).getFieldType(`eq`).name).toBe(`CustomEnum`)
    expect(filter.getFieldTC(`enum`).getField(`eq`)).toBeInstanceOf(
      GraphQLEnumType
    )
  })

  it(`does not add query operator fields for JSON fields`, () => {
    expect(filter.getFieldNames()).not.toEqual(expect.arrayContaining([`json`]))
  })

  it(`adds query operator fields for Node interface fields`, () => {
    expect(filter.getFieldTC(`id`).getFieldNames()).toEqual(operators.id)

    expect(filter.getFieldType(`parent`)).toBeInstanceOf(GraphQLInputObjectType)
    expect(filter.getFieldType(`parent`).name).toBe(`NodeInput`)
    expect(filter.getFieldTC(`parent`).getFieldNames()).toEqual(
      nodeInterfaceFields
    )

    expect(filter.getFieldType(`children`)).toBeInstanceOf(
      GraphQLInputObjectType
    )
    expect(filter.getFieldType(`children`).name).toBe(`NodeListInput`)
    expect(filter.getFieldTC(`children`).getFieldNames()).toEqual(
      expect.arrayContaining([...nodeInterfaceFields, `elemMatch`])
    )

    expect(filter.getFieldType(`internal`)).toBeInstanceOf(
      GraphQLInputObjectType
    )
    expect(filter.getFieldType(`internal`).name).toBe(`InternalInput`)
    expect(filter.getFieldTC(`internal`).getFieldNames()).toEqual([
      `content`,
      `contentDigest`,
      `description`,
      `fieldOwners`,
      `ignoreType`,
      `mediaType`,
      `owner`,
      `type`,
    ])
    expect(
      filter
        .getFieldTC(`internal`)
        .getFieldTC(`type`)
        .getFieldNames()
    ).toEqual(operators.string)

    expect(
      filter
        .getFieldTC(`children`)
        .getFieldTC(`id`)
        .getFieldNames()
    ).toEqual(operators.id)
    expect(
      filter
        .getFieldTC(`parent`)
        .getFieldTC(`parent`)
        .getFieldTC(`id`)
        .getFieldNames()
    ).toEqual(operators.id)
    expect(
      filter
        .getFieldTC(`children`)
        .getFieldTC(`parent`)
        .getFieldTC(`children`)
        .getFieldTC(`id`)
        .getFieldNames()
    ).toEqual(operators.id)
  })

  it(`constructs input filter with query operator fields`, () => {
    expect(
      Object.entries(filter.getFields()).map(([field, tc]) => {
        return {
          field,
          type: {
            name: tc.getTypeName(),
            fields: tc.getFieldNames(),
          },
        }
      })
    ).toMatchSnapshot()
  })

  it(`does not add fields without query operators`, () => {
    // JSON fields don't have query operators
    schemaComposer.createTC(`type EmptyNested { json: JSON }`)
    schemaComposer.createTC(
      `type EmptyNestedNested { json: JSON, nested: EmptyNested }`
    )
    const typeComposer = schemaComposer.createTC(
      `type Empty {
        json: JSON
        nested: EmptyNested
        nestedNested: EmptyNestedNested
      }`
    )
    addNodeInterface({ schemaComposer, typeComposer })
    const filter = getFilterInput({ schemaComposer, typeComposer })

    expect(filter.getTypeName()).toBe(`EmptyFilterInput`)
    expect(filter.getFields().nested).toBeUndefined()
    expect(filter.getFields().nestedNested).toBeUndefined()
    expect(filter.getFieldNames()).toEqual([
      `id`,
      `parent`,
      `children`,
      `internal`,
    ])
  })
})
