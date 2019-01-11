const path = require(`path`)
const slash = require(`slash`)

const withBaseDir = dir => p => slash(path.join(dir, p))

module.exports = withBaseDir
