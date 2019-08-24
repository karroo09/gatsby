// const visit = require(`unist-util-visit`)

const AstGenerationPromises = new Map()

// const withPathPrefix = (url, pathPrefix) =>
//   (pathPrefix + url).replace(/\/\//, `/`)

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
          compiler: {
            parseString: processor.parse.bind(processor),
            generateHTML: source =>
              context.transformerRemark.getHtml(source, {}, context),
          },
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

  // This should be a remark plugin!
  // if (basePath) {
  //   // Ensure relative links include `pathPrefix`
  //   visit(markdownAst, [`link`, `definition`], node => {
  //     if (node.url && node.url.startsWith(`/`) && !node.url.startsWith(`//`)) {
  //       node.url = withPathPrefix(node.url, basePath)
  //     }
  //   })
  // }

  for (const plugin of pluginOptions.plugins) {
    const requiredPlugin = require(plugin.resolve)
    if (typeof requiredPlugin === `function`) {
      await requiredPlugin(
        {
          basePath,
          cache: getCache(plugin.name),
          compiler: {
            parseString: processor.parse.bind(processor),
            generateHTML: source =>
              context.transformerRemark.getHtml(source, {}, context),
          },
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
