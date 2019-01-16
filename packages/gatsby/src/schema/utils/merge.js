const mergeObjects = (obj1, obj2) =>
  Object.entries(obj2).reduce((acc, [key, value]) => {
    if (typeof value === `object` && value && acc[key]) {
      acc[key] = mergeObjects(acc[key], value)
    } else {
      acc[key] = value
    }
    return acc
  }, obj1)

const merge = (...objects) => {
  const [first, ...rest] = objects.filter(Boolean)
  return rest.reduce((acc, obj) => mergeObjects(acc, obj), { ...first })
}

module.exports = merge
