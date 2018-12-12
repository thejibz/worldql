const debug = require("debug")("worldql-core")

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

    function _createAllSchemas(sources) {
        return Object.entries(sources).map(source => {
            const sourceName = source[0]
            const sourceConf = source[1]

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
    }

    function _buildStitches(stitches, wqlSchemas) {

        if (!stitches)
            return

        return stitches.map(stitch => {
            const linkTypeDef = `
                    extend type ${stitch.parentType} {
                        ${stitch.fieldName}: ${stitch.fieldType}
                    }`

            const remoteSchema = wqlSchemas // [ { sourceName1: GQLSchema...}, { sourceName2: GQLSchema...}, ...]
                .find(wqlSchema => !!wqlSchema[stitch.resolver.source])/* { sourceName1: GQLSchema...} */[stitch.resolver.source] // { GQLSchema... }

            const resolver = {
                [stitch.parentType]: {
                    [stitch.fieldName](parentResp, args, context, info) {
                        const params = stitch.resolver.params

                        let argsForStitch = {}
                        if (!!params) {
                            _buildParentParams(parentResp, params.fromParent).map(param => Object.assign(argsForStitch, param))
                            Object.assign(argsForStitch, params.static, params.fromVariables)
                        }

                        const resolver = info.mergeInfo.delegateToSchema({
                            schema: remoteSchema,
                            operation: "query",
                            fieldName: stitch.resolver.query,
                            args: argsForStitch,
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

    function _buildParentParams(parentResp, parentParams) {
        if (!parentParams)
            return {}

        const params =
            // { param1: parentFieldName1, param2: parentFieldName2, ...}
            Object.entries(parentParams)
                // [ [ param1, parentFieldName1], [ param2: parentFieldName2 ], ...]
                .map(entry => {
                    return { [entry[0]]: parentResp[entry[1]] }
                })
        // [ { param1: parentFieldValue1 }, { param2: parentFieldValue2 }, ...]

        return params
    }

    // public interfaces
    return {
        buildGqlSchema: function (wqlConf) {
            const wqlSchemas = _createAllSchemas(wqlConf.sources)

            const finalSchema = Promise.all(wqlSchemas).then(wqlSchemas => {
                const schemas = wqlSchemas
                    // [ { sourceName1: GQLSchema...}, { sourceName2: GQLSchema...}, ...]
                    .map(wqlSchema => Object.values(wqlSchema))
                    // [ [ GQLSchema {...} ], [ GQLSchema {...} ], ...]
                    .reduce((acc, gqlSchema) => acc.concat(gqlSchema), [])
                // [ GQLSchema {...}, GQLSchema {...}, ...]

                const resolvers = []
                const stitches = _buildStitches(wqlConf.stitches, wqlSchemas)

                stitches.map(stitch => {
                    schemas.push(stitch.linkTypeDef)
                    resolvers.push(stitch.resolver)
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
