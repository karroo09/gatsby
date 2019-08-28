const AstGenerationPromises = new Map()

const getAst = async ({
  basePath,
  cache,
  context,
  getCache,
  pathPrefix,
  pluginOptions,
  processor,
  reporter,
  source,
}) => {
  for (const plugin of pluginOptions.plugins) {
    const requiredPlugin = require(plugin.resolve)
    if (typeof requiredPlugin.mutateSource === `function`) {
      await requiredPlugin.mutateSource(
        {
          basePath,
          cache: getCache(plugin.name),
          files: context.nodeModel.getAllNodes({ type: `File` }),
          getCache,
          getNode: id => context.nodeModel.getNodeById({ id }),
          markdownNode: source,
          pathPrefix,
          reporter,
        },
        plugin.pluginOptions
      )
    }
  }

  const markdownAst = processor.parse(source.internal.content)

  for (const plugin of pluginOptions.plugins) {
    const requiredPlugin = require(plugin.resolve)
    if (typeof requiredPlugin === `function`) {
      await requiredPlugin(
        {
          basePath,
          cache: getCache(plugin.name),
          // NOTE: This is only used by the markdownCaption option in gatsby-remark-images, and nobody knows about it
          // What's the reason for the plugin to not simply import remark itself?
          compiler: {
            parseString: processor.parse.bind(processor),
            generateHTML: source =>
              context.transformerRemark.getHtml(source, {}, context),
          },
          createContentDigest: require(`gatsby-core-utils`).createContentDigest, // Needed by `gatsby-remark-images-contentful`
          files: context.nodeModel.getAllNodes({ type: `File` }),
          getCache,
          getNode: id => context.nodeModel.getNodeById({ id }),
          markdownAST: markdownAst,
          markdownNode: source,
          pathPrefix,
          reporter,
        },
        plugin.pluginOptions
      )
    }
  }

  return markdownAst
}

const getMarkdownAst = ({
  basePath,
  cache,
  getCache,
  getCacheKey,
  pathPrefix,
  pluginOptions,
  processor,
  reporter,
}) => async (source, args, context) => {
  const cacheKey = getCacheKey(source)
  const cachedAst = await cache.get(cacheKey)

  if (cachedAst) {
    return cachedAst
  }

  if (AstGenerationPromises.has(cacheKey)) {
    return AstGenerationPromises.get(cacheKey)
  }

  const AstGenerationPromise = getAst({
    basePath,
    cache,
    context,
    getCache,
    pathPrefix,
    pluginOptions,
    processor,
    reporter,
    source,
  })
    .then(markdownAst => {
      cache.set(cacheKey, markdownAst)
      AstGenerationPromises.delete(cacheKey)
      return markdownAst
    })
    .catch(err => {
      AstGenerationPromises.delete(cacheKey)
      // TODO: What to return
      return err
    })

  AstGenerationPromises.set(cacheKey, AstGenerationPromise)

  return AstGenerationPromise
}

module.exports = {
  getMarkdownAst,
}
