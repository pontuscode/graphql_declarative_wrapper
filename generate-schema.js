const { makeExecutableSchema } = require("@graphql-tools/schema");
const { loadSchemaSync } = require('@graphql-tools/load');
const { GraphQLFileLoader } = require('@graphql-tools/graphql-file-loader');
const { delegateToSchema } = require("@graphql-tools/delegate");

const generateLocalSchema = function(remoteSchema) {
    /*const remoteSchema = loadSchemaSync("remote-schema.graphql", {
        loaders: [new GraphQLFileLoader()],
    });*/

    const localSchema = makeExecutableSchema({
        typeDefs: `
            type Track {
                id: ID!
                emailAddress: String
            },

            type Query {
                track(id: ID!): Track
                tracksForHome: [Track]
            }
        `,
        resolvers: {
            Query: {
                track: (_, args, context, info) => delegateToSchema({
                    schema: remoteSchema,
                    operation: 'query',
                    fieldName: 'track',
                    args: {
                        id: args.id
                    },
                    context,
                    info
                }),
                tracksForHome: (_, __, context, info) => delegateToSchema({
                    schema: remoteSchema,
                    operation: "query",
                    fieldName: "tracksForHome",
                    context,
                    info
                })
            }
        }
    });
    return localSchema;
}


exports.generateLocalSchema = generateLocalSchema;