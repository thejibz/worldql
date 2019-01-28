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
                url: "http://localhost:8080/api/swagger.json",
                type: "OPEN_API",
                oasGraphConf: {
                    viewer: false,
                    preferedScheme: "http",
                }
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
                mysqlConfig: {
                    host: "localhost",
                    port: "3306",
                    user: "root",
                    password: "secret",
                    database: "employees",
                }
            },
        },
        stitches: [
            {
                parentType: "employeesT",
                fieldName: "petOfEmployee",
                fieldType: "pet",
                resolver: {
                    source: "petstore",
                    query: "pet",
                    params: {
                        static: {},
                        fromParent: { petId: (parent) => parent.emp_no%10 },
                        fromVariables: {},
                    }
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