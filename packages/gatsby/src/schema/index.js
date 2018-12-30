// const { mergeSchemas } = require(`graphql-tools`)
// const tracer = require(`opentracing`).globalTracer()

const { buildSchema, updateSchema } = require(`./schema`)
const { store } = require(`../redux`)

module.exports = async ({ parentSpan, update }) => {
  // const spanArgs = parentSpan ? { childOf: parentSpan } : {}
  // const span = tracer.startSpan(`build schema`, spanArgs)

  // const thirdPartySchemas = store.getState().thirdPartySchemas || []
  const gatsbySchema = update ? await updateSchema() : await buildSchema()

  // span.finish()

  // TODO: Investigate alternatives to `graphql-tools`'s `mergeSchemas()`,
  // which seems to wrap every field resolver twice!!
  //   - which is why we need `fieldNodes` argument in `get-nodes-for-query`
  //   - and it makes the link resolvers not work (they are not on the fields)
  //     instead we have (i) one resolver wrapper that adds info.mergeInfo,
  //     and then the defaultMergedResolver
  //  - also: merge-schemas does not seem to copy over the `GraphQLDirective`s.
  // Result: everything breaks.
  // FIXME: If we have to add visitors here, then don't add them in getSchema()
  // TODO: Best would be to get rid of updateSchema(), and just merge once.
  // OR: instead of mergeSchemas, just add the thirdparty schemas on a field
  // on schemaComposer.Query before getSchema() -- which would work, except graphql
  // checks if `isDeprecated` is present on the field and throws if it is.
  // The official position is that it is not supported to add fields to the schema
  // that you get with getFields() because those are a runtime representation.
  // OTOF it *might* work, if there was a `_fields` present instead of `_gqfields`
  // const schema = mergeSchemas({
  //   schemas: [gatsbySchema, ...thirdPartySchemas],
  // })
  const schema = gatsbySchema

  store.dispatch({
    type: `SET_SCHEMA`,
    payload: schema,
  })
}
