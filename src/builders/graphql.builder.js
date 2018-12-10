const gqltools = require("graphql-tools")
const { createHttpLink } = require("apollo-link-http")
const fetch = require("node-fetch")

module.exports.buildGqlSchemaFromGql = function (gqlApi) {
    const link = new createHttpLink({ fetch: fetch, uri: gqlApi.source.url, credentials: "same-origin" })

    return gqltools.introspectSchema(link).then(schema => {
        const gqlSchema = gqltools.makeRemoteExecutableSchema({
            schema,
            link
        })

        return { schema: gqlSchema, schemaUrl: gqlApi.source.url }
    })
}