"use strict"

const debug = require("debug")("worldql-core")

const zealit = require("zealit")
const is = require("is_js")

const gqltools = require("graphql-tools")

const oasBuilder = require("./builders/openapi.builder")
const mysqlBuilder = require("./builders/mysql.builder")
const esBuilder = require("./builders/elasticsearch.builder")
const gqlBuilder = require("./builders/graphql.builder")
const fileBuilder = require("./builders/file.builder")

const WorldQL = (function () {
    const SOURCE_TYPE = zealit({
        OPEN_API: "OPEN_API",
        GRAPHQL: "GRAPHQL",
        ELASTICSEARCH: "ELASTICSEARCH",
        MYSQL: "MYSQL",
        SOAP: "SOAP",
        FILE: "FILE"
    }, { freeze: true })

    function _createGqlSchemasFromDs(datasources) {
        return Object.entries(datasources).map(ds => {
            const dsName = ds[0]
            const dsConf = ds[1]

            switch (dsConf.type) {
                case SOURCE_TYPE.OPEN_API:
                    return oasBuilder.buildGqlSchemaFromOas(dsConf).then((schema) => { return { [dsName]: schema } })

                case SOURCE_TYPE.ELASTICSEARCH:
                    return esBuilder.buildGqlSchemaFromEs(dsConf).then((schema) => { return { [dsName]: schema } })

                case SOURCE_TYPE.GRAPHQL:
                    return gqlBuilder.buildGqlSchemaFromGql(dsConf).then((schema) => { return { [dsName]: schema } })

                case SOURCE_TYPE.MYSQL:
                    return mysqlBuilder.buildGqlSchemaFromMysql(dsConf).then((schema) => { return { [dsName]: schema } })

                case SOURCE_TYPE.FILE:
                    return fileBuilder.buildGqlSchemaFromFile(dsConf).then((schema) => { return { [dsName]: schema } })

                default:
                    throw ("Datasource type not defined or invalid for " + dsName)
            }
        })
    }

    function _buildStitches(stitches, wqlSchemas) {
        if (is.not.array(stitches) || is.not.array(wqlSchemas)) {
            return []
        }

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

            // Add the new field of type T to the parent
            // In case of forEach: T becomes [T]
            const linkTypeDef = `
                    extend type ${stitch.parentType} {
                        ${stitch.fieldName}: ${!stitch.resolver.forEach ? remoteQuery.type.toString() : `[${remoteQuery.type.toString()}]`}
                    }`

            const resolver = {
                [stitch.parentType]: {
                    [stitch.fieldName](parent, args, context, info) {
                        // Define the internal function that will build resolver (avoid code duplication)
                        const __buildResolver = (stitchArgs) => {
                            return info.mergeInfo.delegateToSchema({
                                schema: remoteSchema,
                                operation: "query",
                                fieldName: remoteQuery.name,
                                args: stitchArgs,
                                context,
                                info
                            })
                        }

                        let resolver = {}

                        if (stitch.resolver.forEach) {
                            const values = stitch.resolver.forEach(parent, info.variableValues)
                           
                            if (is.not.array(values)) {
                                throw (`forEach option for stitched field "${stitch.fieldName}" doesn't resolve to an array."`)
                            }

                            resolver = Promise.all(
                                values.map(value => {
                                    let stitchArgs = {}

                                    if (!!stitch.resolver.args && is.not.empty(stitch.resolver.args)) {
                                        stitchArgs = _buildStitchArgs(stitch.resolver.args, parent, info.variableValues, value)
                                    } 

                                    return stitchArgs
                                }).map(stitchArgs => {
                                    return __buildResolver(stitchArgs)
                                })
                            )
                        } else {
                            let stitchArgs = {}

                            if (stitch.resolver.args && is.not.empty(stitch.resolver.args)) {
                                stitchArgs = _buildStitchArgs(stitch.resolver.args, parent, info.variableValues)
                            }

                            resolver = __buildResolver(stitchArgs)
                        }

                        return resolver
                    }
                }
            }

            return { linkTypeDef: linkTypeDef, resolver: resolver }
        })

    }

    function _buildStitchArgs(stitchArgs, parent, vars, groupValue) {
        // Throw a ReferenceError if field used for stitching is not present in the parent object
        parent = zealit(parent, {
            catch: (err) => {
                throw (`${err}. Check that the parent object fetch it and that there is no typo in the stitching configuration.`)
            }
        })
        // Throw a ReferenceError if field used for stitching is not present in the query variables
        vars = zealit(vars, {
            catch: (err) => {
                throw (`${err}. Check that it is in the query's variables and that there is no typo in the stitching configuration.`)
            }
        })

        const args =
            // { param1: (parent, vars) => { parent.fieldName1 }, param2: (parent, vars) => { vars.fieldName2 }, ...}
            Object.entries(stitchArgs)
                // [ [param1, (parent, vars, value) => { parent.fieldName1 }], [param2: (parent, vars, value) => { vars.fieldName2 }],
                //  [param3: (parent, vars, value) => { value }], ...]
                .map(entry => {
                    return { [entry[0]]: entry[1](parent, vars, groupValue) }
                })
                // [ { param1: parent.fieldName1 }, { param2: vars.fieldName2 }, { param3: value }, ...]
                .reduce((acc, arg) => Object.assign(acc, arg)) // { param1: parent.fieldName1, param2: vars.fieldName2, param3: value, ... }

        return args
    }

    // public interfaces
    return {
        buildGqlSchema: function (wqlConf) {
            const wqlSchemas = _createGqlSchemasFromDs(wqlConf.datasources)

            const finalSchema = Promise.all(wqlSchemas).then(wqlSchemas => {
                const resolvers = []
                const schemas = wqlSchemas
                    // [ { datasourceName1: GQLSchema...}, { datasourceName2: GQLSchema...}, ...]
                    .map(wqlSchema => Object.values(wqlSchema))
                    // [ [ GQLSchema {...} ], [ GQLSchema {...} ], ...]
                    .reduce((acc, gqlSchema) => acc.concat(gqlSchema), []) // [ GQLSchema {...}, GQLSchema {...}, ...]

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
