const {
  defaultFieldResolver,
  DirectiveLocation,
  GraphQLDirective,
  GraphQLString,
  GraphQLBoolean,
} = require(`graphql`)
const { SchemaDirectiveVisitor } = require(`graphql-tools`)
const {
  format,
  formatDistance,
  formatRelative,
  isValid,
  parseISO,
} = require(`date-fns`)

// UPSTREAM: GraphQLDate.parseLiteral should accept date strings in other
// formats but toISOString (could use utils/isDate)
// TODO: `difference` arg should be GraphQLDate?

const toDate = date => (typeof date === `string` ? parseISO(date) : date)

const formatDate = (
  dateOrString,
  formatString,
  lang,
  timeZone,
  fromNow,
  difference
) => {
  const locale = lang && require(`date-fns/locale/${lang}`)
  const date = toDate(dateOrString)
  if (fromNow) {
    return formatRelative(date, Date.now(), { locale })
  }
  const baseDate = toDate(difference)
  if (isValid(baseDate)) {
    // TODO: Use formatDistanceStrict?
    return formatDistance(date, baseDate, { locale, addSuffix: true })
  }
  return format(date, formatString, {
    locale,
    // Allow formatting with YYYY-MM-DD, instead of the more correct yyyy-MM-dd
    // @see: https://git.io/fxCyr
    awareOfUnicodeTokens: true,
    // timeZone, // IANA time zone, needs `date-fns-tz`
  })
}

const DateFormatDirective = new GraphQLDirective({
  name: `dateformat`,
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    difference: { type: GraphQLString },
    formatString: { type: GraphQLString, defaultValue: `yyyy-MM-dd` },
    fromNow: { type: GraphQLBoolean },
    locale: { type: GraphQLString, defaultValue: `en-US` },
    timeZone: { type: GraphQLString, defaultValue: `UTC` },
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
      timeZone: defaultTimeZone,
    } = this.args

    field.args.push(
      { name: `difference`, type: GraphQLString },
      { name: `formatString`, type: GraphQLString },
      { name: `fromNow`, type: GraphQLBoolean },
      { name: `locale`, type: GraphQLString },
      { name: `timeZone`, type: GraphQLString }
    )

    field.resolve = async (source, args, context, info) => {
      const {
        difference,
        formatString,
        fromNow,
        locale,
        timeZone,
        ...rest
      } = args
      const date = await resolve(source, rest, context, info)
      return date
        ? formatDate(
            date,
            formatString || defaultFormatString,
            locale || defaultLocale,
            timeZone || defaultTimeZone,
            fromNow !== undefined ? fromNow : defaultFromNow,
            difference !== undefined ? difference : defaultDifference
          )
        : null
    }

    field.type = GraphQLString
  }
}

module.exports = [
  DateFormatDirective,
  { dateformat: DateFormatDirectiveVisitor },
]
