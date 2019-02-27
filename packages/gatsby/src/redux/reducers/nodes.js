module.exports = (state = { db: null, path: `` }, action) => {
  switch (action.type) {
    case `SET_NODES_DB`:
      return action.payload

    case `DELETE_CACHE`: {
      if (state.db) {
        state.db.clear()
      }
      return state
    }

    case `CREATE_NODE`: {
      const node = action.payload
      if (state.db && node) {
        state.db.create(action.payload)
      }
      return state
    }

    case `ADD_FIELD_TO_NODE`:
    case `ADD_CHILD_NODE_TO_PARENT_NODE`: {
      const node = action.payload
      if (state.db && node) {
        state.db.update(action.payload)
      }
      return state
    }

    case `DELETE_NODE`: {
      const node = action.payload
      if (state.db && node) {
        state.db.delete(action.payload.id)
      }
      return state
    }

    case `DELETE_NODES`: {
      const ids = action.payload
      if (state.db && ids) {
        state.db.deleteMany(ids)
      }
      return state
    }

    default:
      return state
  }
}
