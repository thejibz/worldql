const SwaggerParser = require("swagger-parser")
const OASGraph = require("oasgraph")

module.exports.buildGqlSchemaFromOas = (sourceName, sourceConf) => {
    return SwaggerParser.validate(sourceConf.url).then(openApiSchema => {
        return OASGraph.createGraphQlSchema(openApiSchema).then(({ schema }) => {
            return { [sourceName]: schema }
        })
    })
}