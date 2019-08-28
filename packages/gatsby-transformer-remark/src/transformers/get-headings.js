const { selectAll } = require(`unist-util-select`)
const toString = require(`mdast-util-to-string`)

// TODO: This sucks
const headingLevels = [...Array(6).keys()].reduce((acc, i) => {
  acc[`h${i}`] = i
  return acc
}, {})

const getHeadingsLevel = (headings, level) =>
  level
    ? headings.filter(heading => heading.depth === headingLevels[level])
    : headings

const getHeadings = ({
  basePath,
  cache,
  getCacheKey,
  pathPrefix,
  pluginOptions,
  processor,
  reporter,
}) => async (source, args, context) => {
  const cacheKey = getCacheKey(source)
  const cachedHeadings = await cache.get(cacheKey)

  if (cachedHeadings) {
    return getHeadingsLevel(cachedHeadings, args.depth)
  }

  const ast = await context.transformerRemark.getMarkdownAst(
    source,
    args,
    context
  )

  // TODO: visit instead of selectAll
  const headings = selectAll(`heading`, ast).map(heading => {
    return {
      value: toString(heading),
      depth: heading.depth,
    }
  })

  cache.set(cacheKey, headings)

  return getHeadingsLevel(headings, args.depth)
}

module.exports = {
  getHeadings,
}
