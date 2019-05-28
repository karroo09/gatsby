const { createNodesDb } = require(`../..`)

module.exports = () => {
  beforeAll(async () => {
    await createNodesDb()
  })
}
