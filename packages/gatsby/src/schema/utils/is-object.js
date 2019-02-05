// based on https://github.com/reduxjs/redux/blob/master/src/utils/isPlainObject.js
const isObject = obj => {
  if (typeof obj !== `object` || obj === null) return false

  const objProto = Object.getPrototypeOf(obj)
  if (objProto === null) return true

  let proto = obj
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto)
  }

  return objProto === proto
}

module.exports = isObject
