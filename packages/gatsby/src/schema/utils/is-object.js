// @see https://github.com/reduxjs/redux/blob/master/src/utils/isPlainObject.js
const isObject = obj => {
  if (typeof obj !== `object` || obj === null) return false

  let proto = obj
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto)
  }

  return Object.getPrototypeOf(obj) === proto
}

module.exports = isObject
