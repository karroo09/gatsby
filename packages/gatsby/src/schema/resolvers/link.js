const {
  GraphQLList,
  getNullableType,
  getNamedType,
  isAbstractType,
} = require(`graphql`)

const { equals, oneOf } = require(`../query`)
const { isObject } = require(`../utils`)

// FIXME: Handle array of arrays
// Maybe TODO: should we check fieldValue *and* info.returnType?
const link = ({ by, from }) => async (source, args, context, info) => {
  const fieldValue = source[from || info.fieldName]

  if (fieldValue == null || isObject(fieldValue)) return fieldValue
  if (
    Array.isArray(fieldValue) &&
    // TODO: Do we have to look with fieldValue.some(v => isObject(v))?
    (fieldValue[0] == null || isObject(fieldValue[0]))
  ) {
    return fieldValue
  }

  const { findById, findByIds, findMany, findOne } = require(`../resolvers`)

  if (by === `id`) {
    const [resolve, key] = Array.isArray(fieldValue)
      ? [findByIds, `ids`]
      : [findById, `id`]
    return resolve({
      source,
      args: { [key]: fieldValue },
      context,
      info,
    })
  }

  const operator = Array.isArray(fieldValue) ? oneOf : equals
  args.filter = by.split(`.`).reduceRight(
    (acc, key, i, { length }) => ({
      [key]: i === length - 1 ? operator(acc) : acc,
    }),
    fieldValue
  )

  const returnType = getNullableType(info.returnType)
  const type = getNamedType(returnType)
  const possibleTypes = isAbstractType(type)
    ? info.schema.getPossibleTypes(type)
    : [type]

  if (returnType instanceof GraphQLList) {
    const results = await Promise.all(
      possibleTypes.map(type =>
        findMany(type.name)({
          source,
          args,
          context,
          info,
        })
      )
    )
    return results.reduce((acc, r) => acc.concat(r))
  } else {
    let result
    for (const type of possibleTypes) {
      result = await findOne(type.name)({
        source,
        args: args.filter,
        context,
        info,
      })
      if (result != null) break
    }
    return result
  }
}

module.exports = link
