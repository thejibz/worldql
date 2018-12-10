const SwaggerParser = require("swagger-parser")
const OASGraph = require("oasgraph")

module.exports.buildGqlSchemaFromOas = (gqlApi) => {
    return SwaggerParser.validate(gqlApi.source.url).then(openApiSchema => {
        return OASGraph.createGraphQlSchema(openApiSchema).then(({ schema }) => {
            return { schema: schema, schemaUrl: gqlApi.source.url }
        })
    })
}