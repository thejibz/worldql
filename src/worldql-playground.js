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
      petstore: {
        url: "http://localhost:8080/api/swagger.json",
        type: "OPEN_API",
        oasGraphConf: {
          viewer: false,
          baseUrl: "http://localhost:8080/api"
        }
      },
      books: {
        url: "http://localhost:8090",
        type: "GRAPHQL",
      },
      company: {
        type: 'ELASTICSEARCH',
        url: 'http://localhost:9200',
        graphqlTypeName: "company",
        elasticIndex: 'companydatabase',
        elasticType: 'employees',
        pluralFields: ['skills', 'languages'],
        apiVersion: '5.6',
      },
      employees: {
        type: "MYSQL",
        mysqlConfig: {
          //debug: ['ComQueryPacket'],
          host: "localhost",
          port: "3306",
          user: "root",
          password: "secret",
          database: "employees",
        }
      },
    },
    stitches: [
      {
        parentType: "departmentsT",
        fieldName: "managerOfDept",
        resolver: {
          datasource: "employees",
          query: "dept_manager",
          groupBy: (parent, vars) => parent.departments.map(d => d.dept_no),
          args: {
            dept_no: (parent, vars, groupValue) => groupValue,
            _limit: () => 10
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