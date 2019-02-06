const {
  defaultFieldResolver,
  DirectiveLocation,
  GraphQLDirective,
  GraphQLString,
  GraphQLBoolean,
  GraphQLList,
  GraphQLNonNull,
} = require(`graphql`)
const { SchemaDirectiveVisitor } = require(`graphql-tools`)
const moment = require(`moment`)
const { ISO_8601_FORMAT } = require(`../utils/is-date`)

const formatDate = (date, formatString, locale, fromNow, difference) => {
  if (fromNow) {
    return moment
      .utc(date, ISO_8601_FORMAT, true)
      .locale(locale)
      .fromNow()
  } else if (difference) {
    return moment().diff(
      moment.utc(date, ISO_8601_FORMAT, true).locale(locale),
      difference
    )
  } else if (formatString) {
    return moment
      .utc(date, ISO_8601_FORMAT, true)
      .locale(locale)
      .format(formatString)
  }
  return date
}

const DateFormatDirective = new GraphQLDirective({
  name: `dateformat`,
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    difference: { type: GraphQLString },
    formatString: { type: GraphQLString, defaultValue: `YYYY-MM-DD` },
    fromNow: { type: GraphQLBoolean },
    locale: { type: GraphQLString, defaultValue: `en` },
  },
})

// @see https://www.apollographql.com/docs/graphql-tools/schema-directives.html#Formatting-date-strings
class DateFormatDirectiveVisitor extends SchemaDirectiveVisitor {
  visitFieldDefinition(field) {
    const { resolve = defaultFieldResolver } = field
    const {
      difference: defaultDifference,
      formatString: defaultFormatString,
      fromNow: defaultFromNow,
      locale: defaultLocale,
    } = this.args

    field.args.push(
      { name: `difference`, type: GraphQLString },
      { name: `formatString`, type: GraphQLString },
      { name: `fromNow`, type: GraphQLBoolean },
      { name: `locale`, type: GraphQLString }
    )

    field.resolve = async (source, args, context, info) => {
      const { difference, formatString, fromNow, locale, ...rest } = args
      const date = await resolve(source, rest, context, info)
      const format = date =>
        formatDate(
          date,
          formatString || defaultFormatString,
          locale || defaultLocale,
          fromNow !== undefined ? fromNow : defaultFromNow,
          difference !== undefined ? difference : defaultDifference
        )
      return Array.isArray(date) ? date.map(format) : date ? format(date) : null
    }

    const wrappers = []
    let fieldType = field.type
    while (
      fieldType instanceof GraphQLList ||
      fieldType instanceof GraphQLNonNull
    ) {
      wrappers.unshift(fieldType.constructor)
      fieldType = fieldType.ofType
    }
    field.type = wrappers.reduce(
      (type, Wrapper) => new Wrapper(type),
      GraphQLString
    )
  }
}

module.exports = [
  DateFormatDirective,
  { dateformat: DateFormatDirectiveVisitor },
]
