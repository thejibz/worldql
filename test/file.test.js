const GraphQL = require("graphql")
const worldql = require("../src/worldql-core")

describe("Test worldql with FILE datasource", () => {
    jest.setTimeout(30000)

    test("get a list of strings", () => {
        const wqlConf = {
            datasources: {
                basic: {
                    url: `${__dirname}/data/file/strings.graphql`,
                    type: "FILE",
                    resolvers: {
                        Query: {
                            listOfStrings: () => { return { list: ["a", "ab", "abc", "abcd"] } },
                            lengthOfString: (obj, args, context, info) => { return args.aString.length }
                        }
                    }
                },
            },
        }

        const gqlQuery = `
        {
            listOfStrings {
                list
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
                        "listOfStrings": {
                            "list": [
                                "a",
                                "ab",
                                "abc",
                                "abcd"
                            ]
                        }
                    }
                })
            })
        })
    })

    test("get the length of a string", () => {
        const wqlConf = {
            datasources: {
                basic: {
                    url: `${__dirname}/data/file/strings.graphql`,
                    type: "FILE",
                    resolvers: {
                        Query: {
                            listOfStrings: () => { return { list: ["a", "ab", "abc", "abcd"] } },
                            lengthOfString: (obj, args, context, info) => { return args.aString.length }
                        }
                    }
                },
            }
        }

        const gqlQuery = `
        {
            lengthOfString (aString: "abcd")            
        }`

        return worldql.buildGqlSchema(wqlConf).then(gqlSchema => {
            return GraphQL.graphql({
                schema: gqlSchema,
                source: gqlQuery,
                // variableValues: gqlVariables
            }).then(gqlResponse => {
                expect(gqlResponse).toMatchObject({
                    data: { lengthOfString: 4 }
                })
            })
        })
    })
})
