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
            // books: {
            //     url: "http://localhost:8090",
            //     type: "GRAPHQL",
            // },
            company: {
                type: 'ELASTICSEARCH',
                url: 'http://localhost:9200',
                graphqlTypeName: "company",
                elasticIndex: 'companydatabase',
                elasticType: 'employees',
                pluralFields: ['skills', 'languages'],
                apiVersion: '5.6',
            },
            employees: {
                type: "MYSQL",
                host: "localhost",
                port: "3306",
                user: "root",
                password: "secret",
                database: "employees",
                mysqlTableName: "employees",
                graphqlTypeName: "employeesT",
            },
        },
        stitches: [
            {
                parentType: "employeesT",
                fieldName: "petOfEmployee",
                fieldType: "viewerApiKey",
                resolver: {
                    source: "petstore",
                    query: "viewerApiKey",
                    addQueryParams: true,
                    params: {
                        static: {},
                        fromParent: {apiKey: "first_name",},
                        fromVariables: {
                            
                        },
                    }
                }
            },
        ]
    }


    const server = new ApolloServer({
        schema: await worldql.buildGqlSchema(wqlConf),
        playground: true
    })

    server.listen().then(({ url }) => {
        console.log(`🚀 Server ready at ${url}`)
    })
}

main()