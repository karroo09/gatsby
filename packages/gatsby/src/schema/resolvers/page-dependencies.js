const createPageDependency = require(`../../redux/actions/add-page-dependency`)
const { isDefined } = require(`../utils`)

const withPageDependencies = resolve => type => async rp => {
  const result = await resolve(type)(rp)
  const { path } = rp.context || {}
  if (!path || result == null) return result

  if (Array.isArray(result)) {
    const isConnection =
      rp.info.parentType && rp.info.parentType.name === `Query`
    if (isConnection) {
      createPageDependency({ path, connection: type })
    } else {
      result
        .filter(isDefined)
        .map(node => createPageDependency({ path, nodeId: node.id }))
    }
  } else {
    createPageDependency({ path, nodeId: result.id })
  }

  return result
}

module.exports = withPageDependencies
