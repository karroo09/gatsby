const {
  findById,
  findByIds,
  findByIdsAndType,
  findMany,
  findOne,
  link,
} = require(`..`)

const { TypeComposer, schemaComposer } = require(`graphql-compose`)
TypeComposer.create({
  name: `Nested`,
  fields: { bar: `type Baz { baz: String }` },
})
TypeComposer.create(`type Foo { baz: String, foo: Nested }`)
TypeComposer.create(`type Bar { baz: String, foo: Nested }`)

schemaComposer.Query.addFields({ foo: `Foo`, bar: `Bar`, nested: `Nested` })
const schema = schemaComposer.buildSchema()

const { getById } = require(`../../db`)
jest.mock(`../../db`, () => {
  const nodes = [
    {
      id: 1,
      internal: { type: `Foo` },
      baz: `qux`,
      foo: { bar: { baz: `baz` } },
    },
    {
      id: 2,
      internal: { type: `Bar` },
      baz: `baz`,
      foo: { bar: { baz: `baz` } },
    },
    {
      id: 3,
      internal: { type: `Foo` },
      baz: `baz`,
      foo: { bar: { baz: `qux` } },
    },
    {
      id: 4,
      internal: { type: `Foo` },
      baz: `foo`,
      foo: { bar: { baz: `baz` } },
    },
    {
      id: 5,
      internal: { type: `Bar` },
      baz: `baz`,
      foo: { bar: { baz: `baz` } },
    },
  ]
  return {
    getById: jest
      .fn()
      .mockImplementation(id => nodes.find(n => n.id === id) || null),
    getNodesByType: type => nodes.filter(node => node.internal.type === type),
  }
})

const createPageDependency = require(`../../../redux/actions/add-page-dependency`)
jest.mock(`../../../redux/actions/add-page-dependency`)
const withPageDependencies = require(`../page-dependencies`)
jest.spyOn({ withPageDependencies }, `withPageDependencies`)

describe(`Resolvers`, () => {
  const type = `Foo`

  describe(`findById`, () => {
    it(`finds node by id`, async () => {
      const result = await findById({ args: { id: 1 } })
      expect(result).toBe(getById(1))
    })

    it(`returns null when id not found`, async () => {
      const result = await findById({ args: { id: 0 } })
      expect(result).toBeNull()
    })
  })

  describe(`findByIds`, () => {
    it(`finds nodes by ids`, async () => {
      expect(await findByIds({ args: { ids: [1, 2] } })).toEqual(
        [1, 2].map(getById)
      )
    })

    it(`filters out non-existing nodes`, async () => {
      expect(await findByIds({ args: { ids: [1, 10] } })).toEqual([getById(1)])
    })

    it(`returns empty array when nothing was found`, async () => {
      expect(await findByIds({ args: { ids: [10, 11] } })).toEqual([])
    })
  })

  describe(`findByIdsAndType`, () => {
    it(`finds nodes by ids and type`, async () => {
      const result = await findByIdsAndType(type)({ args: { ids: [1, 3] } })
      expect(result).toEqual([1, 3].map(getById))
    })

    it(`filters out nodes of wrong type`, async () => {
      const result = await findByIdsAndType(type)({ args: { ids: [1, 2] } })
      expect(result).toEqual([getById(1)])
    })

    it(`finds single node`, async () => {
      const firstResultOnly = true
      const result = await findByIdsAndType(type)(
        { args: { ids: [1] } },
        firstResultOnly
      )
      expect(result).toBe(getById(1))
    })

    it(`returns null or empty array when nothing was found`, async () => {
      let result = await findByIdsAndType(type)({ args: { ids: [0] } }, true)
      expect(result).toBeNull()
      result = await findByIdsAndType(type)({ args: { ids: [0] } })
      expect(result).toEqual([])
    })
  })

  describe(`findMany`, () => {
    it(`finds nodes matching filter`, async () => {
      const filter = { baz: { ne: `foo` } }
      const result = await findMany(type)({
        args: { filter },
        info: { schema },
      })
      expect(result).toEqual([1, 3].map(getById))
    })

    it(`sorts nodes matching filter`, async () => {
      const filter = { baz: { ne: `foo` } }
      const sort = { fields: [`foo.bar.baz`], order: [`DESC`] }
      const result = await findMany(type)({
        args: { filter, sort },
        info: { schema },
      })
      expect(result).toEqual([3, 1].map(getById))
    })
  })

  describe(`findOne`, () => {
    it(`finds first node matching filter`, async () => {
      const filter = { baz: { ne: `foo` } }
      const result = await findOne(type)({ args: filter, info: { schema } })
      expect(result).toEqual(getById(1))
    })
  })

  describe(`resolve linked nodes`, () => {
    const { GraphQLList } = require(`graphql`)
    const FooType = schema.getType(`Foo`)
    const FoosType = new GraphQLList(FooType)
    const BarsType = new GraphQLList(schema.getType(`Bar`))

    it(`resolves one-to-one`, async () => {
      const source = { id: 1000, linkedFoo: `qux` }
      const info = { fieldName: `linkedFoo`, returnType: FooType, schema }
      const resolver = link({ by: `baz` })
      const resolved = await resolver(source, {}, {}, info)
      expect(resolved).toEqual(getById(1))
    })

    it(`resolves many-to-many`, async () => {
      const source = { id: 1000, linkedFoos: [`baz`, `foo`] }
      const info = { fieldName: `linkedFoos`, returnType: FoosType, schema }
      const resolver = link({ by: `baz` })
      const resolved = await resolver(source, {}, {}, info)
      expect(resolved).toEqual([3, 4].map(getById))
    })

    it(`resolves one-to-many`, async () => {
      const source = { id: 1000, linkedBars: `baz` }
      const info = { fieldName: `linkedBars`, returnType: BarsType, schema }
      const resolver = link({ by: `baz` })
      const resolved = await resolver(source, {}, {}, info)
      expect(resolved).toEqual([2, 5].map(getById))
    })

    it(`resolves nested one-to-one`, async () => {
      const source = { id: 1000, linkedFoo: `qux` }
      const info = { fieldName: `linkedFoo`, returnType: FooType, schema }
      const resolver = link({ by: `foo.bar.baz` })
      const resolved = await resolver(source, {}, {}, info)
      expect(resolved).toEqual(getById(3))
    })

    it(`resolves nested many-to-many`, async () => {
      const source = { id: 1000, linkedFoos: [`baz`, `qux`] }
      const info = { fieldName: `linkedFoos`, returnType: FoosType, schema }
      const resolver = link({ by: `foo.bar.baz` })
      const resolved = await resolver(source, {}, {}, info)
      expect(resolved).toEqual([1, 3, 4].map(getById))
    })

    it(`resolves nested one-to-many`, async () => {
      const source = { id: 1000, linkedFoos: `baz` }
      const info = { fieldName: `linkedFoos`, returnType: FoosType, schema }
      const resolver = link({ by: `foo.bar.baz` })
      const resolved = await resolver(source, {}, {}, info)
      expect(resolved).toEqual([1, 4].map(getById))
    })

    it(`resolves id`, async () => {
      getById.mockClear()
      const source = { id: 1000, linkedFoo: 1 }
      const info = { fieldName: `linkedFoo`, returnType: FooType, schema }
      const resolver = link({ by: `id` })
      const resolved = await resolver(source, {}, {}, info)
      expect(getById).toHaveBeenCalledTimes(1)
      expect(resolved).toEqual(getById(1))
    })

    it(`resolves ids`, async () => {
      getById.mockClear()
      const source = { id: 1000, linkedFoos: [3, 4] }
      const info = { fieldName: `linkedFoos`, returnType: FoosType, schema }
      const resolver = link({ by: `id` })
      const resolved = await resolver(source, {}, {}, info)
      expect(getById).toHaveBeenCalledTimes(2)
      expect(resolved).toEqual([3, 4].map(getById))
    })

    it(`returns field value when link already resolved`, async () => {
      const source = { id: 1000, linkedFoo: getById(1) }
      const info = { fieldName: `linkedFoo`, returnType: FooType, schema }
      const resolver = link({ by: `id` })
      getById.mockClear()
      const resolved = await resolver(source, {}, {}, info)
      expect(getById).not.toHaveBeenCalled()
      expect(resolved).toBe(getById(1))
    })

    it(`bails early when field value is null`, async () => {
      const source = { id: 1000, linkedFoo: null }
      const info = { fieldName: `linkedFoo`, returnType: FooType, schema }
      const resolver = link({ by: `id` })
      getById.mockClear()
      const resolved = await resolver(source, {}, {}, info)
      expect(getById).not.toHaveBeenCalled()
      expect(resolved).toBeNull()
    })

    it(`creates page dependencies for nodes linked by id`, async () => {
      const source = { id: 1000, linkedFoo: 1 }
      const context = { path: `foo` }
      const info = {
        fieldName: `linkedFoo`,
        parentType: { name: `Query` },
        returnType: FooType,
        schema,
      }
      const resolver = link({ by: `id` })
      createPageDependency.mockClear()
      await resolver(source, {}, context, info)
      expect(createPageDependency).toHaveBeenCalledTimes(1)
      expect(createPageDependency).toBeCalledWith({ nodeId: 1, path: `foo` })
    })

    it(`creates page dependencies for linked nodes`, async () => {
      const source = { id: 1000, linkedBar: `baz` }
      const context = { path: `foo` }
      const info = {
        fieldName: `linkedBar`,
        parentType: { name: `Query` },
        returnType: BarsType,
        schema,
      }
      const resolver = link({ by: `baz` })
      createPageDependency.mockClear()
      await resolver(source, {}, context, info)
      expect(createPageDependency).toHaveBeenCalledTimes(1)
      expect(createPageDependency).toBeCalledWith({
        connection: `Bar`,
        path: `foo`,
      })
    })
  })
})
