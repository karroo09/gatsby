const { getExampleValue } = require(`../example-value`)

const typeConflictReporter = {
  addConflict: jest.fn(),
}
beforeEach(() => {
  typeConflictReporter.addConflict.mockClear()
})

const nodes = [
  {
    array: [1, 2, 3],
    arrayOfFunctions: [() => {}],
    arrayOfNumbers: [1],
    bigInt: 1,
    bool: false,
    date: `2018-01-01T00:00:00.000Z`,
    dates: [new Date(`2018-01-01`)],
    emptyArray: [],
    emptyObject: {},
    float: 1,
    function: () => {},
    int: 0,
    invalidDate: `Invalid Date`,
    invalidDates: [new Date(`2018-01-01`), `Invalid Date`],
    nestedArrays: [[1, 2, 3], [4, 5, 6]],
    number: 0.1,
    null: null,
    objectsInArray: [{ foo: true }, { bar: 1 }],
    object: {
      array: [1, 2, 3],
      date: `2018-01-01T00:00:00.000Z`,
      emptyArray: [],
      int: 1,
      nestedObject: null,
      string: `Baz qux`,
    },
    polymorphic: { foo: null },
    polymorphicArray: { foo: [[`foo`, `bar`]] },
    polymorphicWithNull: { foo: null },
    polymorphicArrayWithNull: { foo: [{ bar: true }] },
    string: null,
  },
  {
    arrayOfNumbers: [1, 0.2, 3],
    bigInt: 1e10,
    date: new Date(`2018-01-01`),
    dates: [`2018-01-01T00:00:00.000Z`],
    emptyArray: [undefined, null],
    float: 0.1,
    invalidDate: new Date(`2018-01-01`),
    invalidDates: [`2018-01-01T00:00:00.000Z`],
    nestedArrays: [[1, 2, 3]],
    number: 1,
    objectsInArray: [{ baz: `qux` }],
    object: {
      bool: true,
      date: `2018-01-01T00:00:00.000Z`,
      int: 1,
      nestedObject: {
        bool: true,
      },
      string: `Baz qux`,
    },
    polymorphic: { foo: [1] },
    polymorphicArray: { foo: [{ bar: 1 }] },
    polymorphicWithNull: { foo: { bar: true } },
    polymorphicArrayWithNull: { foo: null },
    string: `Foo bar`,
    stringObject: new String(`Foo bar`),
  },
  {
    array: [],
    polymorphic: { foo: { bar: true } },
    polymorphicWithNull: { foo: { baz: true } },
    polymorphicArrayWithNull: {
      foo: [{ baz: true }, { bar: false, qux: false }],
    },
    string: `Baz qux`,
    stringObject: `Baz qux`,
  },
  {
    object: {
      nestedObject: {
        bool: false,
        string: `Foo bar`,
      },
    },
  },
]

describe(`Example value`, () => {
  let exampleValue

  beforeAll(() => {
    exampleValue = getExampleValue({
      nodes,
      typeName: `Foo`,
      typeConflictReporter,
    })
  })

  it(`builds correct example value from array of nodes`, () => {
    // Jest does not serialize String objects by default
    expect.addSnapshotSerializer({
      test: val => val instanceof String,
      print: val => JSON.stringify(val),
    })
    expect(exampleValue).toMatchSnapshot()
  })

  it(`does not mutate nodes`, () => {
    expect(nodes[0].null).toBeDefined()
  })

  it(`skips ignoreFields at the top level`, () => {
    const exampleValueWithIgnoredFields = getExampleValue({
      nodes,
      ignoreFields: [`int`, `date`],
      typeConflictReporter,
    })
    expect(exampleValueWithIgnoredFields.int).toBeUndefined()
    expect(exampleValueWithIgnoredFields.date).toBeUndefined()
    expect(exampleValueWithIgnoredFields.object.int).toBeDefined()
    expect(exampleValueWithIgnoredFields.object.date).toBeDefined()
  })

  it(`keeps all array values on ___NODE foreign-key fields`, () => {
    const nodes = [
      {
        noUnion___NODE: `foo`,
        unions___NODE: [`foo`, `bar`],
        arrayOfNoUnion: [{ union___NODE: `foo` }, { union___NODE: `bar` }],
        arrayOfUnions: [{ union___NODE: [`foo`] }, { union___NODE: [`bar`] }],
      },
      {
        noUnion___NODE: `baz`,
        unions___NODE: [`baz`, `qux`],
        arrayOfNoUnion: [{ union___NODE: `baz` }, { union___NODE: `qux` }],
        arrayOfUnions: [{ union___NODE: [`baz`] }, { union___NODE: [`qux`] }],
      },
    ]
    const exampleValue = getExampleValue({
      nodes,
      typeName: `ForeignKey`,
      typeConflictReporter,
    })
    expect(exampleValue.noUnion___NODE).toBe(`foo`)
    expect(exampleValue.unions___NODE).toEqual([`foo`, `bar`, `baz`, `qux`])
    expect(exampleValue.arrayOfNoUnion).toEqual([{ union___NODE: `foo` }])
    expect(exampleValue.arrayOfUnions).toEqual([
      { union___NODE: [`foo`, `bar`, `baz`, `qux`] },
    ])
  })

  it(`skips null fields`, () => {
    expect(exampleValue.null).toBeUndefined()
  })

  it(`skips empty or sparse arrays`, () => {
    expect(exampleValue.emptyArray).toBeUndefined()
  })

  it(`skips empty objects`, () => {
    expect(exampleValue.emptyObject).toBeUndefined()
  })

  it(`skips polymorphic fields`, () => {
    expect(exampleValue.polymorphic).toBeUndefined()
    expect(exampleValue.polymorphicArray).toBeUndefined()
  })

  it(`does not confuse empty fields for polymorphic fields`, () => {
    expect(exampleValue.polymorphicWithNull).toEqual({
      foo: { bar: true, baz: true },
    })
    expect(exampleValue.polymorphicArrayWithNull).toEqual({
      foo: [{ bar: true, baz: true, qux: false }],
    })
  })

  it(`skips functions`, () => {
    expect(exampleValue.function).toBeUndefined()
    expect(exampleValue.arrayOfFunctions).toBeUndefined()
  })

  it(`prefers float in case of multiple number types`, () => {
    expect(exampleValue.int).toBe(0)
    expect(exampleValue.number).toBe(0.1)
    expect(exampleValue.float).toBe(0.1)
    expect(exampleValue.arrayOfNumbers).toEqual([0.2])
  })

  it(`treats non-32bit-integers as float (as mandated by GraphQL spec)`, () => {
    expect(exampleValue.bigInt).toBe(1e10)
  })

  it(`handles mix of valid date strings and date objects`, () => {
    expect(exampleValue.date).toBe(`2018-01-01T00:00:00.000Z`)
    expect(exampleValue.dates[0]).toBeInstanceOf(Date)
  })

  it(`treats mix of dates and strings as strings`, () => {
    expect(exampleValue.invalidDate).toBe(`String`)
    expect(exampleValue.invalidDates).toEqual([`String`])
  })
})

describe(`Type conflicts`, () => {
  it(`does not report conflicts if there are none`, () => {
    const nodes = [
      {
        id: 0,
        string: `foo`,
        number: 1,
        bool: true,
        array: [`foo`],
      },
      {
        id: 1,
        string: `bar`,
        number: 0.1,
        bool: false,
        array: null,
      },
    ]
    getExampleValue({ nodes, typeConflictReporter })
    expect(typeConflictReporter.addConflict).not.toBeCalled()
  })

  it(`does not report ignored fields`, () => {
    const nodes = [
      { id: 0, stringOrNumber: `foo`, stringOrBoolean: `bar` },
      { id: 1, stringOrNumber: 1, stringOrBoolean: true },
    ]
    getExampleValue({
      nodes,
      ignoreFields: [`stringOrNumber`],
      typeConflictReporter,
    })
    expect(typeConflictReporter.addConflict).toHaveBeenCalledTimes(1)
    expect(typeConflictReporter.addConflict).not.toBeCalledWith(
      `stringOrNumber`
    )
    expect(typeConflictReporter.addConflict).toBeCalledWith(
      `stringOrBoolean`,
      expect.any(Array)
    )
  })

  it(`reports type conflicts and their origin`, () => {
    const nodes = [
      {
        stringOrNumber: `foo`,
        arrayOfStringOrNumber: [`foo`],
        arrayOfStringOrBoolean: [`foo`, true],
      },
      {
        stringOrNumber: 1,
        arrayOfStringOrNumber: [1],
        arrayOfStringOrBoolean: null,
      },
    ]
    getExampleValue({ nodes, typeName: `Conflict`, typeConflictReporter })
    expect(typeConflictReporter.addConflict).toHaveBeenCalledTimes(3)
    expect(typeConflictReporter.addConflict).toBeCalledWith(
      `Conflict.stringOrNumber`,
      [
        { parent: nodes[0], type: `string`, value: nodes[0].stringOrNumber },
        { parent: nodes[1], type: `number`, value: nodes[1].stringOrNumber },
      ]
    )
    expect(typeConflictReporter.addConflict).toBeCalledWith(
      `Conflict.arrayOfStringOrNumber`,
      [
        {
          parent: nodes[0],
          type: `[string]`,
          value: nodes[0].arrayOfStringOrNumber,
        },
        {
          parent: nodes[1],
          type: `[number]`,
          value: nodes[1].arrayOfStringOrNumber,
        },
      ]
    )
    expect(typeConflictReporter.addConflict).toBeCalledWith(
      `Conflict.arrayOfStringOrBoolean`,
      [
        {
          parent: nodes[0],
          type: `[string,boolean]`,
          value: nodes[0].arrayOfStringOrBoolean,
        },
      ]
    )
  })
})
