const worldql = require("./worldql-core")
const { ApolloServer } = require('apollo-server')


/* For introspection
query {
  __schema {
    types {
      name
      fields {
        name
      }
    }
  }
}
*/

async function main() {
  const wqlConf = {
    datasources: {
      character: {
        url: `${__dirname}/../test/data/file/character.graphql`,
        type: "FILE",
        resolvers: {
          Query: {
            listOfCharacters: () => {
              return {
                list: [{
                  name: "Robert",
                  age: 32,
                  weight: 100,
                  height: 180
                }, {
                  name: "Katty",
                  age: 22,
                  weight: 60,
                  height: 170
                }, {
                  name: "Alfred",
                  age: 55,
                  weight: 85,
                  height: 190
                }]
              }
            },
            bmi: (obj, args, context, info) => { return args.height / args.weight }
          }
        }
      },
    },
    stitches: [
      {
        parentType: "ListOfCharacters",
        fieldName: "bmi",
        resolver: {
          datasource: "character",
          query: "bmi",
          groupBy: (parent, vars) => parent.list,
          args: {
            weight: (parent, vars, groupValue) => groupValue.weight,
            height: (parent, vars, groupValue) => groupValue.height
          }
        }
      },
    ]
  }

  const server = new ApolloServer({
    schema: await worldql.buildGqlSchema(wqlConf),
    playground: true,
    debug: true,
    tracing: true
  })

  server.listen().then(({ url }) => {
    console.log(`🚀 Server ready at ${url}`)
  })
}

main()