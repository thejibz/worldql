const worldql = require("../src/worldql-core")

describe("Test worldql with MySQL datasource", () => {
    jest.setTimeout(30000)

    test("get all fields for employee n°10005", () => {
        const gqlApis = [
            {
                source: {
                    type: "MYSQL",
                    host: "localhost",
                    port: "3306",
                    user: "root",
                    password: "secret",
                    database: "employees",
                    mysqlTableName: "employees",
                    graphqlTypeName:  "employeesT",
                }
            }
        ]

        const gqlQuery = `
        {
            employees(emp_no: 10005) {
              emp_no
              first_name
              last_name
              gender
              birth_date
              hire_date
            }
        }`

        return worldql.buildGqlSchema(gqlApis).then(gqlSchema => {
            return worldql.exec(gqlSchema, gqlQuery).then(response => {
                expect(response).toMatchObject({
                    data: {
                        employees: [{
                            emp_no: 10005,
                            first_name: "Kyoichi",
                            last_name: "Maliniak",
                            gender: "M",
                            birth_date: "1955-01-20T23:00:00.000Z",
                            hire_date: "1989-09-11T22:00:00.000Z"
                        }]
                    }
                })
            })
        })
    })
})
