const { graphql, OperationTypeNode, GraphQLSchema } = require('graphql');
const { makeExecutableSchema } = require("@graphql-tools/schema");
const { loadSchemaSync } = require('@graphql-tools/load');
const { GraphQLFileLoader } = require('@graphql-tools/graphql-file-loader');
const { delegateToSchema } = require("@graphql-tools/delegate");
const { ApolloServer } = require('apollo-server');

const generateLocalSchema = function() {
    const remoteSchema = loadSchemaSync("remote-schema.graphql", {
        loaders: [new GraphQLFileLoader()],
    });

    const localSchema = makeExecutableSchema({
        typeDefs: `
            type MyFaculty {
                id: ID!
                emailAddress: String
            },

            type Query {
                myFaculty(id: ID!): MyFaculty
            }
        `,
        resolvers: {
            Query: {
                myFaculty: (_, args, context, info) => delegateToSchema({
                    schema: remoteSchema,
                    operation: 'query',
                    fieldName: 'faculty',
                    args: {
                        nr: args.id
                    },
                    context,
                    info
                })
            }
        }
    });
    return localSchema;
    //let result = await testIt(localSchema, remoteSchema);
    /*const server = new ApolloServer({
        schema: localSchema,
        csrfPrevention: true,
    });
      
    server.listen().then(({ url }) => {
        console.log(`🚀  Server ready at ${url}`);
    });*/
    
}


exports.generateLocalSchema = generateLocalSchema;