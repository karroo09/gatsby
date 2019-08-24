const unified = require(`unified`)
const strip = require(`strip-markdown`)
const stringify = require(`remark-stringify`)
const { words } = require(`lodash`)

const AVERAGE_WORDS_PER_MINUTE = 265

const getTimeToRead = ({
  basePath,
  cache,
  getCacheKey,
  pathPrefix,
  pluginOptions,
  processor,
  reporter,
}) => async (source, args, context) => {
  const cacheKey = getCacheKey(source)
  const cachedTimeToRead = await cache.get(cacheKey)

  if (cachedTimeToRead) {
    return cachedTimeToRead
  }

  // TODO: Should we use context.transformerRemark.getWordCount()
  const ast = await context.transformerRemark.getMarkdownAst(
    source,
    args,
    context
  )

  const text = await unified()
    .use(stringify)
    .stringify(
      unified()
        .use(strip)
        .runSync(ast)
    )

  return Math.round(words(text).length / AVERAGE_WORDS_PER_MINUTE) || 1
}

module.exports = {
  getTimeToRead,
}
