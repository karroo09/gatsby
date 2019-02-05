/* @flow */

const express = require(`express`)
const graphqlHTTP = require(`express-graphql`)
const { store } = require(`../redux`)
const bootstrap = require(`../bootstrap`)
const { withContext } = require(`../schema/context`)

module.exports = async (program: any) => {
  let { port, host } = program
  port = typeof port === `string` ? parseInt(port, 10) : port

  // bootstrap to ensure schema is in the store
  await bootstrap(program)

  const schema = store.getState().schema

  const app = express()
  app.use(
    `/`,
    graphqlHTTP(req => {
      return {
        schema,
        // FIXME: Do we want the request on context (default)?
        context: withContext({ req }),
        graphiql: true,
      }
    })
  )

  console.log(`Gatsby data explorer running at`, `http://${host}:${port}`)
  app.listen(port, host)
}
