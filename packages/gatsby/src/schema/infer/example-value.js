// TODO:
// clearTypeExampleValues/clearConflicts ???
// ___NODE fields
// caching
// ignoreFields
// FIXME: Currently, mix of `date` and `string` is not handled:
// should this be handled explicitly with typeDef?

const { reportConflict } = require(`./type-conflict-reporter`)
const {
  createSelector,
  getUniqueValues,
  getUniqueValuesBy,
  is32bitInteger,
  isDate,
  isDefined,
} = require(`../utils`)

const findFloat = entries => {
  let result
  const find = numbers =>
    numbers.some(value => {
      const number = typeof value === `object` ? value.value : value
      return Array.isArray(number)
        ? find(number)
        : !is32bitInteger(number) && (result = number)
    })
  find(entries)
  return result
}

const getType = value => {
  switch (typeof value) {
    case `number`:
      return `number`
    case `string`:
      return isDate(value) ? `date` : `string`
    case `boolean`:
      return `boolean`
    case `object`:
      if (value === null) return null
      if (value instanceof Date) return `date`
      if (Array.isArray(value)) {
        const uniqueValues = getUniqueValues(
          value.map(getType).filter(isDefined)
        )
        return uniqueValues.length ? `[${uniqueValues.join(`,`)}]` : null
      }
      if (!Object.keys(value)) return null
      return `object`
    default:
      return null
  }
}

const getExampleObject = (nodes, prefix, ignoreFields = []) => {
  const allKeys = nodes.reduce(
    (acc, node) =>
      Object.keys(node).forEach(
        key => !acc.has(key) && !ignoreFields.includes(key) && acc.add(key)
      ) || acc,
    new Set()
  )

  const exampleValue = Array.from(allKeys).reduce((acc, key) => {
    const entries = nodes
      .map(node => {
        const value = node[key]
        const type = getType(value)
        return type && { value, type, parent: node }
      })
      .filter(Boolean)

    const selector = createSelector(prefix, key)

    const types = getUniqueValuesBy(entries, entry => entry.type)
    if (!types.length) return acc
    if (types.length > 1 || types[0].type.includes(`,`)) {
      reportConflict(selector, types)
      return acc
    }

    // TODO: This whole thing could be prettier!
    let { value /*, type */ } = entries[0]
    let arrayWrappers = 0
    let exampleFieldValue
    while (Array.isArray(value)) {
      value = value[0]
      arrayWrappers++
    }
    if (typeof value === `object`) {
      const objects = entries.reduce((acc, entry) => {
        let { value } = entry
        if (arrayWrappers) {
          let arrays = arrayWrappers - 1
          while (arrays--) value = value[0]
        }
        // TODO: return Object.keys(value).length ? acc.concat(value) : acc
        // and then below only check objects.length
        return acc.concat(value)
      }, [])
      // if (!objects.length) return acc
      // exampleFieldValue = getExampleObject(objects);
      const exampleObject = getExampleObject(objects, selector)
      if (!Object.keys(exampleObject).length) return acc
      exampleFieldValue = exampleObject
    } else {
      // FIXME: Why not simply treat every number as float (instead of looping through all values again)?
      exampleFieldValue =
        (typeof value === `number` && findFloat(entries)) || value
      // exampleFieldValue = value === `number` ? 0.1 : value
    }
    while (arrayWrappers--) {
      exampleFieldValue = [exampleFieldValue]
    }
    acc[key] = exampleFieldValue

    return acc
  }, {})

  return exampleValue
}

// TODO: cache hit when?
// const cache = new Map()
// const clearExampleValueCache = () => cache.clear()

const getExampleValue = ({ nodes, typeName, ignoreFields }) => {
  // if (cache.has(typeName)) {
  //   return cache.get(typeName)
  // }
  const exampleValue = getExampleObject(nodes, typeName, ignoreFields)
  // cache.set(typeName, exampleValue)
  return exampleValue
}

module.exports = {
  getExampleValue,
  // clearExampleValueCache,
}
