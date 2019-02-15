const { soapGraphqlSchema } = require("soap-graphql")


module.exports.buildGqlSchemaFromSoap = (sourceConf) => {
    return soapGraphqlSchema(sourceConf.wsdlUrl).then(schema => {
        return schema
    })
}