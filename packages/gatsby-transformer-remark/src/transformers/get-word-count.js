const unified = require(`unified`)
const remarkToRetext = require(`remark-retext`)
const english = require(`retext-english`)
const visit = require(`unist-util-visit`)

const getWordCount = ({
  basePath,
  cache,
  getCacheKey,
  pathPrefix,
  pluginOptions,
  processor,
  reporter,
}) => async (source, args, context) => {
  const cacheKey = getCacheKey(source)
  const cachedWordCount = await cache.get(cacheKey)

  if (cachedWordCount) {
    return cachedWordCount
  }

  const counts = {}

  const count = () => tree => {
    visit(tree, node => {
      counts[node.type] = (counts[node.type] || 0) + 1
    })
  }

  const ast = await context.transformerRemark.getMarkdownAst(
    source,
    args,
    context
  )

  await unified()
    .use(
      remarkToRetext,
      unified()
        .use(english)
        .use(count)
    )
    .run(ast)

  return {
    paragraphs: counts.ParagraphNode,
    sentences: counts.SentenceNode,
    words: counts.WordNode,
  }
}

module.exports = {
  getWordCount,
}
