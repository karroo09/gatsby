const lokiRunQuery = require(`./loki/nodes-query`)
const siftRunQuery = require(`./js/nodes-query`)
const lazyFields = require(`../schema/lazy-fields`)

const backend = process.env.GATSBY_DB_NODES || `js`

const chooseQueryEngine = args => {
  const { queryArgs, gqlType } = args
  const { filter } = queryArgs
  if (backend === `loki` && !lazyFields.contains(filter, gqlType)) {
    return lokiRunQuery
  } else {
    return siftRunQuery
  }
}

const run = args => {
  const queryFunction = chooseQueryEngine(args)
  return queryFunction(args)
}

module.exports.run = run
