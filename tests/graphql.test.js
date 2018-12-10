const worldql = require("../src/worldql-core")

describe("Test the worldql for graphql", () => {
    jest.setTimeout(30000)

    test("get all books", () => {
        const gqlApis = [
            {
                source: {
                    url: "http://localhost:8090",
                    type: "GRAPHQL",
                }
            }
        ]

        const gqlQuery = `
        {
            books {
              title
              author
            }
        }`

        return worldql.buildGqlSchema(gqlApis).then(gqlSchema => {
            worldql.exec(gqlSchema, gqlQuery).then(response => {
                expect(response).toMatchObject({
                    data: {
                        books: [
                            {
                                title: "Harry Potter and the Chamber of Secrets",
                                author: "J.K. Rowling"
                            },
                            {
                                title: "Jurassic Park",
                                author: "Michael Crichton"
                            }
                        ]
                    }
                })
            })
        })
    })
})
