// TODO: Ok, this is getting out of hand

const isObject = value =>
  value &&
  typeof value === `object` &&
  !Array.isArray(value) &&
  !(value instanceof Date) &&
  !(value instanceof String) &&
  !(value instanceof RegExp)

module.exports = isObject
