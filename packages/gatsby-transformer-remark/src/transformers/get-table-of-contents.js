const toToc = require(`mdast-util-toc`)
const toHast = require(`mdast-util-to-hast`)
const hastToHtml = require(`hast-util-to-html`)
const { get } = require(`lodash`)

const defaults = {
  heading: null,
  maxDepth: 6,
}

const createUrl = (basePath, slugField, url) =>
  [basePath, slugField, url].join(`/`).replace(/\/\//g, `/`)

const getTableOfContents = ({
  basePath,
  cache,
  getCacheKey,
  pathPrefix,
  pluginOptions,
  processor,
  reporter,
}) => async (source, args, context) => {
  const options = {
    ...(pluginOptions.tableOfContents || defaults),
    ...args,
  }

  const cacheKey = getCacheKey(source, options)
  const cachedToc = await cache.get(cacheKey)

  if (cachedToc) {
    return cachedToc
  }

  const slugField = get(source, options.pathToSlugField)
  if (slugField === undefined) {
    reporter.warn(
      `Skipping TableOfContents. Field \`${
        options.pathToSlugField
      }\` missing from markdown node.`
    )
    cache.set(cacheKey, ``)
    return ``
  }

  const ast = await context.transformerRemark.getMarkdownAst(source)
  const tocAst = toToc(ast, options)

  let toc = ``
  if (tocAst.map) {
    const addSlugToUrl = function(node) {
      if (node.url) {
        node.url = createUrl(basePath, slugField, node.url)
      }

      if (node.children) {
        node.children = node.children.map(node => addSlugToUrl(node))
      }

      return node
    }
    tocAst.map = addSlugToUrl(tocAst.map)

    toc = hastToHtml(toHast(tocAst.map))
  }

  cache.set(cacheKey, toc)
  return toc
}

module.exports = {
  getTableOfContents,
}
