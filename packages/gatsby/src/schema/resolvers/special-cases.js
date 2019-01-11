const {
  getBaseDir,
  getComponentDir,
  getParentNode,
  withBaseDir,
} = require(`../utils`)

const convert = (relativePath, baseDir) => {
  const withDir = withBaseDir(baseDir)
  switch (typeof relativePath) {
    case `string`:
      return withDir(relativePath)
    case `object`:
      if (Array.isArray(relativePath)) {
        return relativePath.map(withDir)
      } else if (relativePath) {
        return Object.entries(relativePath).reduce((acc, [operator, p]) => {
          acc[operator] = convert(p, baseDir)
          return acc
        }, {})
      }
  }
  return null
}

const toAbsolutePath = (relativePath, source, isRootQuery) => {
  const baseDir = isRootQuery
    ? getComponentDir(source)
    : getBaseDir(getParentNode(source))
  return baseDir && convert(relativePath, baseDir)
}

const withSpecialCases = ({ type, source, args, context, info }) => {
  switch (type) {
    case `File`:
      if (args.filter && source) {
        // TODO: slash(args.filter.absolutePath)
        // TODO: slash(args.filter.relativePath)
        // TODO: slash(args.filter.absoluteDirectory)
        // TODO: slash(args.filter.relativeDirectory)
        if (args.filter.relativePath) {
          const absolutePath = toAbsolutePath(
            args.filter.relativePath,
            source,
            // FIXME: For now, keep v2 behavior
            false
            // info.parentType && info.parentType.name === `Query`
          )
          if (absolutePath) {
            delete args.filter.relativePath
            args.filter.absolutePath = absolutePath
          }
        } else if (args.filter.relativeDirectory) {
          const absoluteDirectory = toAbsolutePath(
            args.filter.relativeDirectory,
            source,
            // FIXME: For now, keep v2 behavior
            false
            // info.parentType && info.parentType.name === `Query`
          )
          if (absoluteDirectory) {
            delete args.filter.relativeDirectory
            args.filter.absoluteDirectory = absoluteDirectory
          }
        }
      }
      break
    default:
    //noop
  }
  return args
}

module.exports = withSpecialCases
