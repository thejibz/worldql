const GraphQL = require("graphql")
const elasticsearch = require("elasticsearch")
const { composeWithElastic, fetchElasticMapping } = require("graphql-compose-elasticsearch")

module.exports.buildGqlSchemaFromEs = (gqlApi) => {
    const elasticClient = new elasticsearch.Client({
        host: gqlApi.source.url,
        apiVersion: gqlApi.source.params.apiVersion
    })

    return fetchElasticMapping({
        elasticIndex: gqlApi.source.params.elasticIndex,
        elasticType: gqlApi.source.params.elasticType,
        elasticClient: elasticClient
    }).then(elasticMapping => {
        const esTC = composeWithElastic({
            graphqlTypeName: gqlApi.source.params.graphqlTypeName,
            elasticIndex: gqlApi.source.params.elasticIndex,
            elasticType: gqlApi.source.params.elasticType,
            elasticMapping: elasticMapping,
            elasticClient: elasticClient,
            prefix: gqlApi.source.params.prefix || "",
            // elastic mapping does not contain information about is fields are arrays or not
            // so provide this information explicitly for obtaining correct types in GraphQL
            // ex: pluralFields: ['skills', 'languages']
            pluralFields: gqlApi.source.params.pluralFields
        })

        const gqlSchema = new GraphQL.GraphQLSchema({
            query: new GraphQL.GraphQLObjectType({
                name: "Query",
                fields: {
                    [gqlApi.source.params.graphqlTypeName]: esTC.getResolver("search").getFieldConfig()
                }
            })
        })

        return { schema: gqlSchema, schemaUrl: gqlApi.source.url }
    })
}