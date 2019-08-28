const { importSchema } = require("graphql-import")
const { makeExecutableSchema } = require("graphql-tools")


module.exports.buildGqlSchemaFromFile = (sourceConf) => {
    return new Promise(function (resolve, reject) {
        const typeDefs = importSchema(sourceConf.url)
        const resolvers = sourceConf.resolvers

        const schema = makeExecutableSchema({ typeDefs, resolvers })
        resolve(schema)
    })
}