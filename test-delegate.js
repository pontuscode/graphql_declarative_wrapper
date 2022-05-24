const { loadSchemaSync, loadDocumentsSync } = require('@graphql-tools/load');
const { GraphQLFileLoader } = require('@graphql-tools/graphql-file-loader');
const { wrapSchema, RenameTypes } = require('@graphql-tools/wrap');
const { ApolloServer, gql } = require('apollo-server');
const { WrapQuery, WrapType } = require('@graphql-tools/wrap');
const { SelectionSetNode, Kind } = require('graphql');
const { join } = require("path");
const resolvers  = require("./wrapper-resolvers");
const { addResolversToSchema } = require("@graphql-tools/schema");

class RemoveNonExistentFieldsTransform {
  transformSchema(originalWrappingSchema) {

  }
}

const schemaWithResolvers = addResolversToSchema({
  schema: loadSchemaSync(join(__dirname, "./wrapper-schema.graphql"), {
    loaders: [new GraphQLFileLoader()],
  }),
  resolvers: resolvers,
});

const server = new ApolloServer({
  schema: schemaWithResolvers,
  csrfPrevention: true,
});


server.listen({ port: process.env.PORT || 4001 }).then(({ url }) => {
  console.log(`🐝 Local schema server ready at ${url}`);
});