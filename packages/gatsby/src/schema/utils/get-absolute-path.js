const getBaseDir = require(`./get-base-dir`)
const withBaseDir = require(`./with-base-dir`)

const getAbsolutePath = (node, relativePath) => {
  const dir = getBaseDir(node)
  const withDir = withBaseDir(dir)
  return dir
    ? Array.isArray(relativePath)
      ? relativePath.map(withDir)
      : withDir(relativePath)
    : null
}

module.exports = getAbsolutePath
