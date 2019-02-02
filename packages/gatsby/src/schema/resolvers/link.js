const { GraphQLList, getNullableType, getNamedType } = require(`graphql`)

const { equals, oneOf } = require(`../query`)
const { isObject } = require(`../utils`)

// FIXME: Handle array of arrays
// Maybe TODO: should we check fieldValue *and* info.returnType?
const link = ({ by = `id`, from }) => async (source, args, context, info) => {
  const fieldValue = source && source[from || info.fieldName]

  if (fieldValue == null || isObject(fieldValue)) return fieldValue
  if (
    Array.isArray(fieldValue) &&
    // TODO: Do we have to look with fieldValue.some(v => isObject(v)),
    // i.e. can we have sparse arrays here?
    (fieldValue[0] == null || isObject(fieldValue[0]))
  ) {
    return fieldValue
  }

  const { findMany, findOne } = require(`../resolvers`)

  // FIXME: Once we fully move to Loki, beware that the semantics
  // of oneOf changes - $in vs. $contains
  const operator = Array.isArray(fieldValue) ? oneOf : equals
  args.filter = by.split(`.`).reduceRight(
    (acc, key, i, { length }) => ({
      [key]: i === length - 1 ? operator(acc) : acc,
    }),
    fieldValue
  )

  const returnType = getNullableType(info.returnType)
  const type = getNamedType(returnType)

  if (returnType instanceof GraphQLList) {
    return findMany(type.name)({
      source,
      args,
      context,
      info,
    })
  } else {
    return findOne(type.name)({
      source,
      args: args.filter,
      context,
      info,
    })
  }
}

module.exports = link
