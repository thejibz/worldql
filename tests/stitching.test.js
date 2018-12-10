const worldql = require("../src/worldql-core")

describe("Test the worldql", () => {
    jest.setTimeout(30000)

    test("stitch: mysql => elastic => openapi => graphql", () => {
        const gqlApis = [
            {
                source: {
                    type: "OPEN_API",
                    url: "http://localhost:8085/api-docs",
                }
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
                    url: "http://localhost:8090",
                    type: "GRAPHQL",
                }
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
                                params: "",
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
                                params: "",
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
                                params: "",
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

        const gqlQuery = `
        {
            employees(emp_no: 10005) {
              first_name
              companydatabase {
                count
                petstore {
                  aPet(petId: 1) {
                    name
                    books{
                        title
                        author
                    }
                  }
                }
              }
            }
          }`

        return worldql.buildGqlSchema(gqlApis).then(gqlSchema => {
            return worldql.exec(gqlSchema, gqlQuery).then(response => {
                expect(response).toMatchObject({
                    data: {
                        employees: [
                            {
                                first_name: "Kyoichi",
                                companydatabase: {
                                    count: 2185,
                                    petstore: {
                                        aPet: {
                                            name: "doggie",
                                            books: [
                                                {
                                                    title: "Harry Potter and the Chamber of Secrets",
                                                    author: "J.K. Rowling"
                                                },
                                                {
                                                    title: "Jurassic Park",
                                                    author: "Michael Crichton"
                                                }
                                            ]
                                        }
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
