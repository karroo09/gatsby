const {
  schemaComposer,
  TypeComposer,
  SchemaComposer,
} = require(`graphql-compose`)
const { GraphQLObjectType } = require(`graphql`)

const addThirdPartySchemas = require(`../add-third-party-schemas`)
const { dispatch } = require(`../../../redux`).store
const { addThirdPartySchema } = require(`../../../redux/actions`).actions

const thirdPartySchemaComposer = new SchemaComposer()
const ThirdParty_Foo = new GraphQLObjectType({
  name: `ThirdParty_Foo`,
  fields: { foo: { type: `Boolean` } },
})
const ThirdParty = new GraphQLObjectType({
  name: `ThirdParty`,
  fields: { foo: { type: ThirdParty_Foo } },
})
thirdPartySchemaComposer.Query.addFields({
  thirdParty: {
    type: ThirdParty,
    resolve: () => {},
  },
})
const thirdPartySchema = thirdPartySchemaComposer.buildSchema()
dispatch(addThirdPartySchema({ schema: thirdPartySchema }))

TypeComposer.create(`type Foo { foo: Boolean }`)
schemaComposer.Query.addFields({
  allFoo: {
    type: [`Foo`],
    resolve: () => {},
  },
})

addThirdPartySchemas()
const schema = schemaComposer.buildSchema()

describe(`Add third-party schemas`, () => {
  it(`adds fields to Query type`, () => {
    const queryFields = schema.getQueryType().getFields()
    expect(Object.keys(queryFields)).toEqual([`allFoo`, `thirdParty`])
    expect(queryFields.thirdParty.type.name).toBe(`ThirdParty`)
    expect(queryFields.thirdParty.resolve).toBeInstanceOf(Function)
  })

  it(`adds types to schemaComposer`, () => {
    expect(schemaComposer.has(`ThirdParty`)).toBeTruthy()
    expect(schemaComposer.has(`ThirdParty_Foo`)).toBeTruthy()
  })
})
