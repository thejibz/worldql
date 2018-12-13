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
        sources: {
            petstore: {
                url: "http://localhost:8085/api-docs",
                type: "OPEN_API",
                converter: "OASGRAPH"
            },
            books: {
                url: "http://localhost:8090",
                type: "GRAPHQL",
            },
        },
        stitches: [

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