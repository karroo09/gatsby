const { getNamedType } = require(`graphql`)
const { isPlainObject } = require(`lodash`)

const dropQueryOperators = filter =>
  Object.keys(filter).reduce((acc, key) => {
    const value = filter[key]
    const k = Object.keys(value)[0]
    const v = value[k]
    if (isPlainObject(value) && isPlainObject(v)) {
      acc[key] =
        k === `elemMatch` ? dropQueryOperators(v) : dropQueryOperators(value)
    } else {
      acc[key] = true
    }
    return acc
  }, {})

const getFieldsWithResolvers = (type, filterFields) => {
  const fields = type.getFields()
  return Object.keys(filterFields).reduce((acc, fieldName) => {
    const filterValue = filterFields[fieldName]
    const field = fields[fieldName]
    if (field.resolve) {
      acc[fieldName] = true
    }
    if (filterValue !== true) {
      const fieldsWithResolvers = getFieldsWithResolvers(
        getNamedType(field.type),
        filterValue
      )
      if (Object.keys(fieldsWithResolvers).length) {
        const prev = isObject(acc[fieldName]) ? acc[fieldName] : {}
        acc[fieldName] = mergeObjects(prev || {}, fieldsWithResolvers)
      }
    }
    return acc
  }, {})
}

const isObject = obj => obj && typeof obj === `object`

const getMissingFields = (obj1, obj2) =>
  Object.entries(obj1).reduce((acc, [key, value]) => {
    const compareValue = obj2[key]
    if (compareValue === undefined) {
      acc[key] = value
    } else if (isObject(value) && isObject(compareValue)) {
      const d = getMissingFields(value, compareValue)
      if (Object.keys(d).length) acc[key] = d
    }
    return acc
  }, {})

const getQueryFields = ({ filter, sort, group, distinct }) => {
  const filterFields = filter ? dropQueryOperators(filter) : {}
  const sortFields = (sort && sort.fields) || []
  return merge(
    filterFields,
    ...sortFields.map(pathToObject),
    pathToObject(group),
    pathToObject(distinct)
  )
}

const mergeObjects = (obj1, obj2) =>
  Object.keys(obj2).reduce((acc, key) => {
    const value = obj2[key]
    if (typeof value === `object` && value && acc[key]) {
      acc[key] = mergeObjects(acc[key], value)
    } else {
      acc[key] = value
    }
    return acc
  }, obj1)

const merge = (...objects) => {
  const [first, ...rest] = objects.filter(Boolean)
  return rest.reduce((acc, obj) => mergeObjects(acc, obj), { ...first })
}

const pathToObject = path => {
  if (path && typeof path === `string`) {
    return path.split(`.`).reduceRight((acc, key) => {
      return { [key]: acc }
    }, true)
  }
  return {}
}

module.exports = {
  getQueryFields,
  getFieldsWithResolvers,
  getMissingFields,
  merge,
}
