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
            gps: {
                wsdlUrl: "http://localhost:8086/wsdl?wsdl",
                type: "SOAP"
            }
        }
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