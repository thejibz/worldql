const worldql = require("./worldql-core")
const { ApolloServer } = require('apollo-server')


/* For introspection
query {
  __schema {
    types {
      name
      fields {
        name
      }
    }
  }
}
*/

async function main() {
  const wqlConf = {
    datasources: {
        basic: {
            url: `${__dirname}/../test/data/file/strings.graphql`,
            type: "FILE",
            resolvers: {
                Query: {
                    listOfStrings: () => {
                        return {
                            list: ["a", "ab", "abc", "abcd"],
                            staticString: "a Static string"
                        }
                    },
                    lengthOfString: (obj, args, context, info) => { return args.aString.length }
                }
            }
        },
    },
    stitches: [
        {
            parentType: "ListOfStrings",
            fieldName: "list2",
            resolver: {
                datasource: "basic",
                query: "listOfStrings",
                forEach: (parent, vars) => parent.list,
                args: {}
            }
        },
    ]
}

  const server = new ApolloServer({
    schema: await worldql.buildGqlSchema(wqlConf),
    playground: true,
    debug: true,
    tracing: true
  })

  server.listen().then(({ url }) => {
    console.log(`🚀 Server ready at ${url}`)
  })
}

main()