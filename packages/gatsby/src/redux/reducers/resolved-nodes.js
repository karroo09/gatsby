module.exports = (state = null, action) => {
  switch (action.type) {
    case `DELETE_CACHE`:
    case `CREATE_NODE`:
    case `DELETE_NODE`:
    case `DELETE_NODES`: {
      if (state) {
        state.clear()
      }
      return state
    }

    case `SET_RESOLVED_NODES`: {
      if (state) {
        const { typeName, fields, nodes } = action.payload
        state.set(typeName, fields, nodes)
      }
      return state
    }

    case `SET_RESOLVED_NODES_CACHE`:
      return action.payload

    default:
      return state
  }
}
