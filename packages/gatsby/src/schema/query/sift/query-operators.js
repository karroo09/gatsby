const { schemaComposer, InputTypeComposer } = require(`graphql-compose`)
const { GraphQLEnumType } = require(`graphql`)

const EQ = `eq`
const NE = `ne`
const GT = `gt`
const GTE = `gte`
const LT = `lt`
const LTE = `lte`
const IN = `in[]`
const NIN = `nin[]`
const REGEX = `regex`
const GLOB = `glob`

// FIXME: What to do with custom scalars, and with JSON?
//        Currently, we just omit them.
// FIXME: Which enum operators?
const ALLOWED_OPERATORS = {
  Boolean: [EQ, NE], // TODO: IN?, NIN? @see #11197
  Date: [EQ, NE, GT, GTE, LT, LTE, IN, NIN],
  Float: [EQ, NE, GT, GTE, LT, LTE, IN, NIN],
  ID: [EQ, NE, IN, NIN],
  Int: [EQ, NE, GT, GTE, LT, LTE, IN, NIN],
  // JSON: [EQ, NE],
  String: [EQ, NE, IN, NIN, REGEX, GLOB],
  Enum: [EQ, NE, IN, NIN],
}

const ARRAY_OPERATORS = [IN, NIN]

const getOperatorFields = (fieldType, operators) =>
  operators.reduce((acc, op) => {
    if (ARRAY_OPERATORS.includes(op)) {
      acc[op] = [fieldType]
    } else {
      acc[op] = fieldType
    }
    return acc
  }, {})

const getQueryOperatorInput = type => {
  const typeName = type instanceof GraphQLEnumType ? `Enum` : type.name
  const operators = ALLOWED_OPERATORS[typeName]
  return operators
    ? schemaComposer.getOrCreateITC(type.name + `QueryOperatorInput`, itc =>
        itc.addFields(getOperatorFields(type, operators))
      )
    : null
}

const getQueryOperatorListInput = itc => {
  const typeName = itc.getTypeName().replace(/Input$/, `ListInput`)
  // We cannot use `schemaComposer.getOrCreateITC` here because we need to delay
  // field creation with a thunk.
  return schemaComposer.has(typeName)
    ? schemaComposer.getITC(typeName)
    : InputTypeComposer.create({
        name: typeName,
        fields: () => ({
          // TODO: Should the `elemMatch` field get a new type with a name
          // ending in `ListQueryOperatorInput`?
          elemMatch: itc,
          ...itc.getFields(),
        }),
      })
}

module.exports = { getQueryOperatorListInput, getQueryOperatorInput }
