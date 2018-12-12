const GraphQL = require("graphql")
const worldql = require("../src/worldql-core")

describe("Test the worldql for elasticsearch", () => {
    jest.setTimeout(30000)

    test("get all employees of age 33", () => {
        const wqlConf = {
            sources: {
                company: {
                    type: 'ELASTICSEARCH',
                    url: 'http://localhost:9200',
                    graphqlTypeName: "company",
                    elasticIndex: 'companydatabase',
                    elasticType: 'employees',
                    pluralFields: ['skills', 'languages'],
                    apiVersion: '5.6',
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
