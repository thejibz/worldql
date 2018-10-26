const debug = require('debug')('worldql-core')
const GraphQL = require('graphql')
const Swagger2GraphQL = require('swagger-to-graphql')
const OASGraph = require('oasgraph')
const SwaggerParser = require('swagger-parser')
const gqltools = require('graphql-tools')



SCHEMA_TYPE = Object.freeze({
    OpenApiSchema: 0,
    GraphQL: 1
})

SCHEMA_PARSER = Object.freeze({
    Swagger2GraphQL: 0,
    OASGraph: 1
})



let WorldQL = (function () {

    let _buildGqlSchema = function (gqlApi) {

        return SwaggerParser.validate(gqlApi.schema.url).then(openApiSchema => {

            switch (gqlApi.schema.parser) {
                case SCHEMA_PARSER.Swagger2GraphQL:
                    return _buildGqlSchemaWithSwagger2GraphQL(gqlApi, openApiSchema)
                    break

                case SCHEMA_PARSER.OASGraph:
                    return _buildGqlSchemaWithOASGraph(gqlApi, openApiSchema)
                    break

                default:
                    return _buildGqlSchemaWithSwagger2GraphQL(gqlApi, openApiSchema)
            }
        })
    }

    let _buildGqlSchemaWithSwagger2GraphQL = function (gqlApi, openApiSchema) {
        // build backendUrl from infos of the openapi spec file
        const backendUrl = openApiSchema.schemes[0] + "://" + openApiSchema.host + openApiSchema.basePath
        debug("(backendUrl) %o", backendUrl)

        return Swagger2GraphQL(openApiSchema, backendUrl, gqlApi.headers).then(gqlSchema => {
            return { schema: gqlSchema, schemaUrl: gqlApi.schema.url}
        })
    }

    let _buildGqlSchemaWithOASGraph = function (gqlApi, openApiSchema) {
        return OASGraph.createGraphQlSchema(openApiSchema).then(({ schema }) => {
            return { schema: schema, schemaUrl: gqlApi.schema.url }
        })
    }

    let _buildLinks = function (gqlApi, gqlSchemas) {

        if (gqlApi.link) {
            const linkTypeDef = `
            extend type ${gqlApi.link.inType} {
                ${gqlApi.link.on.field.name}: ${gqlApi.link.on.field.type}
            }
        `

            const resolver = {
                [gqlApi.link.inType]: {
                    [gqlApi.link.on.field.name]: {
                        resolve(parentResp, args, context, info) {
                            const linkSchema = gqlSchemas.find(s => s.schemaUrl == gqlApi.link.on.field.schemaUrl)

                            const params = gqlApi.link.on.field.query.params

                            const resolver = info.mergeInfo.delegateToSchema({
                                schema: linkSchema.schema,
                                operation: 'query',
                                fieldName: gqlApi.link.on.field.query.name,
                                args: Object.assign(
                                    {},
                                    params.static,
                                    _buildParentParams(parentResp, params.parent)
                                ),
                                context,
                                info
                            })

                            return resolver
                        }
                    }
                }
            }

            return { linkTypeDef: linkTypeDef, resolver: resolver }
        }
    }

    let _buildParentParams = function (parentResp, parentParams) {
        return parentParams
            .map(param => Object.entries(param))
            .reduce((acc, param) => acc.concat(param)) // flatMap workaround
            .map(entry => {
                return { [entry[0]]: parentResp[entry[1]] }
            })
            .reduce((acc, param) => Object.assign(acc, param))
    }

    // public interfaces
    return {

        exec: function (gqlApis, gqlQuery, gqlVariables) {
            debug("(exec)(gqlApis) %o", gqlApis)
            debug("(exec)(gqlQuery) %o", gqlQuery)
            debug("(exec)(gqlVariables) %o", gqlVariables)

            const finalSchema = this.buildGqlSchema(gqlApis)

            return finalSchema.then(gqlSchema => {
                return GraphQL.graphql({ schema: gqlSchema, source: gqlQuery, variableValues: gqlVariables }).then(gqlResponse => {
                    debug("(exec)(gqlResponse) %o", gqlResponse)

                    return new Promise((resolve, reject) => {
                        resolve(gqlResponse)
                    })
                })
            })
        },

        buildGqlSchema: function (gqlApis) {

            const gqlSchemas = gqlApis.map(gqlApi => _buildGqlSchema(gqlApi))

            const finalSchema = Promise.all(gqlSchemas).then(gqlSchemas => {

                const schemas = gqlSchemas.map(s => s.schema)
                const resolvers = []

                gqlApis
                    .map(gqlApi => _buildLinks(gqlApi, gqlSchemas))
                    .filter(link => link) // filter empty links
                    .map(link => {
                        schemas.push(link.linkTypeDef)
                        resolvers.push(link.resolver)
                    })

                return gqltools.mergeSchemas({
                    schemas: schemas,
                    resolvers: resolvers
                })
            })

            return finalSchema
        }
    }

})()

module.exports = WorldQL