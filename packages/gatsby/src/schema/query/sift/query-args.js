// TODO: Check out `picomatch`/`nanomatch`
const { makeRe } = require(`micromatch`)

const { isObject, stringToRegExp } = require(`../../utils`)

const prepareQueryArgs = filterFields =>
  Object.entries(filterFields).reduce((acc, [key, value]) => {
    if (isObject(value)) {
      if (key === `elemMatch`) {
        acc[`$elemMatch`] = prepareQueryArgs(value)
      }
      acc[key] = prepareQueryArgs(value)
    } else {
      switch (key) {
        case `regex`:
          acc[`$regex`] = stringToRegExp(value)
          break
        case `glob`:
          acc[`$regex`] = makeRe(value)
          break
        default:
          acc[`$${key}`] = value
      }
    }
    return acc
  }, {})

const dropQueryOperators = filterFields =>
  Object.entries(filterFields).reduce((acc, [key, value]) => {
    if (key === `elemMatch`) {
      const [k, v] = Object.entries(value)[0]
      acc[k] = dropQueryOperators(v)
    } else if (isObject(value) && isObject(Object.values(value)[0])) {
      acc[key] = dropQueryOperators(value)
    } else {
      acc[key] = true
    }
    return acc
  }, {})

module.exports = {
  dropQueryOperators,
  prepareQueryArgs,
}
