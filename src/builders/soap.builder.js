const { soapGraphqlSchema } = require("soap-graphql")


module.exports.buildGqlSchemaFromSoap = (sourceConf) => {
    return soapGraphqlSchema(sourceConf.wsdlUrlOrOptions).then(schema => {
        return schema
    })
}