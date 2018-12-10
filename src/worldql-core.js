const debug = require("debug")("worldql-core")

const GraphQL = require("graphql")
const gqltools = require("graphql-tools")

const oasBuilder = require("./builders/openapi.builder")
const mysqlBuilder = require("./builders/mysql.builder")
const esBuilder = require("./builders/elasticsearch.builder")
const gqlBuilder = require("./builders/graphql.builder")

const WorldQL = (function () {
    const SOURCE_TYPE = Object.freeze({
        OPEN_API: "OPEN_API",
        GRAPHQL: "GRAPHQL",
        ELASTICSEARCH: "ELASTICSEARCH",
        MYSQL: "MYSQL"
    })

    const _buildLinks = function (gqlApi, gqlSchemas) {
        if (gqlApi.links) {
            return gqlApi.links.map(link => {
                const linkTypeDef = `
            extend type ${link.inType} {
                ${link.on.field.name}: ${link.on.field.type}
            }
        `

                const resolver = {
                    [link.inType]: {
                        [link.on.field.name]: {
                            resolve(parentResp, args, context, info) {
                                const linkSchema = gqlSchemas.find(s => s.schemaUrl == link.on.field.schemaUrl)

                                const params = link.on.field.query.params

                                let argsForLink = args
                                if (!!params) {
                                    Object.assign(argsForLink, params.static, _buildParentParams(parentResp, params.parent))
                                }

                                const resolver = info.mergeInfo.delegateToSchema({
                                    schema: linkSchema.schema,
                                    operation: "query",
                                    fieldName: link.on.field.query.name,
                                    args: argsForLink,
                                    context,
                                    info
                                })

                                return resolver
                            }
                        }
                    }
                }

                return { linkTypeDef: linkTypeDef, resolver: resolver }
            })
        }
    }

    const _buildParentParams = function (parentResp, parentParams) {
        return !!parentParams ? parentParams
            .map(param => Object.entries(param))
            .reduce((acc, entry) => acc.concat(entry), []) // flatMap workaround
            .map(entry => {
                return { [entry[0]]: parentResp[entry[1]] }
            }) : {}
    }

    // public interfaces
    return {
        exec: function (gqlSchema, gqlQuery, gqlVariables) {
            return GraphQL.graphql({
                schema: gqlSchema,
                source: gqlQuery,
                variableValues: gqlVariables
            }).then(gqlResponse => {
                debug("(exec)(gqlResponse) %o", gqlResponse)
                return gqlResponse
            })
        },

        buildGqlSchema: function (gqlApis) {
            const gqlSchemas = gqlApis.map(gqlApi => {
                switch (gqlApi.source.type) {
                    case SOURCE_TYPE.OPEN_API:
                        return oasBuilder.buildGqlSchemaFromOas(gqlApi)

                    case SOURCE_TYPE.ELASTICSEARCH:
                        return esBuilder.buildGqlSchemaFromEs(gqlApi)

                    case SOURCE_TYPE.GRAPHQL:
                        return gqlBuilder.buildGqlSchemaFromGql(gqlApi)

                    case SOURCE_TYPE.MYSQL:
                        return mysqlBuilder.buildGqlSchemaFromMysql(gqlApi)

                    default:
                        throw new Error("Source type not defined or invalid for " + gqlApi)
                }
            })

            const finalSchema = Promise.all(gqlSchemas).then(gqlSchemas => {
                const schemas = gqlSchemas.map(s => s.schema)
                const resolvers = []

                gqlApis
                    .map(gqlApi => _buildLinks(gqlApi, gqlSchemas))
                    .reduce((acc, param) => acc.concat(param), []) // flatMap workaround
                    .filter(link => !!link) // filter empty links
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
