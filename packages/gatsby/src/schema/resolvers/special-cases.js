const slash = require(`slash`)

const {
  getBaseDir,
  getComponentDir,
  getParentNode,
  withBaseDir,
} = require(`../utils`)

const convert = (path, transform = slash) => {
  switch (typeof path) {
    case `string`:
      return transform(path)
    case `object`:
      if (Array.isArray(path)) {
        return path.map(transform)
      } else if (path) {
        return Object.entries(path).reduce((acc, [operator, p]) => {
          acc[operator] = convert(p, transform)
          return acc
        }, {})
      }
  }
  return null
}

const getDir = (source, isRootQuery) =>
  isRootQuery ? getComponentDir(source) : getBaseDir(getParentNode(source))

const withSpecialCases = ({ type, source, args, context, info }) => {
  switch (type) {
    case `File`:
      if (args.filter) {
        if (args.filter.absolutePath) {
          args.filter.absolutePath = convert(args.filter.absolutePath)
        }
        if (args.filter.absoluteDirectory) {
          args.filter.absoluteDirectory = convert(args.filter.absoluteDirectory)
        }
        if (args.filter.relativePath) {
          const { relativePath } = args.filter
          // FIXME: For now, keep v2 behavior, @see #10993.
          const baseDir = source && getDir(source, false)
          // const baseDir =
          //   source &&
          //   getDir(source, info.parentType && info.parentType.name === `Query`)
          if (baseDir) {
            args.filter.absolutePath = convert(
              relativePath,
              withBaseDir(baseDir)
            )
            delete args.filter.relativePath
          } else {
            args.filter.relativePath = convert(relativePath)
          }
        } else if (args.filter.relativeDirectory) {
          const { relativeDirectory } = args.filter
          // FIXME: For now, keep v2 behavior, @see #10993.
          const baseDir = source && getDir(source, false)
          // const baseDir =
          //   source &&
          //   getDir(source, info.parentType && info.parentType.name === `Query`)
          if (baseDir) {
            args.filter.absoluteDirectory = convert(
              relativeDirectory,
              withBaseDir(baseDir)
            )
            delete args.filter.relativeDirectory
          } else {
            args.filter.relativeDirectory = convert(relativeDirectory)
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
