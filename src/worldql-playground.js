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
        stitches: []
    }
    //     {
    //         source: {
    //             type: "OPEN_API",
    //             url: "http://localhost:8085/api-docs",
    //             converter: "OASGRAPH"
    //         }
    //     },
    //     {
    //         source: {
    //             url: "http://localhost:8090",
    //             type: "GRAPHQL",
    //         },
    //     },
    //     {
    //         source: {
    //             url: 'http://localhost:9200',
    //             type: 'ELASTICSEARCH',
    //             params: {
    //                 graphqlTypeName: "companydatabase",
    //                 elasticIndex: 'companydatabase',
    //                 elasticType: 'employees',
    //                 pluralFields: ['skills', 'languages'],
    //                 apiVersion: '5.6',
    //             },
    //         },
    //     },
    //     {
    //         source: {
    //             type: "MYSQL",
    //             host: "localhost",
    //             port: "3306",
    //             user: "root",
    //             password: "secret",
    //             database: "employees",
    //             mysqlTableName: "employees",
    //             graphqlTypeName: "employeesT",
    //         },
    //         links: [
    //             {
    //                 inType: "employeesT",

    //                 // {
    //                 //     parentType: "employeesT",
    //                 //     fieldName: "field_name",
    //                 //     fieldType: "field_type (can be infered)",
    //                 //     resolver: {
    //                 //         schemaName: "remote schema",
    //                 //         queryName: "my query",
    //                 //         addSourceParams: true,
    //                 //         params: {
    //                 //             static: {},
    //                 //             fromParent: {},
    //                 //             fromVariables: {},
    //                 //         }
    //                 //     }
    //                 // }

    //                 on: {
    //                     field: {
    //                         name: "elastic",
    //                         params:"(q: String)",
    //                         type: "EsSearchOutput",
    //                         schemaUrl: "http://localhost:9200",
    //                         query: {
    //                             name: "companydatabase",
    //                             params: {
    //                                 static: {
    //                                    //q: "Age:33"
    //                                 },
    //                             }
    //                         }
    //                     }
    //                 }
    //             },
    //         ]
    //     },
    // ]

    const server = new ApolloServer({
        schema: await worldql.buildGqlSchema(wqlConf),
        playground: true
    })

    server.listen().then(({ url }) => {
        console.log(`🚀 Server ready at ${url}`)
    })
}

main()