const [DateFormatDirective, dateFormatVisitor] = require(`./dateformat`)
const [LinkNodeDirective, linkNodeVisitor] = require(`./link-node`)

const directives = [DateFormatDirective, LinkNodeDirective]

const visitors = {
  ...dateFormatVisitor,
  ...linkNodeVisitor,
}

module.exports = {
  directives,
  visitors,
}
