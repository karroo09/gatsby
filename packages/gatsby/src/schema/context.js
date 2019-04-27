const { LocalNodeModel } = require(`./node-model`)

const withResolverContext = (context, schema) => {
  const { store } = require(`../redux`)
  const { db: nodeStore } = store.getState().nodes
  const createPageDependency = require(`../redux/actions/add-page-dependency`)
  const { findRootNodeAncestor } = require(`../db/node-tracking`)

  return {
    ...context,
    nodeModel: new LocalNodeModel({
      nodeStore,
      schema,
      findRootNodeAncestor,
      createPageDependency,
      path: context.path,
    }),
  }
}

module.exports = withResolverContext
