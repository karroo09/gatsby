const _ = require(`lodash`)
const prepareRegex = require(`../../utils/prepare-regex`)
const sift = require(`sift`)
const { emitter } = require(`../../redux`)

const fieldUsages = {}
const FIELD_INDEX_THRESHOLD = 5
// TODO: Move this to redux!
emitter.on(`DELETE_CACHE`, () => {
  for (var field in fieldUsages) {
    delete fieldUsages[field]
  }
})

const siftifyArgs = object => {
  const newObject = {}
  _.each(object, (v, k) => {
    if (_.isPlainObject(v)) {
      if (k === `elemMatch`) {
        k = `$elemMatch`
      }
      newObject[k] = siftifyArgs(v)
    } else {
      // Compile regex first.
      if (k === `regex`) {
        newObject[`$regex`] = prepareRegex(v)
      } else if (k === `glob`) {
        const Minimatch = require(`minimatch`).Minimatch
        const mm = new Minimatch(v)
        newObject[`$regex`] = mm.makeRe()
      } else {
        newObject[`$${k}`] = v
      }
    }
  })
  return newObject
}

const runSift = (nodes, query) => {
  if (nodes) {
    const siftQuery = {
      $elemMatch: siftifyArgs(query),
    }
    return sift(siftQuery, nodes)
  } else {
    return null
  }
}

const toMongoArgs = (gqlFilter, lastFieldType) => {
  const mongoArgs = {}
  _.each(gqlFilter, (v, k) => {
    if (_.isPlainObject(v)) {
      if (k === `elemMatch`) {
        mongoArgs[`$where`] = obj => {
          const result = runSift(obj, v)
          return result && result.length > 0
        }
      } else {
        const gqlFieldType = lastFieldType.getFields()[k].type
        mongoArgs[k] = toMongoArgs(v, gqlFieldType)
      }
    } else {
      if (k === `regex`) {
        const re = prepareRegex(v)
        mongoArgs[`$where`] = obj => !_.isUndefined(obj) && re.test(obj)
      } else if (k === `glob`) {
        const Minimatch = require(`minimatch`).Minimatch
        const mm = new Minimatch(v)
        mongoArgs[`$regex`] = mm.makeRe()
      } else if (k === `eq` && v === null) {
        // Use `aeq` to catch both `null` and `undefined`
        mongoArgs[`$aeq`] = null
      } else if (
        k === `eq` &&
        lastFieldType &&
        lastFieldType.constructor.name === `GraphQLList`
      ) {
        mongoArgs[`$contains`] = v
      } else if (
        k === `ne` &&
        lastFieldType &&
        lastFieldType.constructor.name === `GraphQLList`
      ) {
        mongoArgs[`$containsNone`] = v
      } else if (
        k === `in` &&
        lastFieldType &&
        lastFieldType.constructor.name === `GraphQLList`
      ) {
        mongoArgs[`$containsAny`] = v
      } else if (
        k === `nin` &&
        lastFieldType &&
        lastFieldType.constructor.name === `GraphQLList`
      ) {
        mongoArgs[`$containsNone`] = v
      } else if (k === `ne` && v === null) {
        mongoArgs[`$ne`] = undefined
      } else if (k === `nin` && lastFieldType.name === `Boolean`) {
        mongoArgs[`$nin`] = v.concat([undefined])
      } else {
        mongoArgs[`$${k}`] = v
      }
    }
  })
  return mongoArgs
}

const toDottedFields = (filter, acc = {}, path = []) => {
  Object.keys(filter).forEach(key => {
    const value = filter[key]
    const nextValue = _.isPlainObject(value) && value[Object.keys(value)[0]]
    if (_.isPlainObject(nextValue)) {
      toDottedFields(value, acc, path.concat(key))
    } else {
      acc[path.concat(key).join(`.`)] = value
    }
  })
  return acc
}

const isNeTrue = (obj, path) => {
  if (path.length) {
    const [first, ...rest] = path
    return obj == null || obj[first] == null || isNeTrue(obj[first], rest)
  } else {
    return obj !== true
  }
}

const fixNeTrue = filter =>
  Object.keys(filter).reduce((acc, key) => {
    const value = filter[key]
    if (value[`$ne`] === true) {
      const [first, ...path] = key.split(`.`)
      acc[first] = { [`$where`]: obj => isNeTrue(obj, path) }
    } else {
      acc[key] = value
    }
    return acc
  }, {})

const convertArgs = (gqlArgs, gqlType) =>
  fixNeTrue(toDottedFields(toMongoArgs(gqlArgs.filter, gqlType)))

const toSortFields = sortArgs => {
  const { fields, order } = sortArgs
  const lokiSortFields = []
  for (let i = 0; i < fields.length; i++) {
    const dottedField = fields[i].replace(/___/g, `.`)
    const isDesc = order[i] === `desc`
    lokiSortFields.push([dottedField, isDesc])
  }
  return lokiSortFields
}

const ensureFieldIndices = (collection, fieldNames) => {
  fieldNames.forEach(fieldName => {
    fieldUsages[fieldName] = fieldUsages[fieldName] + 1 || 1
    if (fieldUsages[fieldName] === FIELD_INDEX_THRESHOLD) {
      collection.ensureIndex(fieldName)
    }
  })
}

const runQuery = async ({ gqlType, queryArgs, firstOnly }) => {
  const convertedArgs = convertArgs(queryArgs, gqlType)

  const { store } = require(`../../redux`)
  const { nodes } = store.getState()
  const collection = nodes.getCollection(`nodes`)
  // TODO: We should not get gqlType, but an array of node type names
  // so we can create a new DynamicView here for abstract types
  const type = gqlType.name
  const view = collection.getDynamicView(type)

  // ensureFieldIndices(view.collection, Object.keys(convertedArgs))
  // TODO: We don't want field indices, because only the firs find()
  // query can use those, and we use that for internal.type.
  // But we could create a DynamicView for queries that are executed
  // more often. The difference is of course that when the query params
  // change, we need a new DynamicView
  const resultSet = view.branchResultset().find(convertedArgs, firstOnly)

  if (queryArgs.sort) {
    const sortFields = toSortFields(queryArgs.sort)
    // sortFields.forEach(field => collection.ensureIndex(field[0]))
    return resultSet.compoundsort(sortFields).data()
  }

  return resultSet.data()
}

module.exports = runQuery
