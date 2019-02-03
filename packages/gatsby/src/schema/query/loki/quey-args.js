const {
  GraphQLBoolean,
  GraphQLList,
  getNamedType,
  getNullableType,
} = require(`graphql`)
const { makeRe } = require(`micromatch`)
const { default: sift } = require(`sift`)

const { isObject, stringToRegExp } = require(`../../utils`)
const {
  prepareQueryArgs: prepareQueryArgsForSift,
} = require(`../sift/query-args`)

const queryWithSift = (nodes, query) => {
  if (nodes) {
    const siftQuery = {
      $elemMatch: prepareQueryArgsForSift(query),
    }
    return sift(siftQuery, nodes)
  } else {
    return null
  }
}

const convert = (filter, type) => {
  const queryFilter = Object.entries(filter).reduce((acc, [key, value]) => {
    if (isObject(value)) {
      if (key === `elemMatch`) {
        acc[`$where`] = nodes => {
          const result = queryWithSift(nodes, value)
          return result && result.length > 0
        }
      } else {
        const field = getNamedType(type).getFields()[key]
        acc[key] = convert(value, field.type)
      }
    } else {
      const nullableType = getNullableType(type)
      if (key === `regex`) {
        const re = stringToRegExp(value)
        acc[`$where`] = obj => obj != null && re.test(obj)
      } else if (key === `glob`) {
        acc[`$regex`] = makeRe(value)
      } else if (key === `eq` && nullableType instanceof GraphQLList) {
        acc[`$contains`] = value
      } else if (key === `ne` && nullableType instanceof GraphQLList) {
        acc[`$containsNone`] = value
      } else if (key === `in` && nullableType instanceof GraphQLList) {
        acc[`$containsAny`] = value
      } else if (key === `nin` && nullableType instanceof GraphQLList) {
        acc[`$containsNone`] = value
      } else if (key === `ne` && value === null) {
        acc[`$ne`] = undefined
      } else if (key === `nin` && nullableType === GraphQLBoolean) {
        // FIXME: Why?
        acc[`$nin`] = value.concat([false])
      } else {
        acc[`$${key}`] = value
      }
    }
    return acc
  }, {})
  return queryFilter
}

const toDottedFields = (filter, acc = {}, path = []) => {
  Object.entries(filter).forEach(([key, value]) => {
    if (isObject(value) && isObject(Object.values(value)[0])) {
      toDottedFields(value, acc, path.concat(key))
    } else {
      acc[path.concat(key).join(`.`)] = value
    }
  })
  return acc
}

const isNeTrue = (obj, path) => {
  if (path.length) {
    const [first, ...rest] = path
    return obj == null || obj[first] == null || isNeTrue(obj[first], rest)
  } else {
    return obj !== true
  }
}

// FIXME: Why only $ne and not $nin?
const fixNeTrue = filter =>
  Object.entries(filter).reduce((acc, [key, value]) => {
    if (value[`$ne`] === true) {
      const [first, ...path] = key.split(`.`)
      acc[first] = { [`$where`]: obj => isNeTrue(obj, path) }
    } else {
      acc[key] = value
    }
    return acc
  }, {})

const prepareQueryArgs = (filter, type) =>
  fixNeTrue(toDottedFields(convert(filter, type)))

module.exports = { prepareQueryArgs }
