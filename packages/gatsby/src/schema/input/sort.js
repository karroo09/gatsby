const { getNamedType, GraphQLInputObjectType } = require(`graphql`)
const { schemaComposer, EnumTypeComposer } = require(`graphql-compose`)

const { createSelector, createSortKey } = require(`../utils`)

const MAX_SORT_DEPTH = 3
const SORT_FIELD_DELIMITER = `___`

const SortOrderEnum = EnumTypeComposer.create({
  name: `SortOrderEnum`,
  values: {
    ASC: { value: `ASC` },
    DESC: { value: `DESC` },
  },
})

const convert = (fields, prefix = ``, depth = 0) => {
  const sortFields = Object.entries(fields).reduce(
    (acc, [fieldName, fieldConfig]) => {
      const type = getNamedType(fieldConfig.type)
      const sortKey = createSelector(prefix, fieldName)

      if (type instanceof GraphQLInputObjectType) {
        if (depth < MAX_SORT_DEPTH) {
          Object.assign(acc, convert(type.getFields(), sortKey, depth + 1))
        }
      } else {
        // GraphQLScalarType || GraphQLEnumType
        acc[createSortKey(sortKey, SORT_FIELD_DELIMITER)] = {
          value: sortKey,
        }
      }
      return acc
    },
    {}
  )
  return sortFields
}

const getSortInput = itc => {
  const fields = convert(itc.getFields())

  const typeName = itc.getTypeName().replace(/Input$/, ``)

  const FieldsEnumTC = schemaComposer.getOrCreateETC(
    typeName + `FieldsEnum`,
    etc => etc.addFields(fields)
  )

  const SortInputTC = schemaComposer.getOrCreateITC(
    typeName + `SortInput`,
    itc =>
      itc.addFields({
        fields: [FieldsEnumTC],
        order: { type: SortOrderEnum, defaultValue: `ASC` },
      })
  )

  return [SortInputTC, FieldsEnumTC]
}

module.exports = getSortInput
