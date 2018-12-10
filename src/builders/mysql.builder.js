const { composeWithMysql } = require("graphql-compose-mysql")

/**
 * 
 * @param { source: { host, port, user, password, database, graphqlTypeName, mysqlTableName } } gqlApi 
 */
module.exports.buildGqlSchemaFromMysql = (sourceName, sourceConf) => {
    return composeWithMysql({
        graphqlTypeName: sourceConf.graphqlTypeName,
        mysqlTableName: sourceConf.mysqlTableName,
        mysqlConfig: {
            host: sourceConf.host,
            port: sourceConf.port,
            user: sourceConf.user,
            password: sourceConf.password,
            database: sourceConf.database,
        },
    }).then(gqlSchema => {
        return { [sourceName]: gqlSchema }
    })
}