emailAddress: String
import { graphql, OperationTypeNode } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { wrapSchema } from '@graphql-tools/wrap';
import { delegateToSchema } from '@graphql-tools/delegate';

function assertSome<T>(input: T): asserts input is Exclude<T, null | undefined> {
    if (input == null) {
    throw new Error("Value should be neither null nor undefined.")
    }
}

const testThisShit = async() => {
    const innerSchema = makeExecutableSchema({
        typeDefs: /* GraphQL */`

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
                faculty: (parent, context, args, info) => console.log("Hahahaha")
            },
        },
    });

    const outerSchema = makeExecutableSchema({
        typeDefs: /* GraphQL */`

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
            myFaculty: (parent, context, args, info) => delegateToSchema({
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
        source: /* GraphQL */`
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