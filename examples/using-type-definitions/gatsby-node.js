exports.addTypeDefs = ({ addTypeDefs }) => {
  const typeDefs = `
    type AuthorJson implements Node {
      name: String!
      email: String!
      picture: File @link(by: "relativePath")
      posts: [BlogJson] @link(by: "authors.email", from: "email")
    }

    type BlogJson implements Node {
      title: String!
      authors: [AuthorJson] @link(by: "email")
      text: String
      date: Date @dateformat(formatString: "yyyy/MM/dd")
    }
  `
  addTypeDefs(typeDefs)
}
