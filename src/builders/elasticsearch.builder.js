const GraphQL = require("graphql")
const elasticsearch = require("elasticsearch")
const { composeWithElastic, fetchElasticMapping } = require("graphql-compose-elasticsearch")

module.exports.buildGqlSchemaFromEs = (sourceName, sourceConf) => {
    const elasticClient = new elasticsearch.Client({
        host: sourceConf.host,
        apiVersion: sourceConf.apiVersion
    })

    return fetchElasticMapping({
        elasticIndex: sourceConf.elasticIndex,
        elasticType: sourceConf.elasticType,
        elasticClient: elasticClient
    }).then(elasticMapping => {
        const esTC = composeWithElastic({
            graphqlTypeName: sourceConf.graphqlTypeName,
            elasticIndex: sourceConf.elasticIndex,
            elasticType: sourceConf.elasticType,
            elasticMapping: elasticMapping,
            elasticClient: elasticClient,
            prefix: sourceConf.prefix || "",
            // elastic mapping does not contain information about is fields are arrays or not
            // so provide this information explicitly for obtaining correct types in GraphQL
            // ex: pluralFields: ['skills', 'languages']
            pluralFields: sourceConf.pluralFields
        })

        const gqlSchema = new GraphQL.GraphQLSchema({
            query: new GraphQL.GraphQLObjectType({
                name: "Query",
                fields: {
                    [sourceConf.graphqlTypeName]: esTC.getResolver("search").getFieldConfig()
                }
            })
        })

        return { [sourceName]: gqlSchema }
    })
}