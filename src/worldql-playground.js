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

const gqlApis = [
    {
        source: {
            url: "http://localhost:9200",
            type: "ELASTICSEARCH",
            params: {
                elasticIndex: "companydatabase",
                elasticType: "employees",
                pluralFields: ['skills', 'languages'],
                apiVersion: "5.6"
            }
        }
    }
]

async function main() {
    const server = new ApolloServer({
        schema: await worldql.buildGqlSchema(gqlApis),
        playground: true
    })

    server.listen().then(({ url }) => {
        console.log(`🚀 Server ready at ${url}`)
    })
}

main()