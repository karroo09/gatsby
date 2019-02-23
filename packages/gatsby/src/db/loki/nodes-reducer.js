const reducer = (state = null, action) => {
  switch (action.type) {
    case `SET_DB_NODES`:
      return action.payload

    case `DELETE_CACHE`: {
      if (state) {
        const collection = state.getCollection(`nodes`)
        collection.clear()
        // Do we have to clear the dynamic views?
        // what does state.deleteDatabase do?
      }
      return state
    }

    case `CREATE_NODE`: {
      const node = action.payload
      if (state && node) {
        const collection = state.getCollection(`nodes`)

        const { oldNode } = action
        if (oldNode) {
          collection.remove(oldNode)
        }

        const { type } = node.internal
        collection.insert(node)

        if (!collection.getDynamicView(type)) {
          const view = collection.addDynamicView(type, {
            // https://github.com/techfort/LokiJS/wiki/Indexing-and-Query-Performance#dynamic-view-pipelines
            // persistent: false,
            // sortPriority: `passive`,
          })
          view.applyFind({ [`internal.type`]: type })
        }
      }
      return state
    }

    case `ADD_FIELD_TO_NODE`:
    case `ADD_CHILD_NODE_TO_PARENT_NODE`: {
      const node = action.payload
      if (state && node) {
        const collection = state.getCollection(`nodes`)
        collection.update(node)
      }
      return state
    }

    case `DELETE_NODE`: {
      const node = action.payload
      if (state && node) {
        const collection = state.getCollection(`nodes`)
        try {
          collection.remove(node)
        } catch (e) {
          /* Loki really shouldn't throw if the node is not in the db */
        }
      }
      return state
    }

    case `DELETE_NODES`: {
      const nodes = action.payload
      if (state && nodes) {
        const collection = state.getCollection(`nodes`)
        nodes.forEach(node => collection.remove(node))
      }
      return state
    }

    default:
      return state
  }
}

module.exports = reducer
