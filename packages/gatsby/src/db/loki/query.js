const _ = require(`lodash`)
const prepareRegex = require(`../../utils/prepare-regex`)
const { emitter } = require(`../../redux`)

const fieldUsages = {}
const FIELD_INDEX_THRESHOLD = 5

emitter.on(`DELETE_CACHE`, () => {
  for (var field in fieldUsages) {
    delete fieldUsages[field]
  }
})

const toMongoArgs = (gqlFilter, lastFieldType) => {
  const mongoArgs = {}
  _.each(gqlFilter, (v, k) => {
    if (_.isPlainObject(v)) {
      if (k === `elemMatch`) {
        const gqlFieldType = lastFieldType.ofType
        mongoArgs[`$elemMatch`] = toMongoArgs(v, gqlFieldType)
      } else {
        const gqlFieldType = lastFieldType.getFields()[k].type
        mongoArgs[k] = toMongoArgs(v, gqlFieldType)
      }
    } else {
      if (k === `regex`) {
        const re = prepareRegex(v)
        // To ensure that false is returned if a field doesn't
        // exist. E.g `{nested.field: {$regex: /.*/}}`
        mongoArgs[`$where`] = obj => !_.isUndefined(obj) && re.test(obj)
      } else if (k === `glob`) {
        const Minimatch = require(`minimatch`).Minimatch
        const mm = new Minimatch(v)
        mongoArgs[`$regex`] = mm.makeRe()
      } else if (k === `eq` && v === null) {
        mongoArgs[`$in`] = [null, undefined]
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
    if (key === `$elemMatch`) {
      acc[path.join(`.`)] = { [`$elemMatch`]: toDottedFields(value) }
    } else if (_.isPlainObject(nextValue)) {
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
    const dottedField = fields[i]
    const isDesc = order[i] && order[i].toLowerCase() === `desc`
    lokiSortFields.push([dottedField, isDesc])
  }
  return lokiSortFields
}

const ensureFieldIndexes = (collection, lokiArgs) => {
  _.forEach(lokiArgs, (v, fieldName) => {
    _.update(fieldUsages, fieldName, n => (n ? n + 1 : 1))
    if (_.get(fieldUsages, fieldName) === FIELD_INDEX_THRESHOLD) {
      collection.ensureIndex(fieldName)
    }
  })
}

const getSortFields = (collection, sort) => {
  const sortFields = toSortFields(sort)
  sortFields.forEach(sortField => collection.ensureIndex(sortField[0]))
  return sortFields
}

const query = (collections, query, firstOnly) => {
  debugger
  // TODO: query/filter can be empty object

  const resultSets = collections.map(([collection, type]) => {
    const filter = convertArgs(query, type)
    ensureFieldIndexes(collection, filter)
    return collection.chain().find(filter, firstOnly)
  })

  // If we query more than one collection (i.e. we query an abstract type),
  // we need to manually concat results (and manually sort that).
  if (resultSets.length > 1) {
    const data = []
    resultSets.forEach(resultSet => [...data, ...resultSet.data()])

    let results
    if (query.sort) {
      // TODO: Try to utilise sort index nevertheless (to get something pre-sorted),
      // even if we have to manually sort anyway?
      const sortFields = toSortFields(query.sort)
      results = _.sortBy(data, sortFields)
    }
    return firstOnly && results ? results[0] : results
  }

  // If we only have one collection, we can let Loki do the sorting
  const [resultSet] = resultSets
  const [[collection]] = collections
  const chain = query.sort
    ? resultSet.compoundsort(getSortFields(collection, query.sort))
    : resultSet
  const results = chain.data()
  return firstOnly && results ? results[0] : results
}

module.exports = { query }
