const { LocalNodeModel } = require(`./node-model`)
const { defaultFieldResolver } = require(`./resolvers`)
const getCache = require(`../utils/get-cache`)
const reporter = require(`gatsby-cli/lib/reporter`)

const withResolverContext = (context, schema, customContext) => {
  const nodeStore = require(`../db/nodes`)
  const createPageDependency = require(`../redux/actions/add-page-dependency`)

  return {
    ...context,
    ...customContext,
    defaultFieldResolver,
    getCache,
    nodeModel: new LocalNodeModel({
      nodeStore,
      schema,
      createPageDependency,
      path: context.path,
    }),
    reporter,
  }
}

module.exports = withResolverContext
