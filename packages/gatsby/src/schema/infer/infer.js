const { schemaComposer } = require(`graphql-compose`)

const { isFile } = require(`./file`)
const { findMany, findOne, link } = require(`../resolvers`)
const {
  createSelector,
  createTypeName,
  is32bitInteger,
  isDate,
} = require(`../utils`)

// Deeper nested levels should be inferred as JSON.
const MAX_DEPTH = 3

const addInferredFields = (tc, value, prefix, depth = 0) => {
  const fields = Object.entries(value).reduce((acc, [key, value]) => {
    let arrays = 0
    while (Array.isArray(value)) {
      value = value[0]
      arrays++
    }

    const selector = createSelector(prefix, key)

    let fieldConfig
    switch (typeof value) {
      case `boolean`:
        fieldConfig = `Boolean`
        break
      case `number`:
        fieldConfig = is32bitInteger(value) ? `Int` : `Float`
        break
      case `string`:
        if (isDate(value)) {
          fieldConfig = `Date`
          break
        }
        if (isFile(selector, value)) {
          const type = arrays ? [`File`] : `File`
          // TODO: Should `link` be called with the `resolver`,
          // or should this be figured out in `link` itself?
          // We have all we need on `info.returnType`.
          const resolver = (arrays ? findMany : findOne)(`File`)
          fieldConfig = {
            type,
            resolve: link({ by: `relativePath` })(resolver),
          }
          break
        }
        fieldConfig = `String`
        break
      case `object`:
        fieldConfig =
          value instanceof Date
            ? `Date`
            : value && depth < MAX_DEPTH
              ? addInferredFields(
                  tc.hasField(key)
                    ? tc.getFieldTC(key)
                    : schemaComposer.getOrCreateTC(createTypeName(selector)),
                  // TODO: Be consistent: use getOrCreateTC everywhere, or:
                  // : TypeComposer.createTemp({
                  //   name: createTypeName(selector),
                  //   fields: {},
                  // }),
                  // : new TypeComposer(new GraphQLObjectType())
                  value,
                  selector,
                  depth + 1
                )
              : `JSON`
        break
      default:
        // null
        fieldConfig = `JSON`
    }

    if (typeof fieldConfig === `string`) {
      while (arrays-- > 0) fieldConfig = `[${fieldConfig}]`
    }

    acc[key] = fieldConfig

    return acc
  }, {})

  Object.entries(fields).forEach(
    ([fieldName, fieldConfig]) =>
      !tc.hasField(fieldName) && tc.setField(fieldName, fieldConfig)
  )
  return tc
}

module.exports = {
  addInferredFields,
}
