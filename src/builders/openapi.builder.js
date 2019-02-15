const SwaggerParser = require("swagger-parser")
const OASGraph = require("oasgraph-jibz")

module.exports.buildGqlSchemaFromOas = ( sourceConf) => {
    return SwaggerParser.validate(sourceConf.url).then(openApiSchema => {
        return OASGraph.createGraphQlSchema(openApiSchema, sourceConf.oasGraphConf).then(({ schema }) => {
            return schema
        })
    })
}