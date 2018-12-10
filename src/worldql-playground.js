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
    const gqlApis = [
        {
            source: {
                type: "OPEN_API",
                url: "http://localhost:8085/api-docs",
                converter: "OASGRAPH"
            }
        },
        {
            source: {
                url: "http://localhost:8090",
                type: "GRAPHQL",
            },
        },
        {
            source: {
                url: 'http://localhost:9200',
                type: 'ELASTICSEARCH',
                params: {
                    graphqlTypeName: "companydatabase",
                    elasticIndex: 'companydatabase',
                    elasticType: 'employees',
                    pluralFields: ['skills', 'languages'],
                    apiVersion: '5.6',
                },
            },
        },
        {
            source: {
                type: "MYSQL",
                host: "localhost",
                port: "3306",
                user: "root",
                password: "secret",
                database: "employees",
                mysqlTableName: "employees",
                graphqlTypeName: "employeesT",
            },
            links: [
                {
                    inType: "employeesT",
                    on: {
                        field: {
                            name: "companydatabase",
                            type: "EsSearchOutput",
                            schemaUrl: "http://localhost:9200",
                            query: {
                                name: "companydatabase",
                                params: {
                                    static: {
                                        q: "Age:33"
                                    },
                                    parent: [
                                        // {
                                        //     q:"last_name",
                                        //     hits:"emp_no"
                                        // }
                                    ],
                                    variables: {}
                                }
                            }
                        }
                    }
                },
                {
                    inType: "EsSearchOutput",
                    on: {
                        field: {
                            name: "petstore",
                            type: "viewerApiKey",
                            schemaUrl: "http://localhost:8085/api-docs",
                            query: {
                                name: "viewerApiKey",
                                params: {
                                    static: {
                                        apiKey: "qsdfqsdfsf"
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    inType: "aPet",
                    on: {
                        field: {
                            name: "books",
                            type: "[Book]",
                            schemaUrl: "http://localhost:8090",
                            query: {
                                name: "books"
                            }
                        }
                    }
                }
            ]
        },
    ]

    const server = new ApolloServer({
        schema: await worldql.buildGqlSchema(gqlApis),
        playground: true
    })

    server.listen().then(({ url }) => {
        console.log(`🚀 Server ready at ${url}`)
    })
}

main()