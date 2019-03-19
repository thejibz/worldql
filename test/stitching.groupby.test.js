const GraphQL = require("graphql")
const worldql = require("../src/worldql-core")

describe("GroupBy in stitching", () => {
    jest.setTimeout(30000)

    test("groupby on a list of string", () => {
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
            stitches: [
                {
                    parentType: "ListOfStrings",
                    fieldName: "length",
                    resolver: {
                        datasource: "basic",
                        query: "lengthOfString",
                        groupBy: (parent, vars) => parent.list,
                        args: {
                            aString: (parent, vars, groupValue) => groupValue
                        }
                    }
                },
            ]
        }

        const gqlQuery = `
        {
            listOfStrings {
              list
              length
            }
        }`

        return worldql.buildGqlSchema(wqlConf).then(gqlSchema => {
            return GraphQL.graphql({
                schema: gqlSchema,
                source: gqlQuery,
                //variableValues: gqlVariables,
                contextValue: {}
            }).then(gqlResponse => {
                expect(gqlResponse).toMatchObject({
                    "data": {
                        "listOfStrings": {
                            "list": [
                                "a",
                                "ab",
                                "abc",
                                "abcd"
                            ],
                            "length": [
                                1,
                                2,
                                3,
                                4
                            ]
                        }
                    }
                })
            })
        })
    })

    test("groupby on array of objects", () => {
        const wqlConf = {
            datasources: {
                character: {
                    url: `${__dirname}/data/file/character.graphql`,
                    type: "FILE",
                    resolvers: {
                        Query: {
                            listOfCharacters: () => {
                                return {
                                    list: [{
                                        name: "Robert",
                                        age: 32,
                                        weight: 100,
                                        height: 180
                                    }, {
                                        name: "Katty",
                                        age: 22,
                                        weight: 60,
                                        height: 170
                                    }, {
                                        name: "Alfred",
                                        age: 55,
                                        weight: 85,
                                        height: 190
                                    }]
                                }
                            },
                            bmi: (obj, args, context, info) => { return args.height / args.weight }
                        }
                    }
                },
            },
            stitches: [
                {
                    parentType: "ListOfCharacters",
                    fieldName: "bmi",
                    resolver: {
                        datasource: "character",
                        query: "bmi",
                        groupBy: (parent, vars) => parent.list,
                        args: {
                            weight: (parent, vars, groupValue) => groupValue.weight,
                            height: (parent, vars, groupValue) => groupValue.height
                        }
                    }
                },
            ]
        }

        const gqlQuery = `
        {
            listOfCharacters {
                list {
                    name
                    weight
                    height
                }

                bmi
            }
        }`

        return worldql.buildGqlSchema(wqlConf).then(gqlSchema => {
            return GraphQL.graphql({
                schema: gqlSchema,
                source: gqlQuery,
                //variableValues: gqlVariables,
                contextValue: {}
            }).then(gqlResponse => {
                expect(gqlResponse).toMatchObject({
                    "data": {
                        "listOfCharacters": {
                            "list": [
                                {
                                    "name": "Robert",
                                    "height": 180,
                                    "weight": 100
                                },
                                {
                                    "name": "Katty",
                                    "height": 170,
                                    "weight": 60
                                },
                                {
                                    "name": "Alfred",
                                    "height": 190,
                                    "weight": 85
                                }
                            ],
                            "bmi": [
                                1.8,
                                2.8333333333333335,
                                2.235294117647059
                            ]
                        }
                    }
                })
            })
        })
    })

    test("error when groupBy field doesn't resolve to an array", () => {
        const wqlConf = {
            datasources: {
                basic: {
                    url: `${__dirname}/data/file/strings.graphql`,
                    type: "FILE",
                    resolvers: {
                        Query: {
                            listOfStrings: () => {
                                return {
                                    list: ["a", "ab", "abc", "abcd"],
                                    staticField: "Toto"
                                }
                            },
                            lengthOfString: (obj, args, context, info) => { return args.aString.length }
                        }
                    }
                },
            },
            stitches: [
                {
                    parentType: "ListOfStrings",
                    fieldName: "length",
                    resolver: {
                        datasource: "basic",
                        query: "lengthOfString",
                        groupBy: (parent, vars) => parent.staticField,
                        args: {
                            aString: (parent, vars, groupValue) => groupValue
                        }
                    }
                },
            ]
        }

        const gqlQuery = `
    {
        listOfStrings {
          list
          length
        }
    }`

        return worldql.buildGqlSchema(wqlConf).then(gqlSchema => {
            return GraphQL.graphql({
                schema: gqlSchema,
                source: gqlQuery,
                //variableValues: gqlVariables,
                contextValue: {}
            }).then(gqlResponse => {
                console.log(gqlResponse)
                expect(gqlResponse).toMatchObject({
                    errors:
                        [{
                            message: `groupBy in stitch "length" doesn't resolve to an array."`
                        }],
                })
            })
        })
    })
})
