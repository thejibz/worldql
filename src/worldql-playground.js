const worldql = require("./worldql-core")
const { ApolloServer } = require('apollo-server')



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

async function main() {
    const server = new ApolloServer({
        schema: await worldql.buildGqlSchema(gqlApis),
        playground: true
    })

    server.listen().then(({ url }) => {
        console.log(`🚀 Server ready at ${url}`)
    })
}

main()