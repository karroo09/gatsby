const { schemaComposer } = require(`graphql-compose`)
const { GraphQLList, GraphQLObjectType } = require(`graphql`)

const { isFile } = require(`./is-file`)
const { findMany, findOne, link } = require(`../resolvers`)
const {
  createSelector,
  createTypeName,
  is32bitInteger,
  isDate,
  isObject,
} = require(`../utils`)

// Deeper nested levels should be inferred as JSON.
const MAX_DEPTH = 3

const addInferredFields = (tc, value, prefix, depth = 0) => {
  const fields = Object.entries(value).reduce((acc, [key, value]) => {
    const selector = createSelector(prefix, key)

    let arrays = 0
    while (Array.isArray(value)) {
      value = value[0]
      arrays++
    }

    if (tc.hasField(key)) {
      if (isObject(value) /* && depth < MAX_DEPTH */) {
        // TODO: Use helper (similar to dropTypeModifiers)
        let lists = 0
        let fieldType = tc.getFieldType(key)
        while (fieldType.ofType) {
          fieldType instanceof GraphQLList && lists++
          fieldType = fieldType.ofType
        }

        if (lists === arrays && fieldType instanceof GraphQLObjectType) {
          acc[key] = addInferredFields(
            tc.getFieldTC(key),
            value,
            selector,
            depth + 1
          )
        }
      }
      return acc
    }

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
          // NOTE: For arrays of files, where not every path references
          // a File node in the db, it is semi-random if the field is
          // inferred as File or String, since the exampleValue only has
          // the first entry (which could point to an existing file or not).
          // TODO: Should `link` be called with the `resolver`,
          // or should this be figured out in `link` itself?
          // We have all we need on `info.returnType`.
          const resolver = (arrays ? findMany : findOne)(`File`)
          fieldConfig = {
            type: `File`,
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
                  schemaComposer.getOrCreateTC(createTypeName(selector)),
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

    // UPSTREAM: TC.makeFieldPlural
    // @see https://github.com/stefanprobst/graphql-compose/pull/new/make-field-plural
    while (arrays--) {
      fieldConfig = fieldConfig.type
        ? { ...fieldConfig, type: [fieldConfig.type] }
        : [fieldConfig]
    }
    // while (arrays--) fieldConfig = [fieldConfig]

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
