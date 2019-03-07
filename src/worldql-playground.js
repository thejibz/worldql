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
      // {
      //     parentType: "employeesT",
      //     fieldName: "petOfEmployee",
      //     resolver: {
      //         datasource: "petstore",
      //         query: "pet",
      //         args: { petId: (parent) => parent.emp_no % 10 }
      //     }
      // },
      {
        parentType: "employeesT",
        fieldName: "currentDept",
        resolver: {
          datasource: "employees",
          query: "QueryEmployees",
          args: { emp_no: (parent) => parent.emp_no }
        }
      },
      {
        parentType: "current_dept_empT",
        fieldName: "currentSalary",
        resolver: {
          datasource: "employees",
          operation: "query",
          fieldName: "QueryEmployees",
          args: {
            emp_no: (parent, vars) => parent.emp_no,
            to_date: (parent, vars) => parent.to_date
          }
        }
      },
      {
        parentType: "salariesT",
        fieldName: "esSalary",
        resolver: {
          datasource: "company",
          operation: "query",
          fieldName: "company",
          args: {
            q: (parent, vars) => `Employee.Age=${parent.salary % 50}`,
          }
        }
      }
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