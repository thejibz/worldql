const GraphQL = require("graphql")
const worldql = require("../src/worldql-core")

describe("Test the worldql", () => {
    jest.setTimeout(30000)

    test("stitch: mysql => openapi", () => {
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
                    fieldType: "viewerApiKey",
                    resolver: {
                        source: "petstore",
                        query: "viewerApiKey",
                        addQueryParams: true,
                        params: {
                            static: {},
                            fromParent: { apiKey: (parent) => parent.first_name },
                            fromVariables: {},
                        }
                    }
                },
            ]
        }

        const gqlQuery = `
        {
            employees(emp_no: 10005) {
              gender
              first_name
              emp_no
              petOfEmployee {
                aPet(petId: 1) {
                  name
                  id
                }
              }
            }
          }`

        return worldql.buildGqlSchema(wqlConf).then(gqlSchema => {
            return GraphQL.graphql({
                schema: gqlSchema,
                source: gqlQuery,
                // variableValues: gqlVariables
                contextValue: {}
            }).then(gqlResponse => {
                expect(gqlResponse).toMatchObject({
                    data: {
                        employees: [
                            {
                                gender: "M",
                                first_name: "Kyoichi",
                                emp_no: 10005,
                                petOfEmployee: {
                                    aPet: {
                                        name: "doggie",
                                        id: 0
                                    }
                                }
                            }
                        ]
                    }
                })
            })
        })
    })
})
