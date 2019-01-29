const {
  getNamedType,
  getNullableType,
  GraphQLInputObjectType,
  GraphQLList,
} = require(`graphql`)
const { InputTypeComposer } = require(`graphql-compose`)

const { getListQueryOperator, getQueryOperators } = require(`../query`)

const cache = new Map()

const convert = itc => {
  const type = itc.getType()
  if (cache.has(type)) {
    return cache.get(type)
  }

  const convertedITC = new InputTypeComposer(
    new GraphQLInputObjectType({
      name: itc.getTypeName(),
      fields: {},
    })
  )
  cache.set(type, convertedITC)

  const fields = itc.getFields()
  const convertedFields = Object.entries(fields).reduce(
    (acc, [fieldName, fieldConfig]) => {
      const type = getNamedType(fieldConfig.type)

      if (type instanceof GraphQLInputObjectType) {
        const OperatorsInputTC = convert(new InputTypeComposer(type))

        // TODO: array of arrays?
        const isListType =
          getNullableType(fieldConfig.type) instanceof GraphQLList

        // elemMatch operator
        acc[fieldName] = isListType
          ? getListQueryOperator(OperatorsInputTC)
          : OperatorsInputTC
      } else {
        // GraphQLScalarType || GraphQLEnumType
        const operatorFields = getQueryOperators(type)
        if (operatorFields) {
          acc[fieldName] = operatorFields
        }
      }

      return acc
    },
    {}
  )

  convertedITC.addFields(convertedFields)
  return convertedITC
}

const removeEmptyFields = itc => {
  const cache = new Set()
  const convert = itc => {
    if (cache.has(itc)) {
      return itc
    }
    cache.add(itc)
    const fields = itc.getFields()
    const nonEmptyFields = Object.entries(fields).reduce(
      (acc, [fieldName, fieldITC]) => {
        if (fieldITC instanceof InputTypeComposer) {
          const convertedITC = convert(fieldITC)
          if (convertedITC.getFieldNames().length) {
            acc[fieldName] = convertedITC
          }
        } else {
          acc[fieldName] = fieldITC
        }
        return acc
      },
      {}
    )
    itc.setFields(nonEmptyFields)
    return itc
  }
  return convert(itc)
}

const getFilterInput = itc => {
  const FilterInputTC = convert(itc)
  // Filter out any fields whose type has no query operator fields.
  // This will be the case if the input type has only had fields whose types
  // don't define query operators, e.g. a input type with JSON fields only.
  // We cannot already filter this out further above, because we need
  // to handle circular definitions, e.g. like in `NodeInput`.
  // NOTE: We can remove this if we can guarantee that every type has query
  // operators.
  return removeEmptyFields(FilterInputTC)
}

module.exports = getFilterInput
