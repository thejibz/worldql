const GraphQL = require("graphql")
const worldql = require("../src/worldql-core")

describe("Test the worldql", () => {
    jest.setTimeout(30000)

    test("mega stitch", () => {
        const wqlConf = {
            datasources: {
                petstore: {
                    url: "http://localhost:8080/api/swagger.json",
                    type: "OPEN_API",
                    oasGraphConf: {
                        viewer: false,
                        baseUrl: "http://localhost:8080/api"
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
                        //debug: ['ComQueryPacket'],
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
                    resolver: {
                        datasource: "petstore",
                        query: "pet",
                        args: { petId: (parent) => parent.emp_no % 10 }
                    }
                },
                {
                    parentType: "employeesT",
                    fieldName: "currentDept",
                    resolver: {
                        datasource: "employees",
                        query: "current_dept_emp",
                        args: { emp_no: (parent) => parent.emp_no }
                    }
                },
                {
                    parentType: "current_dept_empT",
                    fieldName: "currentSalary",
                    resolver: {
                        datasource: "employees",
                        query: "salaries",
                        args: {
                            emp_no: (parent, vars) => vars.emp_id,
                            to_date: (parent, vars) => parent.to_date
                        }
                    }
                },
                {
                    parentType: "salariesT",
                    fieldName: "esSalary",
                    resolver: {
                        datasource: "company",
                        query: "company",
                        args: {
                            q: (parent, vars) => `Employee.Age=${parent.salary % 50}`,
                        }
                    }
                }
            ]
        }

        const gqlQuery = `
        query($emp_id: Int!){
            employees(emp_no: $emp_id) {
                gender
                first_name
                emp_no
                currentDept {
                    dept_no
                    emp_no
                    to_date
                    currentSalary {
                    salary
                    esSalary {
                        hits {
                        _source {
                            Salary
                        }
                        }
                    }
                    }
                }
                petOfEmployee {
                    name
                    id
                }
            }
        }`

        const gqlVariables = {
            "emp_id": 10005,
            "pet_id": 2
        }

        return worldql.buildGqlSchema(wqlConf).then(gqlSchema => {
            return GraphQL.graphql({
                schema: gqlSchema,
                source: gqlQuery,
                variableValues: gqlVariables,
                contextValue: {}
            }).then(gqlResponse => {
                expect(gqlResponse).toMatchObject({
                    "data": {
                        "employees": [
                            {
                                "gender": "M",
                                "first_name": "Kyoichi",
                                "emp_no": 10005,
                                "currentDept": [
                                    {
                                        "dept_no": "d003",
                                        "emp_no": 10005,
                                        "to_date": "9998-12-31T23:00:00.000Z",
                                        "currentSalary": [
                                            {
                                                "salary": 94692,
                                                "esSalary": {
                                                    "hits": [
                                                        {
                                                            "_source": {
                                                                "Salary": expect.any(Number),
                                                            }
                                                        },
                                                        {
                                                            "_source": {
                                                                "Salary": expect.any(Number),
                                                            }
                                                        },
                                                        {
                                                            "_source": {
                                                                "Salary": expect.any(Number)
                                                            }
                                                        },
                                                        {
                                                            "_source": {
                                                                "Salary": expect.any(Number)
                                                            }
                                                        },
                                                        {
                                                            "_source": {
                                                                "Salary": expect.any(Number)
                                                            }
                                                        },
                                                        {
                                                            "_source": {
                                                                "Salary": expect.any(Number)
                                                            }
                                                        },
                                                        {
                                                            "_source": {
                                                                "Salary": expect.any(Number)
                                                            }
                                                        },
                                                        {
                                                            "_source": {
                                                                "Salary": expect.any(Number)
                                                            }
                                                        },
                                                        {
                                                            "_source": {
                                                                "Salary": expect.any(Number)
                                                            }
                                                        },
                                                        {
                                                            "_source": {
                                                                "Salary": expect.any(Number),
                                                            }
                                                        }
                                                    ]
                                                }
                                            }
                                        ]
                                    }
                                ],
                                "petOfEmployee": {
                                    "name": "Dog 2",
                                    "id": 5
                                }
                            }
                        ]
                    }
                })
            })
        })
    })

    test("stitch with no args", () => {
        const wqlConf = {
            datasources: {
                petstore: {
                    url: "http://localhost:8080/api/swagger.json",
                    type: "OPEN_API",
                    oasGraphConf: {
                        viewer: false,
                        baseUrl: "http://localhost:8085",
                    }
                },
                basic: {
                    url: `${__dirname}/../test/data/file/strings.graphql`,
                    type: "FILE",
                    resolvers: {
                        Query: {
                            listOfStrings: () => { return { list: ["a", "ab", "abc", "abcd"] } },
                            lengthOfString: (obj, args, context, info) => { return args.aString.length }
                        }
                    }
                },
            },
            stitches: [
                {
                    parentType: "Pet",
                    fieldName: "listStrings",
                    resolver: {
                        datasource: "basic",
                        query: "listOfStrings",
                    }
                },
            ]
        }

        const gqlQuery = `
        {
            pet(petId: 1) {
                name
                listStrings {
                    list
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
                    "data": {
                        "pet": {
                            "name": null,
                            "listStrings": {
                                "list": [
                                    "a",
                                    "ab",
                                    "abc",
                                    "abcd"
                                ]
                            }
                        }
                    }
                })
            })
        })
    })

    test("error when parent object doesn't have a required field for stitching", () => {
        const wqlConf = {
            datasources: {
                petstore: {
                    url: "http://localhost:8080/api/swagger.json",
                    type: "OPEN_API",
                    oasGraphConf: {
                        viewer: false,
                        baseUrl: "http://localhost:8085",
                    }
                },
                employees: {
                    type: "MYSQL",
                    mysqlConfig: {
                        //debug: ['ComQueryPacket'],
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
                    resolver: {
                        datasource: "petstore",
                        query: "pet",
                        args: { petId: (parent) => parent.DONT_EXIST }
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
                    name
                    id
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
                    "errors": [
                        {
                            message: `Unexpected error value: "ReferenceError: zealit: property 'DONT_EXIST' is nonexistent. Check that the parent object fetch it and that there is no typo in the stitching configuration."`
                        }
                    ]
                })
            })
        })
    })

    test("error when query variables doesn't have a required field for stitching", () => {
        const wqlConf = {
            datasources: {
                petstore: {
                    url: "http://localhost:8080/api/swagger.json",
                    type: "OPEN_API",
                    oasGraphConf: {
                        viewer: false,
                        baseUrl: "http://localhost:8085",
                    }
                },
                employees: {
                    type: "MYSQL",
                    mysqlConfig: {
                        //debug: ['ComQueryPacket'],
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
                    resolver: {
                        datasource: "petstore",
                        query: "pet",
                        args: { petId: (parent, vars) => vars.DONT_EXIST }
                    }
                },
            ]
        }

        const gqlQuery = `
        query {
            employees(emp_no: 10005) {
                gender
                first_name
                emp_no
                petOfEmployee {
                    name
                    id
                }
            }
        }`

        const gqlVariables = { nothing: "here" }

        return worldql.buildGqlSchema(wqlConf).then(gqlSchema => {
            return GraphQL.graphql({
                schema: gqlSchema,
                source: gqlQuery,
                variableValues: gqlVariables,
                contextValue: {}
            }).then(gqlResponse => {
                expect(gqlResponse).toMatchObject({
                    errors: [
                        {
                            message: `Unexpected error value: "ReferenceError: zealit: property 'DONT_EXIST' is nonexistent. Check that it is in the query's variables and that there is no typo in the stitching configuration."`
                        }
                    ]
                })
            })
        })
    })
})
