const { findById, findByIds, findMany, findOne } = require(`./resolvers`)
const link = require(`./link`)

module.exports = {
  findById: findById(),
  findByIds: findByIds(),
  findMany,
  findOne,
  link,
}
