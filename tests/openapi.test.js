const worldql = require("../src/worldql-core")

describe("Test worldql with OpenAPI datasource", () => {
    jest.setTimeout(30000)

    test("get pet with id 1", () => {
        const gqlApis = [
            {
                source: {
                    type: "OPEN_API",
                    url: "http://localhost:8085/api-docs",
                    converter: "OASGRAPH"
                }
            }
        ]

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

        return worldql.buildGqlSchema(gqlApis).then(gqlSchema => {
            worldql.exec(gqlSchema, gqlQuery).then(response => {
                expect(response).toMatchObject({
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
