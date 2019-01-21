const { schemaComposer, TypeComposer } = require(`graphql-compose`)

const { store } = require(`../../redux`)
const { extendSelectionSet } = require(`../utils`)

// TODO: Maybe use graphql-compose Resolver, which
// would provides the projected fields out of the box.
const addProjectedFields = fields =>
  Object.entries(fields).reduce((acc, [fieldName, fieldConfig]) => {
    const { resolve } = fieldConfig
    acc[fieldName] = {
      ...fieldConfig,
      resolve: (source, args, context, info) => {
        // TODO: We don't need the whole selection set,
        // just the `projected` fields on children.
        const { getProjectionFromAST } = require(`graphql-compose`)
        const projection = getProjectionFromAST(info)
        const { selectionSet } = info.fieldNodes[0]
        extendSelectionSet(selectionSet, projection)
        return resolve(source, args, context, info)
      },
    }
    return acc
  }, {})

const addThirdPartySchemas = () => {
  const schemas = store.getState().thirdPartySchemas
  schemas.forEach(schema => {
    const QueryTC = TypeComposer.createTemp(schema.getQueryType())
    const fields = QueryTC.getFields()
    // TODO: Wrap field resolvers to include projected fields in the
    // selection set.
    schemaComposer.Query.addFields(addProjectedFields(fields))

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
