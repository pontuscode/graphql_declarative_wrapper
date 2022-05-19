emailAddress: String
const { graphql, OperationTypeNode, GraphQLSchema, print } = require('graphql');
const { makeExecutableSchema } = require("@graphql-tools/schema");
const { loadSchemaSync, loadTypedefsSync } = require('@graphql-tools/load');
const { addResolversToSchema } = require("@graphql-tools/schema");
const { join } = require("path");
const { GraphQLFileLoader } = require('@graphql-tools/graphql-file-loader');
const { delegateToSchema } = require("@graphql-tools/delegate");
const { ApolloServer, gql } = require('apollo-server');
const { generateLocalSchema } = require("./generate-schema");
const { wrapSchema, introspectSchema, RenameTypes, WrapFields, MapFields, MapLeafValues, RenameObjectFields } = require('@graphql-tools/wrap');
const { fetch } = require("cross-fetch");

const executor = async ({ document, variables }) => {
    const query = print(document);
    const fetchResult = await fetch("http://localhost:4000/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });
    return fetchResult.json();
};
  
const remoteSchema = async () => {
    const schema = await introspectSchema(executor);
  
    return wrapSchema({
      schema,
      executor,
      transforms: [
        new RenameObjectFields((_typeName, fieldName) => fieldName.replace(/^title/, "emailAddress"))
      ]
    });
};

const main = function() {
    /*const remoteSchema = loadSchemaSync("remote-schema.graphql", {
        loaders: [new GraphQLFileLoader()],
    });*/
    /*const schemaWithResolvers = addResolversToSchema({
        schema: loadSchemaSync(join(__dirname, "./remote-servers/src/schema.graphql"), {
          loaders: [new GraphQLFileLoader()],
        }),
        resolvers: {},
    });
    */
   const typeDefs = gql`
        type MyTrack {
            id: ID!
            emailAddress: String
            author: MyAuthor
        }

        type MyAuthor {
            id: ID!
            name: String
        }
        type Query {
            track(id: ID!): MyTrack
            myTracksForHome: [MyTrack]
        }
   `;
    //const localSchema = generateLocalSchema(schemaWithResolvers);

    /*const server = new ApolloServer({
        schema: localSchema,
        csrfPrevention: true,
    });*/

    const resolvers = {
        Query: {
          myTracksForHome: async (parent, args, context, info) => {
            const schema = await remoteSchema();
            const data = await delegateToSchema({
              schema: schema,
              operation: "query",
              fieldName: "tracksForHome",
              context,
              info
            });
            return data;
          },
        },
      };
      
      const server = new ApolloServer({
        typeDefs,
        resolvers,
        introspection: true,
        playground: true,
      });
      server.listen({ port: process.env.PORT || 4001 }).then(({ url }) => {
        console.log(`🐝 Local schema server ready at ${url}`);
      });
    /*server.listen({
        port: 4001
    }).then(({ url }) => {
        console.log(`🚀  Server ready at ${url}`);
    });*/
}

main();