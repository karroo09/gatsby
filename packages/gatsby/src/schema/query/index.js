const {
  dropQueryOperators,
  equals,
  getListQueryOperator,
  getQueryOperators,
  oneOf,
  query: queryWithSift,
} = require(`./sift`)
const { query: queryWithLoki } = require(`./loki`)
const { backend } = require(`../../db/nodes`)

const query = (queryNodes, queryArgs, firstResultOnly, lokiCollectionType) =>
  backend === `loki` && lokiCollectionType != null
    ? queryWithLoki(lokiCollectionType, queryArgs, firstResultOnly)
    : queryWithSift(queryNodes, queryArgs, firstResultOnly)

module.exports = {
  dropQueryOperators,
  equals,
  getListQueryOperator,
  getQueryOperators,
  oneOf,
  query,
}
