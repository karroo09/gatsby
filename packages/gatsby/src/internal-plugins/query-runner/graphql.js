const { graphql } = require(`graphql`)

const { store } = require(`../../redux`)
const { withContext } = require(`../../schema/context`)

module.exports = (query, context) => {
  const { schema } = store.getState()
  return graphql(schema, query, context, withContext(context), context)
}
