// TODO: Check out `picomatch`/`nanomatch`
const { makeRe } = require(`micromatch`)

const { isObject, stringToRegExp } = require(`../../utils`)

const prepareQueryArgs = filterFields =>
  Object.entries(filterFields).reduce((acc, [key, value]) => {
    if (isObject(value)) {
      acc[key === `elemMatch` ? `$elemMatch` : key] = prepareQueryArgs(value)
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

const dropQueryOperators = filter =>
  Object.entries(filter).reduce((acc, [key, value]) => {
    const [k, v] = Object.entries(value)[0]
    if (isObject(value) && isObject(v)) {
      // If `elemMatch` has sibling fields, they are exactly the same as the
      // fields on `elemMatch` (see `input/filter.js`), so we can just
      // continue one level down.
      acc[key] =
        k === `elemMatch` ? dropQueryOperators(v) : dropQueryOperators(value)
    } else {
      acc[key] = true
    }
    return acc
  }, {})

module.exports = {
  dropQueryOperators,
  prepareQueryArgs,
}
