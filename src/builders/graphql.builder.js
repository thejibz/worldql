const gqltools = require("graphql-tools")
const { createHttpLink } = require("apollo-link-http")
const fetch = require("node-fetch")

module.exports.buildGqlSchemaFromGql = (sourceConf) => {
    const link = new createHttpLink({ fetch: fetch, uri: sourceConf.url, credentials: "same-origin" })

    return gqltools.introspectSchema(link).then(schema => {
        const gqlSchema = gqltools.makeRemoteExecutableSchema({
            schema,
            link
        })

        return gqlSchema
    })
}