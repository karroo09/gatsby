const setupCacheKeyGenerator = ({ pluginOptions, basePath }) => {
  const plugins =
    pluginOptions.plugins &&
    pluginOptions.plugins.map(plugin => plugin.name).join(``)
  const pathPrefix = basePath || ``

  const generateCacheKey = (key, options) => node =>
    [
      `transformer-remark`,
      key,
      node.internal.contentDigest,
      plugins,
      pathPrefix,
      JSON.stringify(options),
    ]
      .filter(Boolean)
      .join(`-`)

  return generateCacheKey
}

module.exports = {
  setupCacheKeyGenerator,
}
