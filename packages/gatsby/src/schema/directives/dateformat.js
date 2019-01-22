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

const convertFormatString = str =>
  // `date-fns` uses a more standard compliant format than `momentjs`, e.g.
  // `DD` refers to day of year, not day of month (this would be `dd`).
  // This would be a breaking change, so we emulate the old behavior here.
  // @see https://git.io/fxCyr
  str && str.replace(/D/g, `d`).replace(/Y/g, `y`)

const toDate = date => (typeof date === `string` ? parseISO(date) : date)

const formatDate = (
  dateOrString,
  momentFormatString,
  lang,
  timeZone,
  fromNow,
  difference
) => {
  const formatString = convertFormatString(momentFormatString)
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
      const format = date =>
        formatDate(
          date,
          formatString || defaultFormatString,
          locale || defaultLocale,
          timeZone || defaultTimeZone,
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
