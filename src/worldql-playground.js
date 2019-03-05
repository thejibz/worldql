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
      petstore: {
        url: "http://localhost:8080/api/swagger.json",
        type: "OPEN_API",
        oasGraphConf: {
          viewer: false,
          baseUrl: "http://localhost:8080/api",
        }
      },
    },
    stitches: []
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