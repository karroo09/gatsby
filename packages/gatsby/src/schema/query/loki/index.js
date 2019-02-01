const { getNodeTypeCollection } = require(`../../../db/loki/nodes`)
const { prepareQueryArgs } = require(`./quey-args`)
const { emitter } = require(`../../../redux`)

let fieldUsages = {}
const FIELD_INDEX_THRESHOLD = 5

emitter.on(`DELETE_CACHE`, () => {
  fieldUsages = {}
})

const ensureFieldIndexes = (coll, queryArgs) => {
  Object.keys(queryArgs).forEach(fieldName => {
    fieldUsages[fieldName] = fieldUsages[fieldName]
      ? fieldUsages[fieldName] + 1
      : 1
    if (fieldUsages[fieldName] === FIELD_INDEX_THRESHOLD) {
      coll.ensureIndex(fieldName)
    }
  })
}

const prepareSortArgs = sort => {
  const { fields, order } = sort
  const sortFields = fields.map((field, i) => [field, order[i] === `DESC`])
  return sortFields
}

const query = (type, args, firstResultOnly) => {
  const coll = getNodeTypeCollection(type.name)
  let chain = coll.chain()

  if (args.filter) {
    const filter = prepareQueryArgs(args.filter, type)
    ensureFieldIndexes(coll, filter)
    chain = chain.find(filter, firstResultOnly)
  }

  if (args.sort) {
    if (!args.sort.fields) {
      args.sort.fields = [`id`]
    }

    const sortArgs = prepareSortArgs(args.sort)
    chain = chain.compoundsort(sortArgs)

    args.sort.fields.forEach(field => coll.ensureIndex(field))
  }

  const results = chain.data()
  return firstResultOnly ? results[0] : results
}

module.exports = { query }
