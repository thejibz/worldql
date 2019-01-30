const debug = require("debug")("worldql-core")

const GraphQL = require("graphql")
const gqltools = require("graphql-tools")
const { schemaComposer, TypeMapper } = require("graphql-compose")

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

    function _createGqlSchemasFromDs(datasources) {
        return Object.entries(datasources).map(ds => {
            const dsName = ds[0]
            const dsConf = ds[1]

            switch (dsConf.type) {
                case SOURCE_TYPE.OPEN_API:
                    return oasBuilder.buildGqlSchemaFromOas(dsName, dsConf)

                case SOURCE_TYPE.ELASTICSEARCH:
                    return esBuilder.buildGqlSchemaFromEs(dsName, dsConf)

                case SOURCE_TYPE.GRAPHQL:
                    return gqlBuilder.buildGqlSchemaFromGql(dsName, dsConf)

                case SOURCE_TYPE.MYSQL:
                    return mysqlBuilder.buildGqlSchemaFromMysql(dsName, dsConf)

                default:
                    throw ("Datasource type not defined or invalid for " + dsName)
            }
        })
    }

    function _buildStitches(stitches, wqlSchemas) {

        if (!stitches)
            return

        return stitches.map(stitch => {
            let remoteSchema = wqlSchemas
                // [ { datasourceName1: GQLSchema...}, { datasourceName2: GQLSchema...}, ...]
                .find(wqlSchema => !!wqlSchema[stitch.resolver.datasource])
            /* { datasourceName1: GQLSchema... } */
            if (!remoteSchema) {
                throw (`Datasource "${stitch.resolver.datasource}" not found`)
            }

            remoteSchema = remoteSchema[stitch.resolver.datasource]
            // { GQLSchema... }

            const remoteQuery = remoteSchema.getQueryType().getFields()[stitch.resolver.query]
            if (!remoteQuery) {
                throw (`Query "${stitch.resolver.query}" not found in datasource "${stitch.resolver.datasource}"`)
            }

            const linkTypeDef = `
                    extend type ${stitch.parentType} {
                        ${stitch.fieldName}: ${remoteQuery.type.toString()}
                    }`

            const resolver = {
                [stitch.parentType]: {
                    [stitch.fieldName](parent, args, context, info) {
                        let stitchArgs = {}

                        if (!!stitch.resolver.args) {
                            stitchArgs = _buildStitchArgs(stitch.resolver.args, parent, info.variableValues)
                                .reduce((acc, arg) => Object.assign(acc, arg))
                        }

                        const resolver = info.mergeInfo.delegateToSchema({
                            schema: remoteSchema,
                            operation: "query",
                            fieldName: remoteQuery.name,
                            args: stitchArgs,
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

    function _buildStitchArgs(stitchArgs, parent, vars) {
        if (!stitchArgs)
            return {}

        const args =
            // { param1: (parent) => { parent.fieldName1 }, param2: (parent) => { parent.fieldName2[0] }, ...}
            Object.entries(stitchArgs)
                // [ [ param1, (parent) => { parent.fieldName1 }], (parent) => { parent.fieldName2[0] }, ...]
                .map(entry => {
                    // [ { param1: parent.fieldName1 }, { param2: parent.fieldName2[0] }, ...]
                    return { [entry[0]]: entry[1](parent, vars) }
                })

        return args
    }

    // public interfaces
    return {
        buildGqlSchema: function (wqlConf) {
            const wqlSchemas = _createGqlSchemasFromDs(wqlConf.datasources)

            const finalSchema = Promise.all(wqlSchemas).then(wqlSchemas => {
                const schemas = wqlSchemas
                    // [ { datasourceName1: GQLSchema...}, { datasourceName2: GQLSchema...}, ...]
                    .map(wqlSchema => Object.values(wqlSchema))
                    // [ [ GQLSchema {...} ], [ GQLSchema {...} ], ...]
                    .reduce((acc, gqlSchema) => acc.concat(gqlSchema), []) // [ GQLSchema {...}, GQLSchema {...}, ...]

                const resolvers = []
                const stitches = _buildStitches(wqlConf.stitches, wqlSchemas)

                if (!!stitches) {
                    stitches.map(stitch => {
                        schemas.push(stitch.linkTypeDef)
                        resolvers.push(stitch.resolver)
                    })
                }

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
