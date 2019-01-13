const {
  DirectiveLocation,
  GraphQLDirective,
  GraphQLString,
} = require(`graphql`)
const { SchemaDirectiveVisitor } = require(`graphql-tools`)

const { link } = require(`../resolvers`)

const LinkNodeDirective = new GraphQLDirective({
  name: `link`,
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    by: { type: GraphQLString, defaultValue: `id` },
    from: { type: GraphQLString },
  },
})

class LinkNodeDirectiveVisitor extends SchemaDirectiveVisitor {
  visitFieldDefinition(field) {
    const { by, from } = this.args
    field.resolve = link({ by, from })
  }
}

module.exports = [LinkNodeDirective, { link: LinkNodeDirectiveVisitor }]
