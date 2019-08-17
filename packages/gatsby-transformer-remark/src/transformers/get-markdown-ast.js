// const visit = require(`unist-util-visit`)

const AstGenerationPromises = new Map()

// const withPathPrefix = (url, pathPrefix) =>
//   (pathPrefix + url).replace(/\/\//, `/`)

const getAst = async ({
  basePath,
  cache,
  context,
  getCache,
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
          markdownNode: source,
          files: context.nodeModel.getAllNodes({ type: `File` }),
          getNode: id => context.nodeModel.getNodeById({ id }),
          pathPrefix: basePath,
          reporter,
          cache: getCache(plugin.name),
          getCache,
          compiler: {
            parseString: processor.parse.bind(processor),
            generateHTML: source =>
              context.transformerRemark.getHtml(source, {}, context),
          },
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
          markdownAST: markdownAst,
          markdownNode: source,
          getNode: id => context.nodeModel.getNodeById({ id }),
          files: context.nodeModel.getAllNodes({ type: `File` }),
          pathPrefix: basePath,
          reporter,
          cache: getCache(plugin.name),
          getCache,
          compiler: {
            parseString: processor.parse.bind(processor),
            generateHTML: source =>
              context.transformerRemark.getHtml(source, {}, context),
          },
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
