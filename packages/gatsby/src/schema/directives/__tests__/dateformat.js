const { TypeComposer, schemaComposer } = require(`graphql-compose`)
const { SchemaDirectiveVisitor } = require(`graphql-tools`)
const { GraphQLString, GraphQLNonNull, GraphQLList } = require(`graphql`)

const { directives, visitors } = require(`..`)
const addResolvers = require(`../../schema/add-resolvers`)

const tc = TypeComposer.create(`
  type Foo {
    formattable: Date @dateformat
    formatted: Date @dateformat(formatString: "DD. MMMM YYYY", locale: "de")
    fromNow: Date @dateformat(fromNow: true, locale: "de")
    difference: Date @dateformat(difference: "days")
    many: [Date!]! @dateformat(formatString: "DD/MM/YYYY")
  }
`)

addResolvers(tc)
schemaComposer.Query.addFields({ foo: tc.getResolver(`findOne`) })
const schema = schemaComposer.buildSchema({ directives })
SchemaDirectiveVisitor.visitSchemaDirectives(schema, visitors)

const Foo = schema.getType(`Foo`)
const fields = Foo.getFields()

describe(`@dateformat directive`, () => {
  it(`adds directive with default args`, () => {
    const formattableDirective = fields.formattable.astNode.directives[0]
    expect(formattableDirective.name.value).toBe(`dateformat`)
    expect(formattableDirective.arguments).toEqual([])

    const formattedDirective = fields.formatted.astNode.directives[0]
    expect(formattedDirective.name.value).toBe(`dateformat`)
    expect(formattedDirective.arguments.map(arg => arg.name.value)).toEqual([
      `formatString`,
      `locale`,
    ])

    const fromNowDirective = fields.fromNow.astNode.directives[0]
    expect(fromNowDirective.name.value).toBe(`dateformat`)
    expect(fromNowDirective.arguments.map(arg => arg.name.value)).toEqual([
      `fromNow`,
      `locale`,
    ])

    const differenceDirective = fields.difference.astNode.directives[0]
    expect(differenceDirective.name.value).toBe(`dateformat`)
    expect(differenceDirective.arguments.map(arg => arg.name.value)).toEqual([
      `difference`,
    ])

    const manyDirective = fields.many.astNode.directives[0]
    expect(manyDirective.name.value).toBe(`dateformat`)
    expect(manyDirective.arguments.map(arg => arg.name.value)).toEqual([
      `formatString`,
    ])
  })

  it(`adds input args to field`, () => {
    expect(fields.formattable.args.map(arg => arg.name)).toEqual([
      `difference`,
      `formatString`,
      `fromNow`,
      `locale`,
    ])
    expect(fields.formatted.args.map(arg => arg.name)).toEqual([
      `difference`,
      `formatString`,
      `fromNow`,
      `locale`,
    ])
    expect(fields.fromNow.args.map(arg => arg.name)).toEqual([
      `difference`,
      `formatString`,
      `fromNow`,
      `locale`,
    ])
    expect(fields.difference.args.map(arg => arg.name)).toEqual([
      `difference`,
      `formatString`,
      `fromNow`,
      `locale`,
    ])
    expect(fields.many.args.map(arg => arg.name)).toEqual([
      `difference`,
      `formatString`,
      `fromNow`,
      `locale`,
    ])
  })

  it(`adds field resolver`, () => {
    expect(fields.formattable.resolve).toBeInstanceOf(Function)
    expect(fields.formatted.resolve).toBeInstanceOf(Function)
    expect(fields.fromNow.resolve).toBeInstanceOf(Function)
    expect(fields.difference.resolve).toBeInstanceOf(Function)
    expect(fields.many.resolve).toBeInstanceOf(Function)
  })

  it(`sets field type to String`, () => {
    expect(fields.formattable.type).toBe(GraphQLString)
    expect(fields.formatted.type).toBe(GraphQLString)
    expect(fields.fromNow.type).toBe(GraphQLString)
    expect(fields.difference.type).toBe(GraphQLString)
    expect(fields.many.type).toBeInstanceOf(GraphQLNonNull)
    expect(fields.many.type.ofType).toBeInstanceOf(GraphQLList)
    expect(fields.many.type.ofType.ofType).toBeInstanceOf(GraphQLNonNull)
    expect(fields.many.type.ofType.ofType.ofType).toBe(GraphQLString)
  })

  it(`keeps Date type of input filter`, () => {
    const filterFields = schema.getQueryType().getFields().foo.args
    expect(filterFields[0].type.name).toBe(`DateQueryOperatorInput`)
    expect(filterFields[1].type.name).toBe(`DateQueryOperatorInput`)
    expect(filterFields[2].type.name).toBe(`DateQueryOperatorInput`)
    expect(filterFields[3].type.name).toBe(`DateQueryOperatorInput`)
    expect(filterFields[4].type.name).toBe(`DateQueryOperatorInput`)
  })

  it(`uses default directive args`, async () => {
    const date = new Date(2019, 0, 1, 10)
    Date.now = jest.fn().mockReturnValue(new Date(2019, 0, 3))

    // defaultValue: "yyyy-MM-dd", "en-US", "UTC", false, undefined
    const formattableDate = await fields.formattable.resolve(
      { date },
      {},
      {},
      { fieldName: `date` }
    )
    expect(formattableDate).toBe(`2019-01-01`)

    // default formatString: "dd. MMMM yyyy", default locale: "de"
    const formattedDate = await fields.formatted.resolve(
      { date },
      {},
      {},
      { fieldName: `date` }
    )
    expect(formattedDate).toBe(`01. Januar 2019`)

    // default fromNow: true, default locale: "de"
    const fromNow = await fields.fromNow.resolve(
      { date },
      {},
      {},
      { fieldName: `date` }
    )
    expect(fromNow).toBe(`vor 2 Tagen`)

    // default difference: "days"
    const difference = await fields.difference.resolve(
      { date },
      {},
      {},
      { fieldName: `date` }
    )
    expect(difference).toBe(1)
  })

  it(`uses input args`, async () => {
    const date = new Date(Date.UTC(2019, 0, 1))
    Date.now = jest.fn().mockReturnValue(new Date(Date.UTC(2019, 0, 3)))

    const formattableDate = await fields.formattable.resolve(
      { date },
      { formatString: `YYYY` },
      {},
      { fieldName: `date` }
    )
    expect(formattableDate).toBe(`2019`)

    const formattedDate = await fields.formatted.resolve(
      { date },
      { formatString: `YYYY` },
      {},
      { fieldName: `date` }
    )
    expect(formattedDate).toBe(`2019`)

    // NOTE: If you set default `fromNow: true`, you need to
    // explicitly disable it for formatting args to take effect.
    const fromNow = await fields.fromNow.resolve(
      { date },
      { formatString: `YYYY`, fromNow: false },
      {},
      { fieldName: `date` }
    )
    expect(fromNow).toBe(`2019`)
    const difference = await fields.difference.resolve(
      { date },
      { difference: `minutes` },
      {},
      { fieldName: `date` }
    )
    expect(difference).toBe(2880)
  })

  it(`handles arrays of dates`, async () => {
    const dates = [
      new Date(Date.UTC(2018, 0, 1)),
      new Date(Date.UTC(2019, 0, 1)),
    ]
    const many = await fields.many.resolve(
      { dates },
      {},
      {},
      { fieldName: `dates` }
    )
    expect(many).toEqual([`01/01/2018`, `01/01/2019`])
  })
})
