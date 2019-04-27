const mitt = require(`mitt`)
const { createStore, combineReducers, applyMiddleware } = require(`redux`)
const reducers = require(`./reducers`)
const { loadState, saveState } = require(`./persist`)

// Create event emitter for actions
const emitter = mitt()

const multiMiddleware = store => next => action => {
  if (Array.isArray(action)) {
    return action.filter(Boolean).map(store.dispatch)
  } else {
    return next(action)
  }
}

const configureStore = initialState =>
  createStore(
    combineReducers(reducers),
    initialState,
    applyMiddleware(multiMiddleware)
  )

const initialState = loadState()
const store = configureStore(initialState)

store.subscribe(() => {
  const state = store.getState()
  const { lastAction, program } = state
  if (program.status === `BOOTSTRAP_FINISHED`) {
    saveState(state)
  }
  // Re-emit actions as events
  emitter.emit(lastAction.type, lastAction)
})

module.exports = {
  emitter,
  store,
  configureStore,
}
