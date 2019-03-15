"use strict"

const debug = require("debug")("worldql-core")

const zealit = require("zealit")
const is = require("is_js")

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
        MYSQL: "MYSQL",
        SOAP: "SOAP"
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

            const linkTypeDef = `
                    extend type ${stitch.parentType} {
                        ${stitch.fieldName}: ${remoteQuery.type.toString()}
                    }`

            const resolver = {
                [stitch.parentType]: {
                    [stitch.fieldName](parent, args, context, info) {
                        let stitchArgs = {}

                        // Define the internal function that build resolver (avoid code duplication)
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

                        if (!!stitch.resolver.args) {
                            if (!!stitch.resolver.groupBy) {
                                const groupValues = stitch.resolver.groupBy(parent, info.variableValues)
                                if (is.not.array(groupValues)) {
                                    throw (`groupBy in stitch "${stitch.fieldName}" doesn't resolve to an array."`)
                                }

                                const resolver = Promise.all(
                                    groupValues.map(groupValue => {
                                        return _buildStitchArgs(stitch.resolver.args, parent, info.variableValues, groupValue)
                                    }).map(args => { 
                                        return __buildResolver(args) 
                                    })
                                ).then(v => {
                                    console.log(v)
                                    return v
                                })

                                return resolver
                            }

                            stitchArgs = _buildStitchArgs(stitch.resolver.args, parent, info.variableValues)
                        }

                        const resolver = __buildResolver(stitchArgs)

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
