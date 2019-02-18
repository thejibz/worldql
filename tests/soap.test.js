const GraphQL = require("graphql")
const worldql = require("../src/worldql-core")

describe("Test the worldql for graphql", () => {
    jest.setTimeout(30000)

    test("get all books", () => {
        const wqlConf = {
            datasources: {
                splitter: {
                    wsdlUrlOrOptions: "http://localhost:8086/wsdl?wsdl",
                    type: "SOAP"
                }
            }
        }

        const gqlQuery = `
        mutation{
            MessageSplitter(message:"lol:lel", splitter:":")
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
                        "MessageSplitter": [
                            "lol",
                            "lel"
                        ]
                    },
                })
            })
        })
    })
})
