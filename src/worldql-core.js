"use strict"

const debug = require("debug")("worldql-core")

const zealit = require("zealit")

const gqltools = require("graphql-tools")

const oasBuilder = require("./builders/openapi.builder")
const mysqlBuilder = require("./builders/mysql.builder")
const esBuilder = require("./builders/elasticsearch.builder")
const gqlBuilder = require("./builders/graphql.builder")

const WorldQL = (function () {
    const SOURCE_TYPE = zealit({
        OPEN_API: "OPEN_API",
        GRAPHQL: "GRAPHQL",
        ELASTICSEARCH: "ELASTICSEARCH",
        MYSQL: "MYSQL"
    }, { freeze: true } )

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
        // Throw a ReferenceError if field used for stitching is not present in the parent object
        parent = zealit(parent, { catch: (err) => {
            throw(`${err}. Check that the parent object fetch it and that there is no typo in the stitching configuration.`)
        }})
        // Throw a ReferenceError if field used for stitching is not present in the query variables
        vars = zealit(vars, { catch: (err) => {
            throw(`${err}. Check that the query variables contain it and that there is no typo in the stitching configuration.`)
        }})

        const args =
            // { param1: (parent, vars) => { parent.fieldName1 }, param2: (parent, vars) => { vars.fieldName2 }, ...}
            Object.entries(stitchArgs)
                // [ [ param1, (parent, vars) => { parent.fieldName1 }], (parent, vars) => { vars.fieldName2 }, ...]
                .map(entry => {
                    return { [entry[0]]: entry[1](parent, vars) }
                })
                // [ { param1: parent.fieldName1 }, { param2: vars.fieldName2 }, ...]
                .reduce((acc, arg) => Object.assign(acc, arg))
                // { param1: parent.fieldName1, param2: vars.fieldName2, ... }

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
