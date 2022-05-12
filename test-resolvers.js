emailAddress: String
const { graphql, OperationTypeNode, GraphQLSchema } = require('graphql');
const { makeExecutableSchema } = require("@graphql-tools/schema");
const { loadSchemaSync } = require('@graphql-tools/load');
const { GraphQLFileLoader } = require('@graphql-tools/graphql-file-loader');
const { delegateToSchema } = require("@graphql-tools/delegate");
const { ApolloServer } = require('apollo-server');
const { generateLocalSchema } = require("./generate-schema");

const testIt = async(localSchema, remoteSchema) => {
    return "hahahahahahahaha";
}

const main = function() {
    const remoteSchema = loadSchemaSync("remote-schema.graphql", {
        loaders: [new GraphQLFileLoader()],
    });

    const localSchema = generateLocalSchema();

    const server = new ApolloServer({
        schema: localSchema,
        csrfPrevention: true,
    });
      
    server.listen().then(({ url }) => {
        console.log(`🚀  Server ready at ${url}`);
    });
}

main();