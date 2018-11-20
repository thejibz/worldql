process.env.DEBUG = ["worldql-core"]
process.env.DEBUG_DEPTH = 15

const globalTunnel = require("global-tunnel")
globalTunnel.initialize() // use ENV http_proxy for all requests

const worldql = require("../src/worldql-core")

describe("Test the worldql for elasticsearch", () => {
    jest.setTimeout(15000)

    test("get an employee", () => {
        const gqlApis = [
            {
                source: {
                    url: "http://localhost:9200",
                    type: "ELASTICSEARCH",
                    params: {
                        apiVersion: '5.0'
                    }
                }
            }
        ]

        const gqlQuery = `
        query {
            __schema {
              types {
                name
                fields {
                  name
                }
              }
            }
          }`

        return worldql.exec(gqlApis, gqlQuery).then(response => {
            expect(response).toMatchObject({
                data: expect.any(Object)
            })
        })
    })
})
