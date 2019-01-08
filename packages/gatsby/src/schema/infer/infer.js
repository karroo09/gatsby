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
          addInferredFields(tc.getFieldTC(key), value, selector, depth + 1)
        }
      }
      return acc
    }

    // TODO: Maybe pull out in `fieldConfig = getType(value, selector, depth)`
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
        // FIXME: The weird thing is that we are trying to infer a File,
        // but cannot assume that a source plugin for File nodes is actually present.
        // Same goes for special cases. The alternative would be for plugins to be
        // able to register special cases and type inference rules, but that seems
        // like overkill. Or: promote source-filesystem to an internal plugin.
        if (/* schemaComposer.has(`File`) && */ isFile(selector, value)) {
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
        if (value instanceof Date) {
          fieldConfig = `Date`
          break
        }
        if (value instanceof String) {
          fieldConfig = `String`
          break
        }
        if (value && depth < MAX_DEPTH) {
          // TODO: Be consistent: use getOrCreateTC everywhere, or:
          // : TypeComposer.createTemp({
          //   name: createTypeName(selector),
          //   fields: {},
          // }),
          // : new TypeComposer(new GraphQLObjectType())
          fieldConfig = addInferredFields(
            schemaComposer.getOrCreateTC(createTypeName(selector)),
            value,
            selector,
            depth + 1
          )
          break
        }
        fieldConfig = `JSON`
        break
      default:
        // null
        fieldConfig = `JSON`
    }

    // There is currently no non-hacky way to programmatically add
    // directives to fields.
    if (fieldConfig === `Date`) {
      fieldConfig = {
        type: `Date`,
        astNode: {
          kind: `FieldDefinition`,
          directives: [
            {
              arguments: [],
              kind: `Directive`,
              name: { kind: `Name`, value: `dateformat` },
            },
          ],
        },
      }
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

  Object.entries(fields).forEach(([fieldName, fieldConfig]) =>
    // !tc.hasField(fieldName) &&
    tc.setField(fieldName, fieldConfig)
  )
  return tc
}

module.exports = {
  addInferredFields,
}
