const path = require(`path`)
const slash = require(`slash`)

const withBaseDir = dir => p => path.posix.join(dir, slash(p))

module.exports = withBaseDir
