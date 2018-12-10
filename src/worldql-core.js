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
        if (!!gqlApi.links) {
            return gqlApi.links.map(link => {
                const linkTypeDef = `
                    extend type ${link.inType} {
                        ${link.on.field.name}${link.on.field.params}: ${link.on.field.type}
                    }`

                const resolver = {
                    [link.inType]: {
                        [link.on.field.name](parentResp, args, context, info) {
                            debug("args: %o", args)
                            const linkSchema = gqlSchemas.find(s => s.schemaUrl == link.on.field.schemaUrl)

                            const params = link.on.field.query.params

                            let argsForLink = {}
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

        buildGqlSchema: function (wqlConf) {
            const wqlSchemas = Object.entries(wqlConf.sources).map(source => {
                
                const sourceName = source[0]
                const sourceConf = source[1]
                debug("sourceConf: %o", sourceConf)

                switch (sourceConf.type) {
                    case SOURCE_TYPE.OPEN_API:
                        return oasBuilder.buildGqlSchemaFromOas(sourceName, sourceConf)

                    case SOURCE_TYPE.ELASTICSEARCH:
                        return esBuilder.buildGqlSchemaFromEs(sourceName, sourceConf)

                    case SOURCE_TYPE.GRAPHQL:
                        return gqlBuilder.buildGqlSchemaFromGql(sourceName, sourceConf)

                    case SOURCE_TYPE.MYSQL:
                        return mysqlBuilder.buildGqlSchemaFromMysql(sourceName, sourceConf)

                    default:
                        throw new Error("Source type not defined or invalid for " + sourceName)
                }
            })

            const finalSchema = Promise.all(wqlSchemas).then(wqlSchemas => {
                
                /**
                 * Extract an array of graphQL schemas
                 */
                const schemas = wqlSchemas // [ { schemaName1: GQLSchema...}, { schemaName2: GQLSchema...}, ...]
                    .map(wqlSchema => Object.values(wqlSchema)) // [ [ GQLSchema {...} ], [ GQLSchema {...} ], ...]
                    .reduce((acc, entry) => acc.concat(entry), []) // flatMap workaround: [ GQLSchema {...}, GQLSchema {...}, ...]
                
                const resolvers = []

                // gqlApis
                //     .map(gqlApi => _buildLinks(gqlApi, gqlSchemas))
                //     .reduce((acc, param) => acc.concat(param), []) // flatMap workaround
                //     .filter(link => !!link) // filter empty links
                //     .map(link => {
                //         schemas.push(link.linkTypeDef)
                //         resolvers.push(link.resolver)
                //     })

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
