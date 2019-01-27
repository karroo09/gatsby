const {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLInt,
  GraphQLID,
  GraphQLNonNull,
  GraphQLString,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLList,
  GraphQLInputObjectType,
  Kind,
} = require(`graphql`)
const { TypeComposer, schemaComposer } = require(`graphql-compose`)
const { getInputArgs } = require(`../../input`)

const isIntInput = type => {
  expect(type).toBeInstanceOf(GraphQLInputObjectType)
  expect(type.getFields()).toEqual({
    eq: { name: `eq`, type: GraphQLInt },
    ne: { name: `ne`, type: GraphQLInt },
    lt: { name: `lt`, type: GraphQLInt },
    lte: { name: `lte`, type: GraphQLInt },
    gt: { name: `gt`, type: GraphQLInt },
    gte: { name: `gte`, type: GraphQLInt },
    in: { name: `in`, type: new GraphQLList(GraphQLInt) },
    nin: { name: `nin`, type: new GraphQLList(GraphQLInt) },
  })
}

const isIdInput = type => {
  expect(type).toBeInstanceOf(GraphQLInputObjectType)
  expect(type.getFields()).toEqual({
    eq: { name: `eq`, type: GraphQLID },
    ne: { name: `ne`, type: GraphQLID },
    in: { name: `in`, type: new GraphQLList(GraphQLID) },
    nin: { name: `nin`, type: new GraphQLList(GraphQLID) },
  })
}

const isStringInput = type => {
  expect(type).toBeInstanceOf(GraphQLInputObjectType)
  expect(type.getFields()).toEqual({
    eq: { name: `eq`, type: GraphQLString },
    ne: { name: `ne`, type: GraphQLString },
    regex: { name: `regex`, type: GraphQLString },
    glob: { name: `glob`, type: GraphQLString },
    in: { name: `in`, type: new GraphQLList(GraphQLString) },
    nin: { name: `nin`, type: new GraphQLList(GraphQLString) },
  })
}

const isFloatInput = type => {
  expect(type).toBeInstanceOf(GraphQLInputObjectType)
  expect(type.getFields()).toEqual({
    eq: { name: `eq`, type: GraphQLFloat },
    ne: { name: `ne`, type: GraphQLFloat },
    lt: { name: `lt`, type: GraphQLFloat },
    lte: { name: `lte`, type: GraphQLFloat },
    gt: { name: `gt`, type: GraphQLFloat },
    gte: { name: `gte`, type: GraphQLFloat },
    in: { name: `in`, type: new GraphQLList(GraphQLFloat) },
    nin: { name: `nin`, type: new GraphQLList(GraphQLFloat) },
  })
}

const isBoolInput = type => {
  expect(type).toBeInstanceOf(GraphQLInputObjectType)
  expect(type.getFields()).toEqual({
    eq: { name: `eq`, type: GraphQLBoolean },
    ne: { name: `ne`, type: GraphQLBoolean },
    in: { name: `in`, type: new GraphQLList(GraphQLBoolean) },
    nin: { name: `nin`, type: new GraphQLList(GraphQLBoolean) },
  })
}

const typeField = type => ({ type })

const getInferredFields = fields => {
  const tc = TypeComposer.createTemp({ name: `TestType`, fields })
  return getInputArgs(tc)[0]
    .getType()
    .getFields()
}

const oddValue = value => (value % 2 ? value : null)

const OddType = new GraphQLScalarType({
  name: `Odd`,
  serialize: oddValue,
  parseValue: oddValue,
  parseLiteral(ast) {
    return ast.kind === Kind.INT ? oddValue(parseInt(ast.value, 10)) : null
  },
})

describe(`[legacy] GraphQL Input args from fields, test-only`, () => {
  beforeEach(() => {
    schemaComposer.clear()
  })

  it(`handles all known scalars`, async () => {
    // FIXME: $in and $nin operators on boolean fields, see #11197
    const fields = {
      scal_int: typeField(GraphQLInt),
      scal_float: typeField(GraphQLFloat),
      scal_string: typeField(GraphQLString),
      scal_bool: typeField(GraphQLBoolean),
      scal_odd_unknown: typeField(OddType),
    }

    const inferredFields = getInferredFields(fields)

    const int = inferredFields.scal_int.type
    expect(int.name).toBe(`IntQueryOperatorInput`)
    isIntInput(int)

    const float = inferredFields.scal_float.type
    expect(float.name).toBe(`FloatQueryOperatorInput`)
    isFloatInput(float)

    const string = inferredFields.scal_string.type
    expect(string.name).toBe(`StringQueryOperatorInput`)
    isStringInput(string)

    const bool = inferredFields.scal_bool.type
    expect(bool.name).toBe(`BooleanQueryOperatorInput`)
    isBoolInput(bool)

    expect(inferredFields).not.toHaveProperty(`scal_odd_unknown`)
  })

  it(`recursively converts object types`, async () => {
    const fields = {
      obj: typeField(
        new GraphQLObjectType({
          name: `Obj`,
          fields: {
            foo: typeField(GraphQLInt),
            bar: typeField(
              new GraphQLObjectType({
                name: `Jbo`,
                fields: {
                  foo: typeField(GraphQLString),
                },
              })
            ),
          },
        })
      ),
    }

    const inferredFields = getInferredFields(fields)

    const obj = inferredFields.obj.type
    const objFields = obj.getFields()

    expect(obj instanceof GraphQLInputObjectType).toBeTruthy()
    isIntInput(objFields.foo.type)

    const innerObj = objFields.bar.type
    const innerObjFields = innerObj.getFields()
    isStringInput(innerObjFields.foo.type)
  })

  it(`handles lists within lists`, async () => {
    const Row = new GraphQLObjectType({
      name: `Row`,
      fields: () => ({ cells: typeField(new GraphQLList(Cell)) }),
    })

    const Cell = new GraphQLObjectType({
      name: `Cell`,
      fields: () => ({ value: typeField(GraphQLInt) }),
    })

    const fields = {
      rows: typeField(new GraphQLList(Row)),
    }

    expect(() => getInferredFields(fields)).not.toThrow()
  })

  it(`protects against infinite recursion on circular definitions`, async () => {
    // NOTE: We handle circular references now
    const TypeA = new GraphQLObjectType({
      name: `TypeA`,
      fields: () => ({ typeb: typeField(TypeB) }),
    })

    const TypeB = new GraphQLObjectType({
      name: `TypeB`,
      fields: () => ({
        bar: typeField(GraphQLID),
        typea: typeField(TypeA),
      }),
    })

    const fields = {
      entryPointA: typeField(TypeA),
      entryPointB: typeField(TypeB),
    }

    let inferredFields

    expect(() => (inferredFields = getInferredFields(fields))).not.toThrow()

    const entryPointA = inferredFields.entryPointA.type
    const entryPointAFields = entryPointA.getFields()
    const entryPointB = inferredFields.entryPointB.type
    const entryPointBFields = entryPointB.getFields()

    expect(entryPointA).toBeInstanceOf(GraphQLInputObjectType)
    expect(entryPointB).toBeInstanceOf(GraphQLInputObjectType)
    isIdInput(entryPointBFields.bar.type)

    // next level should also work, ie. typeA -> type B
    const childAB = entryPointAFields.typeb.type
    const childABFields = childAB.getFields()
    expect(childAB).toBeInstanceOf(GraphQLInputObjectType)
    isIdInput(childABFields.bar.type)

    // circular level should not be here, ie. typeA -> typeB -> typeA
    expect(childABFields.typea.type).toBeInstanceOf(GraphQLInputObjectType)

    // in the other direction, from entryPointB -> typeA, the latter shouldn't exist,
    // due to having no further non-circular fields to filter
    expect(entryPointBFields.typea.type).toBeInstanceOf(GraphQLInputObjectType)
  })

  it(`recovers from unknown output types`, async () => {
    const fields = {
      obj: {
        type: new GraphQLObjectType({
          name: `Obj`,
          fields: {
            aa: typeField(OddType),
            foo: typeField(GraphQLInt),
            bar: typeField(
              new GraphQLObjectType({
                name: `Jbo`,
                fields: {
                  aa: typeField(OddType),
                  foo: typeField(GraphQLString),
                  ba: typeField(OddType),
                  bar: typeField(GraphQLInt),
                },
              })
            ),
            baz: typeField(
              new GraphQLObjectType({
                name: `Jbo2`,
                fields: {
                  aa: typeField(OddType),
                },
              })
            ),
          },
        }),
      },
      odd: typeField(OddType),
    }

    const inferredFields = getInferredFields(fields)

    expect(inferredFields.odd).toBeUndefined()

    const obj = inferredFields.obj.type
    const objFields = obj.getFields()

    expect(obj).toBeInstanceOf(GraphQLInputObjectType)
    isIntInput(objFields.foo.type)
    expect(objFields.aa).toBeUndefined()

    const innerObj = objFields.bar.type
    const innerObjFields = innerObj.getFields()
    expect(innerObjFields.aa).toBeUndefined()
    isStringInput(innerObjFields.foo.type)
    expect(innerObjFields.ba).toBeUndefined()
    isIntInput(innerObjFields.bar.type)

    // innerObj.baz is object containing only unsupported types
    // so it should not be defined
    expect(innerObj.baz).toBeUndefined()
  })

  it(`includes the filters of list elements`, async () => {
    const fields = {
      list: typeField(new GraphQLList(GraphQLFloat)),
    }

    const inferredFields = getInferredFields(fields)

    const list = inferredFields.list.type

    expect(list).toBeInstanceOf(GraphQLInputObjectType)
    isFloatInput(list)
  })

  it(`strips away NonNull`, async () => {
    const fields = {
      nonNull: typeField(new GraphQLNonNull(GraphQLInt)),
    }

    const inferredFields = getInferredFields(fields)

    isIntInput(inferredFields.nonNull.type)
  })

  it(`extracts the fields you can sort on`, async () => {
    const fields = {
      foo: typeField(GraphQLString),
      bar: typeField(GraphQLFloat),
      baz: typeField(
        new GraphQLObjectType({
          name: `Baz`,
          fields: {
            ka: typeField(GraphQLFloat),
            ma: typeField(
              new GraphQLList(
                new GraphQLObjectType({
                  name: `Hol`,
                  fields: {
                    go: typeField(GraphQLFloat),
                  },
                })
              )
            ),
          },
        })
      ),
    }

    const tc = TypeComposer.createTemp({ name: `TestType`, fields })
    const sortFields = getInputArgs(tc)[1]
      .getType()
      .getFields()
      .fields.type.ofType.getValues()
      .map(({ name }) => name)

    // FIXME: Current master infers `baz___ma` which is an object, that cannot be sorted on
    expect(sortFields.sort()).toEqual([
      `bar`,
      `baz___ka`,
      `baz___ma___go`,
      `foo`,
    ])
  })
})
