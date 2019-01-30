const GraphQL = require("graphql")
const worldql = require("../src/worldql-core")

describe("Test the worldql for elasticsearch", () => {
    jest.setTimeout(30000)

    test("get all employees of age 33", () => {
        const wqlConf = {
            datasources: {
                company: {
                    type: 'ELASTICSEARCH',
                    esClientConf: {
                        host: 'http://localhost:9200',
                        apiVersion: '5.6',
                    },
                    graphqlTypeName: "company",
                    elasticIndex: 'companydatabase',
                    elasticType: 'employees',
                    pluralFields: ['skills', 'languages'],
                }
            },
            stitches: []
        }

        const gqlQuery = `
        {
            company(q:"Age:33"){
              count
              hits {
                _source {
                  Age
                  Designation
                  Address
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
                        company: {
                            count: expect.any(Number),
                            hits: expect.any(Array)
                        }
                    }
                })
            })
        })
    })
})
