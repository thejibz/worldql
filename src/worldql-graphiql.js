const express = require("express")
const graphqlHTTP = require("express-graphql")
const worldql = require("./worldql-core")
const { printSchema } = require("graphql")

const app = express()

const gqlApis = [
    {
        // source: {
        //   url: 'http://localhost:9200',
        //   type: 'ELASTICSEARCH',
        //   params: {
        //     elasticIndex: 'companydatabase',
        //     elasticType: 'employees',
        //     pluralFields: ['skills', 'languages'],
        //     apiVersion: '5.6',
        //   },
        // },
        source: {
            url: "http://tpels005s.priv.atos.fr:9200/",
            type: "ELASTICSEARCH",
            params: {
                graphqlTypeName:  "itdiscovery",
                elasticIndex: "itdiscovery_2018.11.25",
                elasticType: "default",
                apiVersion: "5.6",
            },
        },
    },
]

worldql.buildGqlSchema(gqlApis).then(gqlSchema => {
    app.use(
        "/graphql",
        graphqlHTTP({
            schema: gqlSchema,
            graphiql: true,
        })
    )

    app.listen(4000)
})
