const toHast = require(`mdast-util-to-hast`)
const toHtml = require(`hast-util-to-html`)
const stripPosition = require(`unist-util-remove-position`)
const reparseRaw = require(`hast-util-raw`)
const { clone } = require(`lodash`)

const codeHandler = require(`./code-handler`)

const getHtmlAst = ({
  basePath,
  cache,
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

  const ast = await context.transformerRemark.getMarkdownAst(
    source,
    args,
    context
  )

  const htmlAst = toHast(ast, {
    allowDangerousHTML: true,
    handlers: { code: codeHandler },
  })

  cache.set(cacheKey, htmlAst)
  // return htmlAst

  //TODO: What is this doint exactly? And why don't we cache it?
  const strippedAst = stripPosition(clone(htmlAst), true)
  return reparseRaw(strippedAst)
}

const getHtml = ({
  basePath,
  cache,
  getCacheKey,
  pluginOptions,
  processor,
  reporter,
}) => async (source, args, context) => {
  const cacheKey = getCacheKey(source)
  const cachedHtml = await cache.get(cacheKey)

  if (cachedHtml) {
    return cachedHtml
  }

  const ast = await context.transformerRemark.getHtmlAst(source, args, context)

  const html = toHtml(ast, {
    allowDangerousHTML: true,
  })

  cache.set(cacheKey, html)
  return html
}

module.exports = {
  getHtml,
  getHtmlAst,
}
