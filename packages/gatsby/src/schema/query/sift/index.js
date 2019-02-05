const { default: sift, indexOf: siftFirst } = require(`sift`)

const sort = require(`./sort`)
const {
  getQueryOperatorListInput,
  getQueryOperatorInput,
} = require(`./query-operators`)
const { dropQueryOperators, prepareQueryArgs } = require(`./query-args`)

const equals = value => ({ eq: value })

const oneOf = value => ({ in: value })

const filter = (filters, nodes) => sift({ $and: filters }, nodes)

const find = (filters, nodes) => {
  const index = siftFirst({ $and: filters }, nodes)
  return index !== -1 ? nodes[index] : null
}

const getFilters = filters =>
  Object.entries(filters).reduce(
    (acc, [key, value]) => acc.push({ [key]: value }) && acc,
    []
  )

const query = (nodes = [], args, firstResultOnly) => {
  const filters = args.filter ? getFilters(prepareQueryArgs(args.filter)) : []

  if (firstResultOnly) {
    return filters.length ? find(filters, nodes) : nodes[0]
  }

  const filtered = filters.length ? filter(filters, nodes) : nodes
  return args.sort ? filtered.sort(sort(args.sort)) : filtered
}

module.exports = {
  dropQueryOperators,
  equals,
  getQueryOperatorListInput,
  getQueryOperatorInput,
  oneOf,
  query,
}
