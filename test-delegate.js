const { loadSchemaSync } = require('@graphql-tools/load');
const { GraphQLFileLoader } = require('@graphql-tools/graphql-file-loader');
const { wrapSchema, RenameTypes } = require('@graphql-tools/wrap');
const { ApolloServer, gql } = require('apollo-server');
const { WrapQuery, WrapType } = require('@graphql-tools/wrap');
const { SelectionSetNode, Kind } = require('graphql');

class RemoveNonExistentFieldsTransform {
  transformSchema(originalWrappingSchema) {

  }
}

const localSchema = gql`
  type MyFaculty {
    id: ID!
    telephone: String
    emailAddress: String
    hello: String
  }
`;

const remoteSchema = loadSchemaSync("remote-schema.graphql", {
    loaders: [new GraphQLFileLoader()],
});

const typeNameMap = {
  Professor: 'MyProfessor',
  GraduateStudent: "HahahxD"
}

const schema = wrapSchema({
  schema: remoteSchema,
  transforms: [
    new RenameTypes(name => typeNameMap[name] || name), 
    //new WrapType("Faculty", "MyFaculty", "emailAddress")
  ]
});


const server = new ApolloServer({
  schema,
  csrfPrevention: true,
});


server.listen().then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`);
});