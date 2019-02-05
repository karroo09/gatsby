const { schemaComposer } = require(`graphql-compose`)
const {
  GraphQLList,
  GraphQLObjectType,
  defaultFieldResolver,
} = require(`graphql`)
const invariant = require(`invariant`)

const { isFile } = require(`./is-file`)
const { link } = require(`../resolvers`)
const {
  createFieldName,
  createSelector,
  createTypeName,
  is32bitInteger,
  isDate,
  isObject,
} = require(`../utils`)
const { store } = require(`../../redux`)

// Deeper nested levels should be inferred as JSON.
const MAX_DEPTH = 5

const hasMapping = selector => {
  const { mapping } = store.getState().config
  return mapping && Object.keys(mapping).includes(selector)
}

const getFieldConfigFromMapping = selector => {
  const { mapping } = store.getState().config
  const [type, ...path] = mapping[selector].split(`.`)
  return { type, resolve: link({ by: path.join(`.`) || `id` }) }
}

const getFieldConfigFromFieldNameConvention = (value, key) => {
  const { getById, getNodes } = require(`../db`)
  const { getUniqueValues, getValueAtSelector } = require(`../utils`)

  const path = key.split(`___NODE___`)[1]
  // Allow linking by nested fields, e.g. `author___NODE___contact___email`
  const foreignKey = path && path.replace(/___/g, `.`)

  const getNodeBy = value =>
    foreignKey
      ? getNodes().find(node => getValueAtSelector(node, foreignKey) === value)
      : getById(value)

  const linkedNodes = Array.isArray(value)
    ? value.map(getNodeBy)
    : [getNodeBy(value)]

  const linkedTypes = getUniqueValues(
    linkedNodes.filter(Boolean).map(node => node.internal.type)
  )

  invariant(
    linkedTypes.length,
    `Could not infer a GraphQL type for the field "${key}".`
  )

  let type
  // If the field value is an array that links to more than one type,
  // create a GraphQLUnionType. Note that we don't support the case where
  // scalar fields link to different types. Similarly, an array of objects
  // with foreign-key fields will produce union types if those foreign-key
  // fields are arrays, but not if they are scalars. See the tests for an example.
  // FIXME: The naming of union types is a breaking change. In current master,
  // the type name includes the key, which is (i) potentially not unique, and
  // (ii) hinders reusing types.
  if (linkedTypes.length > 1) {
    const typeName = linkedTypes.sort().join(``) + `Union`
    schemaComposer.getOrCreateUTC(typeName, utc => {
      const types = linkedTypes.map(typeName =>
        schemaComposer.getOrCreateTC(typeName)
      )
      utc.setTypes(types)
      utc.setResolveType(node => node.internal.type)
    })
  } else {
    type = linkedTypes[0]
  }

  return { type, resolve: link({ by: foreignKey || `id` }) }
}

const getFieldConfig = (value, selector, depth) => {
  switch (typeof value) {
    case `boolean`:
      return `Boolean`
    case `number`:
      return is32bitInteger(value) ? `Int` : `Float`
    case `string`:
      if (isDate(value)) {
        return `Date`
      }
      // FIXME: The weird thing is that we are trying to infer a File,
      // but cannot assume that a source plugin for File nodes is actually present.
      if (schemaComposer.has(`File`) && isFile(selector, value)) {
        // NOTE: For arrays of files, where not every path references
        // a File node in the db, it is semi-random if the field is
        // inferred as File or String, since the exampleValue only has
        // the first entry (which could point to an existing file or not).
        return { type: `File`, resolve: link({ by: `relativePath` }) }
      }
      return `String`
    case `object`:
      if (value instanceof Date) {
        return `Date`
      }
      if (value instanceof String) {
        return `String`
      }
      if (value && depth < MAX_DEPTH) {
        return addInferredFields(
          schemaComposer.getOrCreateTC(createTypeName(selector)),
          value,
          selector,
          depth + 1
        )
      }
      return `JSON`
    default:
      // null
      return `JSON`
  }
}

const addInferredFields = (tc, obj, prefix, depth = 0) => {
  const fields = Object.entries(obj).reduce(
    (acc, [unsanitizedKey, exampleValue]) => {
      let key = createFieldName(unsanitizedKey)
      const selector = createSelector(
        prefix,
        key
      )

      let arrays = 0
      let value = exampleValue
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
            if (fieldType instanceof GraphQLList) lists++
            fieldType = fieldType.ofType
          }

          if (lists === arrays && fieldType instanceof GraphQLObjectType) {
            addInferredFields(tc.getFieldTC(key), value, selector, depth + 1)
          }
        }
        return acc
      }

      let fieldConfig
      if (hasMapping(selector)) {
        // TODO: Use `prefix` instead of `selector` in hasMapping and getFromMapping?
        // i.e. does the config contain sanitized field names?
        fieldConfig = getFieldConfigFromMapping(selector)
      } else if (key.includes(`___NODE`)) {
        fieldConfig = getFieldConfigFromFieldNameConvention(
          exampleValue,
          unsanitizedKey
        )
        key = key.split(`___NODE`)[0]
      } else {
        fieldConfig = getFieldConfig(value, selector, depth)
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

      fieldConfig = fieldConfig.type ? fieldConfig : { type: fieldConfig }

      while (arrays--) {
        fieldConfig = { ...fieldConfig, type: [fieldConfig.type] }
      }

      // Proxy resolver to unsanitized fieldName in case it contained invalid characters
      if (key !== unsanitizedKey) {
        // Don't create a field with the sanitized key if a field with that name already exists
        invariant(
          obj[key] == null && !tc.hasField(key),
          `Invalid key ${unsanitizedKey} on ${prefix}. GraphQL field names must ` +
            `only contain characters matching /^[a-zA-Z][_a-zA-Z0-9]*$/. and ` +
            `must not start with a double underscore.`
        )

        const resolver = fieldConfig.resolve || defaultFieldResolver
        fieldConfig.resolve = (source, args, context, info) =>
          resolver(source, args, context, {
            ...info,
            fieldName: unsanitizedKey,
          })
      }

      acc[key] = fieldConfig

      return acc
    },
    {}
  )

  Object.entries(fields).forEach(([fieldName, fieldConfig]) =>
    tc.setField(fieldName, fieldConfig)
  )
  return tc
}

module.exports = {
  addInferredFields,
}
