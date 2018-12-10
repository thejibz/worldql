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
          url: 'http://localhost:9200',
          type: 'ELASTICSEARCH',
          params: {
            elasticIndex: 'companydatabase',
            elasticType: 'employees',
            pluralFields: ['skills', 'languages'],
            apiVersion: '5.6',
          },
        },
        source: {
            type: "MYSQL",
            host: "localhost",
            port: "3306",
            user: "root",
            password: "secret",
            database: "employees",
            mysqlTableName: "employees",
            graphqlTypeName:  "employeesT",
        },
        source: {
            type: "OPEN_API",
            url: "http://localhost:8085/api-docs",
            converter: "OASGRAPH"
        },
    },
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