const stripPosition = require(`unist-util-remove-position`)
const reparseRaw = require(`hast-util-raw`)
const visit = require(`unist-util-visit`)
const toHtml = require(`hast-util-to-html`)
const { clone, truncate } = require(`lodash`)

const {
  getConcatenatedValue,
  cloneTreeUntil,
  findLastTextNode,
} = require(`./hast-processing`)

const SpaceMarkdownNodeTypesSet = new Set([
  `paragraph`,
  `heading`,
  `tableCell`,
  `break`,
])

const getExcerpt = ({
  basePath,
  cache,
  getCacheKey,
  pathPrefix,
  pluginOptions,
  processor,
  reporter,
}) => async (source, args, context) => {
  switch (args.format) {
    case `HTML`:
      return getExcerptHtml(source, args, context)
    case `MARKDOWN`:
      return getExcerptMarkdown(source, args, context)
    default:
      return getExcerptPlain(source, args, context)
  }
}

const getExcerptAst = ({
  basePath,
  cache,
  getCacheKey,
  pathPrefix,
  pluginOptions,
  processor,
  reporter,
}) => async (source, args, context) => {
  const fullAst = await context.transformerRemark.getHtmlAst(
    source,
    args,
    context
  )

  let excerptAst = fullAst
  if (args.excerptSeparator && source.excerpt !== ``) {
    excerptAst = cloneTreeUntil(
      fullAst,
      ({ nextNode }) =>
        nextNode.type === `raw` && nextNode.value === args.excerptSeparator
    )
  } else {
    excerptAst = cloneTreeUntil(fullAst, ({ root }) => {
      const totalExcerptSoFar = getConcatenatedValue(root)
      return totalExcerptSoFar && totalExcerptSoFar.length > args.pruneLength
    })

    const unprunedExcerpt = getConcatenatedValue(excerptAst)
    if (
      !unprunedExcerpt ||
      (args.pruneLength && unprunedExcerpt.length < args.pruneLength)
    ) {
      return excerptAst
    }

    const lastTextNode = findLastTextNode(excerptAst)
    if (!args.truncate) {
      const amountToPruneLastNode =
        args.pruneLength - (unprunedExcerpt.length - lastTextNode.value.length)

      lastTextNode.value = truncate(lastTextNode.value, {
        length: amountToPruneLastNode,
        omission: `…`,
        separator: ` `,
      })
    } else {
      lastTextNode.value = truncate(lastTextNode.value, {
        length: args.pruneLength,
        omission: `…`,
      })
    }
  }

  // return excerptAst

  //TODO: What is this doint exactly? And why don't we cache it?
  const strippedAst = stripPosition(clone(excerptAst), true)
  return reparseRaw(strippedAst)
}

const getExcerptHtml = async (source, args, context) => {
  const excerptAst = await context.transformerRemark.getExcerptAst(
    source,
    args,
    context
  )

  return toHtml(excerptAst, { allowDangerousHTML: true })
}

const getExcerptMarkdown = async (source, args, context) => {
  if (args.excerptSeparator) {
    return source.excerpt
  }

  // TODO: truncate respecting markdown Ast
  const excerptText = source.rawMarkdownBody

  if (!args.truncate) {
    return truncate(excerptText, {
      length: args.pruneLength,
      omission: `…`,
      separator: ` `,
    })
  }

  return truncate(excerptText, {
    length: args.pruneLength,
    omission: `…`,
  })
}

const getExcerptPlain = async (source, args, context) => {
  const ast = await context.transformerRemark.getMarkdownAst(source)

  const excerptNodes = []
  let isBeforeSeparator = true

  visit(
    ast,
    node => isBeforeSeparator,
    node => {
      if (args.excerptSeparator && node.value === args.excerptSeparator) {
        isBeforeSeparator = false
      } else if (node.type === `text` || node.type === `inlineCode`) {
        excerptNodes.push(node.value)
      } else if (node.type === `image`) {
        excerptNodes.push(node.alt)
      } else if (SpaceMarkdownNodeTypesSet.has(node.type)) {
        // Add a space when encountering one of these node types.
        excerptNodes.push(` `)
      }
    }
  )

  const excerptText = excerptNodes.join(``).trim()

  if (args.excerptSeparator && !isBeforeSeparator) {
    return excerptText
  }

  if (!args.truncate) {
    return truncate(excerptText, {
      length: args.pruneLength,
      omission: `…`,
      separator: ` `,
    })
  }

  return truncate(excerptText, {
    length: args.pruneLength,
    omission: `…`,
  })
}

module.exports = {
  getExcerpt,
  getExcerptAst,
}
