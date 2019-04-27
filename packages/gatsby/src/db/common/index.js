const { store } = require(`../../redux`)

const loadNodeContent = node => {
  if (typeof node.internal.content === `string`) {
    return Promise.resolve(node.internal.content)
  } else {
    return new Promise(resolve => {
      // Load plugin's loader function
      const plugin = store
        .getState()
        .flattenedPlugins.find(plug => plug.name === node.internal.owner)
      const { loadNodeContent } = require(plugin.resolve)
      if (!loadNodeContent) {
        throw new Error(
          `Could not find function loadNodeContent for plugin ${plugin.name}`
        )
      }

      return loadNodeContent(node).then(content => {
        // TODO: update node's content field here.
        resolve(content)
      })
    })
  }
}

const hasNodeChanged = (id, digest) => {
  const node = store.getState().nodes.db.getNode(id)
  if (!node) {
    return true
  } else {
    return node.internal.contentDigest !== digest
  }
}

const getNodeAndSavePathDependency = (id, path) => {
  const createPageDependency = require(`../../redux/actions/add-page-dependency`)
  const node = store.getState().nodes.db.getNode(id)
  if (node && path) {
    createPageDependency({ path, nodeId: id })
  }
  return node
}

module.exports = {
  loadNodeContent,
  hasNodeChanged,
  getNodeAndSavePathDependency,
}
