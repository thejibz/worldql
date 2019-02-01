const { composeWithMysql } = require("graphql-compose-mysql")

/**
 * 
 * @param { source: { host, port, user, password, database, graphqlTypeName, mysqlTableName } } gqlApi 
 */
module.exports.buildGqlSchemaFromMysql = (sourceName, sourceConf) => {
    return composeWithMysql(sourceConf).then(gqlSchema => {
        return { [sourceName]: gqlSchema }
    })
}