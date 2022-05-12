emailAddress: String
const { graphql, OperationTypeNode, GraphQLSchema } = require('graphql');
const { makeExecutableSchema } = require("@graphql-tools/schema");
const { loadSchemaSync } = require('@graphql-tools/load');
const { GraphQLFileLoader } = require('@graphql-tools/graphql-file-loader');
const { delegateToSchema } = require("@graphql-tools/delegate");
const { ApolloServer } = require('apollo-server');
//import { makeExecutableSchema } from '@graphql-tools/schema';
//import { delegateToSchema } from '@graphql-tools/delegate';
//import { loadSchemaSync } from '@graphql-tools/load';
//import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader';
//import { GraphQLSchema } from 'graphql';
//import { ApolloServer } from 'apollo-server/node_modules/apollo-server-express';
/*
function assertSome<T>(input: T): asserts input is Exclude<T, null | undefined> {
    if (input == null) {
        throw new Error("Value should be neither null nor undefined.")
    }
}
*/
const testIt = async(localSchema, remoteSchema) => {
    //console.log(localSchema);
    return "hahahahahahahaha";
}

const main = function() {
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
    //let result = await testIt(localSchema, remoteSchema);
    const server = new ApolloServer({
        schema: localSchema,
        csrfPrevention: true,
    });
      
    server.listen().then(({ url }) => {
        console.log(`🚀  Server ready at ${url}`);
    });
}

main();
/*
const testThisShit = async() => {
    const innerSchema = makeExecutableSchema({
        typeDefs: `
            type Faculty {
                id: ID!
                emailAddress: String
                phoneNumber: String
            }

            type Query {
                test(input: String): String
                faculty: Faculty
            }
        `,
        resolvers: {
            Query: {
                test: (_root, args) => args.input,
                faculty: (parent, args, context, info) => console.log("Hahahaha")
            },
        },
    });

    const outerSchema = makeExecutableSchema({
        typeDefs: `
            type MyFaculty {
                id: ID!
                emailAddress: String
            }

            type Query {
                delegateToSchema(input: String): String
                myFaculty: MyFaculty
            }
        `,
        resolvers: {
        Query: {
            delegateToSchema: (_root, args, context, info) => delegateToSchema({
                schema: innerSchema,
                operation: 'query' as OperationTypeNode,
                fieldName: 'test',
                args,
                context,
                info,
            }),
            myFaculty: (_, args, context, info) => delegateToSchema({
                schema: innerSchema,
                operation: 'query' as OperationTypeNode,
                fieldName: 'faculty',
                args, 
                context, 
                info
            })
        },
        },
    });

    const result = await graphql({
        schema: outerSchema,
        source: `
        query {
            myFaculty {
                emailAddress
            }
        }
        `,
    });
    assertSome(result.data);
    console.log(result.data["delegateToSchema"]);
}

testThisShit();
*/