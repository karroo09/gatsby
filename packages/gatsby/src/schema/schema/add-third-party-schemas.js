const { schemaComposer, TypeComposer } = require(`graphql-compose`)

const { store } = require(`../../redux`)

const addThirdPartySchemas = () => {
  const schemas = store.getState().thirdPartySchemas
  schemas.forEach(schema => {
    const QueryTC = TypeComposer.createTemp(schema.getQueryType())
    const fields = QueryTC.getFields()
    schemaComposer.Query.addFields(fields)

    // Explicitly add the third-party schema's types, so they can be targeted
    // in `addResolvers` API.
    const rootTypeName = Object.values(fields)[0].type.name
    const types = schema.getTypeMap()
    Object.entries(types).forEach(
      ([typeName, type]) =>
        typeName.startsWith(rootTypeName) && schemaComposer.add(type)
    )
  })
}

module.exports = addThirdPartySchemas
