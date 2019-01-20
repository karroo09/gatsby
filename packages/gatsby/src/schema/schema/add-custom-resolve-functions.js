const { schemaComposer } = require(`graphql-compose`)

const apiRunner = require(`../../utils/api-runner-node`)

// const addResolvers = resolvers => schemaComposer.addResolveMethods(resolvers)

const withResolver = (resolve, extraInfo) => (source, args, context, info) =>
  resolve(source, args, context, { ...info, ...extraInfo })

const addResolvers = resolvers => {
  Object.entries(resolvers).forEach(([typeName, fields]) => {
    if (schemaComposer.has(typeName)) {
      const tc = schemaComposer.getTC(typeName)
      Object.entries(fields).forEach(([fieldName, resolve]) => {
        if (tc.hasField(fieldName)) {
          const resolver = tc.getField(fieldName).resolve
          tc.extendField(fieldName, {
            // The original resolver is available on `info.resolver`
            // TODO: Should we just pass the resolver as the fifth argument?
            resolve: withResolver(resolve, { resolver }),
          })
        } else {
          const fieldConfig = resolve
          tc.addFields({ [fieldName]: fieldConfig })
        }
      })
    }
  })
}

const addCustomResolveFunctions = () =>
  apiRunner(`addResolvers`, { addResolvers })

module.exports = addCustomResolveFunctions
