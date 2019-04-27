const sift = require(`sift`)
const _ = require(`lodash`)
const { makeRe } = require(`micromatch`)
const prepareRegex = require(`../../utils/prepare-regex`)

const query = (nodes, args, firstOnly) => {
  const filters = args.filter ? getFilters(prepareQueryArgs(args.filter)) : []

  if (firstOnly) {
    return filters.length ? find(nodes, filters) : nodes[0]
  }

  const filtered = filters.length ? filter(nodes, filters) : nodes
  return filtered.length && args.sort ? sort(filtered, args.sort) : filtered
}

const find = (nodes, filters) => {
  const index = sift.indexOf({ $and: filters }, nodes)
  return index !== -1 ? nodes[index] : null
}

const filter = (nodes, filters) => sift({ $and: filters }, nodes)

const sort = (nodes, { fields, order }) => {
  const sortFields = fields.map(field => v => _.get(v, field))
  const sortOrder = order.map(order => order.toLowerCase())
  return _.orderBy(nodes, sortFields, sortOrder)
}

const getFilters = filters =>
  Object.keys(filters).reduce(
    (acc, key) => acc.push({ [key]: filters[key] }) && acc,
    []
  )

const prepareQueryArgs = filterFields =>
  Object.keys(filterFields).reduce((acc, key) => {
    const value = filterFields[key]
    if (_.isPlainObject(value)) {
      acc[key === `elemMatch` ? `$elemMatch` : key] = prepareQueryArgs(value)
    } else {
      switch (key) {
        case `regex`:
          acc[`$regex`] = prepareRegex(value)
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

module.exports = { query }
