const { backend } = require(`../../nodes`)

module.exports = () => {
  if (backend === `loki`) {
    const { createNodesDb } = require(`../../loki`)
    beforeAll(() => {
      createNodesDb()
    })
  }
}
