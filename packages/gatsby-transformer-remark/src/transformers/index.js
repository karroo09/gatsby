const remark = require(`remark`)

const { getExcerpt, getExcerptAst } = require(`./get-excerpt`)
const { getHeadings } = require(`./get-headings`)
const { getHtml, getHtmlAst } = require(`./get-html`)
const { getMarkdownAst } = require(`./get-markdown-ast`)
const { getTableOfContents } = require(`./get-table-of-contents`)
const { getTimeToRead } = require(`./get-time-to-read`)
const { getWordCount } = require(`./get-word-count`)
const { setupCacheKeyGenerator } = require(`./utils`)

const getProcessor = pluginOptions => {
  const {
    blocks = [],
    commonmark = true,
    footnotes = true,
    gfm = true,
    pedantic = true,
    plugins = [],
  } = pluginOptions

  const processor = remark().data(`settings`, {
    blocks,
    commonmark,
    footnotes,
    gfm,
    pedantic,
  })

  plugins.forEach(plugin => {
    const requiredPlugin = require(plugin.resolve)

    if (typeof requiredPlugin.setParserPlugins === `function`) {
      const parserPlugins = requiredPlugin.setParserPlugins(
        plugin.pluginOptions
      )
      parserPlugins.forEach(parserPlugin => {
        if (Array.isArray(parserPlugin)) {
          const [parser, parserOptions] = parserPlugin
          processor.use(parser, parserOptions)
        } else {
          processor.use(parserPlugin)
        }
      })
    }
  })

  return processor
}

const getTransformers = ({
  basePath,
  cache,
  getCache,
  pluginOptions,
  reporter,
}) => {
  const processor = getProcessor(pluginOptions)

  const generateCacheKey = setupCacheKeyGenerator({ pluginOptions, basePath })

  return {
    getExcerpt: getExcerpt({
      basePath,
      cache,
      getCacheKey: generateCacheKey(`markdown-excerpt`),
      pluginOptions,
      processor,
      reporter,
    }),
    getExcerptAst: getExcerptAst({
      basePath,
      cache,
      getCacheKey: generateCacheKey(`markdown-excerpt-ast`),
      pluginOptions,
      processor,
      reporter,
    }),
    getHeadings: getHeadings({
      basePath,
      cache,
      getCacheKey: generateCacheKey(`markdown-headings`),
      pluginOptions,
      processor,
      reporter,
    }),
    getHtml: getHtml({
      basePath,
      cache,
      getCacheKey: generateCacheKey(`markdown-html`),
      pluginOptions,
      processor,
      reporter,
    }),
    getHtmlAst: getHtmlAst({
      basePath,
      cache,
      getCacheKey: generateCacheKey(`markdown-html-ast`),
      pluginOptions,
      processor,
      reporter,
    }),
    getMarkdownAst: getMarkdownAst({
      basePath,
      cache,
      getCache,
      getCacheKey: generateCacheKey(`markdown-ast`),
      pluginOptions,
      processor,
      reporter,
    }),
    getTableOfContents: getTableOfContents({
      basePath,
      cache,
      getCacheKey: generateCacheKey(`markdown-toc`),
      pluginOptions,
      processor,
      reporter,
    }),
    getTimeToRead: getTimeToRead({
      basePath,
      cache,
      getCacheKey: generateCacheKey(`markdown-time-to-read`),
      pluginOptions,
      processor,
      reporter,
    }),
    getWordCount: getWordCount({
      basePath,
      cache,
      getCacheKey: generateCacheKey(`markdown-word-count`),
      pluginOptions,
      processor,
      reporter,
    }),
  }
}

module.exports = getTransformers
