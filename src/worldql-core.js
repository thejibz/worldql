const debug = require("debug")("worldql-core")
const GraphQL = require("graphql")
const SwaggerToGraphQL = require("swagger-to-graphql")
const OASGraph = require("oasgraph")
const SwaggerParser = require("swagger-parser")
const gqltools = require("graphql-tools")
const elasticsearch = require("elasticsearch")
const { elasticApiFieldConfig } = require("graphql-compose-elasticsearch")

const WorldQL = (function() {
    const SOURCE_TYPE = Object.freeze({
        OPEN_API_SPECFILE: "OPEN_API_SPECFILE",
        GRAPHQL: "GRAPHQL",
        ELASTICSEARCH: "ELASTICSEARCH"
    })

    const SOURCE_CONVERTER = Object.freeze({
        SWAGGER_TO_GRAPHQL: "SWAGGER_TO_GRAPHQL",
        OASGRAPH: "OASGRAPH"
    })

    let _buildGqlSchemaFromES = function(gqlApi) {
        return new Promise(resolve => {
            const gqlSchema = new GraphQL.GraphQLSchema({
                query: new GraphQL.GraphQLObjectType({
                    name: "Query",
                    fields: {
                        elastic50: elasticApiFieldConfig(
                            new elasticsearch.Client({
                                host: gqlApi.source.url,
                                apiVersion: "5.0"
                            })
                        )
                    }
                })
            })

            resolve({ schema: gqlSchema, schemaUrl: gqlApi.source.url })
        })
    }

    let _buildGqlSchemaFromOAS = function(gqlApi) {
        return SwaggerParser.validate(gqlApi.source.url).then(openApiSchema => {
            switch (gqlApi.source.converter) {
            case SOURCE_CONVERTER.SWAGGER_TO_GRAPHQL:
                return _buildGqlSchemaWithSwaggerToGraphQL(gqlApi, openApiSchema)

            case SOURCE_CONVERTER.OASGRAPH:
                return _buildGqlSchemaWithOASGraph(gqlApi, openApiSchema)

            default:
                return _buildGqlSchemaWithSwaggerToGraphQL(gqlApi, openApiSchema)
            }
        })
    }

    let _buildGqlSchemaWithSwaggerToGraphQL = function(gqlApi, openApiSchema) {
        // build backendUrl from infos of the openapi spec file
        const backendUrl = `${openApiSchema.schemes[0]}://${openApiSchema.host}${openApiSchema.basePath ? openApiSchema.basePath : ""}`
        debug("(backendUrl) %o", backendUrl)

        return SwaggerToGraphQL(openApiSchema, backendUrl, gqlApi.headers).then(gqlSchema => {
            return { schema: gqlSchema, schemaUrl: gqlApi.source.url }
        })
    }

    let _buildGqlSchemaWithOASGraph = function(gqlApi, openApiSchema) {
        return OASGraph.createGraphQlSchema(openApiSchema).then(({ schema }) => {
            return { schema: schema, schemaUrl: gqlApi.source.url }
        })
    }

    let _buildLinks = function(gqlApi, gqlSchemas) {
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
                                operation: "query",
                                fieldName: gqlApi.link.on.field.query.name,
                                args: Object.assign({}, params.static, _buildParentParams(parentResp, params.parent)),
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

    let _buildParentParams = function(parentResp, parentParams) {
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
        exec: function(gqlApis, gqlQuery, gqlVariables) {
            const finalSchema = this.buildGqlSchema(gqlApis)

            return finalSchema.then(gqlSchema => {
                return GraphQL.graphql({
                    schema: gqlSchema,
                    source: gqlQuery,
                    variableValues: gqlVariables
                }).then(gqlResponse => {
                    debug("(exec)(gqlResponse) %o", gqlResponse)

                    return new Promise(resolve => {
                        resolve(gqlResponse)
                    })
                })
            })
        },

        buildGqlSchema: function(gqlApis) {
            const gqlSchemas = gqlApis.map(gqlApi => {
                switch (gqlApi.source.type) {
                case SOURCE_TYPE.OPEN_API_SPECFILE:
                    return _buildGqlSchemaFromOAS(gqlApi)

                case SOURCE_TYPE.ELASTICSEARCH:
                    return _buildGqlSchemaFromES(gqlApi)

                default:
                    return _buildGqlSchemaFromOAS(gqlApi)
                }
            })

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
