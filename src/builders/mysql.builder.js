const { composeWithMysql } = require("graphql-compose-mysql")

/**
 * 
 * @param { source: { host, port, user, password, database, graphqlTypeName, mysqlTableName } } gqlApi 
 */
module.exports.buildGqlSchemaFromMysql = (gqlApi) => {
    return composeWithMysql({
        graphqlTypeName: gqlApi.source.graphqlTypeName,
        mysqlConfig: {
            host: gqlApi.source.host,
            port: gqlApi.source.port,
            user: gqlApi.source.user,
            password: gqlApi.source.password,
            database: gqlApi.source.database,
        },
        mysqlTableName: gqlApi.source.mysqlTableName,
    }).then(gqlSchema => {
        return { schema: gqlSchema, schemaUrl: gqlApi.source.host }
    })
}