// FIXME: Use hasOwnProperty
// FIXME: Dont't keep reducing when encountering non-existing prop
//        (i.e. use [].every())
const getValueAtSelector = (obj, selector) => {
  const selectors = Array.isArray(selector) ? selector : selector.split(`.`)
  return selectors.reduce((acc, key) => {
    if (acc && typeof acc === `object`) {
      if (Array.isArray(acc)) {
        return acc.map(a => a[key]).filter(a => a !== undefined)
      }
      return acc[key]
    }
    return undefined
  }, obj)
}

module.exports = getValueAtSelector
