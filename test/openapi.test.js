const GraphQL = require("graphql")
const worldql = require("../src/worldql-core")

describe("Test worldql with OpenAPI datasource", () => {
    jest.setTimeout(30000)

    test("get pet with id 2", () => {
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
            },
            stitches: []
        }

        const gqlQuery = `
        {
            pet(petId: 2) {
                id
                name
                category {
                  id
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
                        pet: {
                            id: 2,
                            name: "Cat 2",
                            category: {
                                id: 2
                            }
                        }
                    }
                })
            })
        })
    })
})
