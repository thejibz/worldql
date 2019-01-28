const GraphQL = require("graphql")
const worldql = require("../src/worldql-core")

describe("Test worldql with OpenAPI datasource", () => {
    jest.setTimeout(30000)

    test("get pet with id 1", () => {
        const wqlConf = {
            sources: {
                petstore: {
                    url: "http://localhost:8080/api/swagger.json",
                    type: "OPEN_API",
                    preferedScheme: "http"
                }
            },
            stitches: []
        }

        const gqlQuery = `
        {
            viewerApiKey(apiKey:"qsfqsdfqsdqfs") {
                aPet(petId:0){
                id
                name
                    category {
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
            }).then(gqlResponse => {
                expect(gqlResponse).toMatchObject({
                    data: {
                        viewerApiKey: {
                            aPet: {
                                id: 0,
                                name: "doggie",
                                category: {
                                    id: 6
                                }
                            }
                        }
                    }
                })
            })
        })
    })
})
