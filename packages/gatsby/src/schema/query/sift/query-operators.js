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
// const ELEMMATCH = 'elemMatch';
// const WHERE = 'where';
// const AND; OR; NOT; NOR;
// const SIZE;

// FIXME: What to do with custom scalars, and with JSON?
//        Currently, we just omit them.
// FIXME: Which enum operators?
const allowedOperators = {
  Boolean: [EQ, NE], // TODO: IN?, NIN? @see #11197
  Date: [EQ, NE, GT, GTE, LT, LTE, IN, NIN],
  Float: [EQ, NE, GT, GTE, LT, LTE, IN, NIN],
  ID: [EQ, NE, IN, NIN],
  Int: [EQ, NE, GT, GTE, LT, LTE, IN, NIN],
  // JSON: [EQ, NE],
  String: [EQ, NE, IN, NIN, REGEX, GLOB],
  Enum: [EQ, NE, IN, NIN],
}

const getOperatorFields = (fieldType, operators) =>
  operators.reduce((acc, op) => {
    if (op.slice(-2) === `[]`) {
      acc[op.slice(0, -2)] = [fieldType]
    } else {
      acc[op] = fieldType
    }
    return acc
  }, {})

const getQueryOperators = type => {
  const operators =
    // FIXME: Do we have to check for `EnumTypeComposer` as well?
    allowedOperators[type instanceof GraphQLEnumType ? `Enum` : type.name]
  return operators
    ? schemaComposer.getOrCreateITC(type.name + `QueryOperatorInput`, itc =>
        itc.addFields(getOperatorFields(type, operators))
      )
    : null
}

const getListQueryOperator = itc => {
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

// const getQueryOperators = type => {
//   const name = type.name + `QueryOperatorInput`
//   if (schemaComposer.has(name)) {
//     return schemaComposer.getITC(name)
//   }
//   const operators =
//     allowedOperators[type instanceof GraphQLEnumType ? `Enum` : type.name]
//   return operators
//     ? InputTypeComposer.create({
//         name,
//         fields: getOperatorFields(type, operators),
//       })
//     : null
// }

module.exports = { getListQueryOperator, getQueryOperators }
