const resolvers = require(`./resolvers`)

const withContext = context => ({ ...context, resolvers })

module.exports = { withContext }
