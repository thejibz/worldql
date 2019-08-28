const { composeWithMysql } = require("graphql-compose-mysql")

/**
 * 
 * @param { source: { host, port, user, password, database, graphqlTypeName, mysqlTableName } } gqlApi 
 */
module.exports.buildGqlSchemaFromMysql = (sourceConf) => {
    return composeWithMysql(sourceConf).then(gqlSchema => {
        return gqlSchema
    })
}