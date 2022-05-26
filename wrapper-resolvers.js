const { wrapSchema, introspectSchema, RenameTypes, WrapFields, WrapQuery, MapFields, MapLeafValues, RenameObjectFields } = require('@graphql-tools/wrap');
const { fetch } = require("cross-fetch");
const { delegateToSchema } = require("@graphql-tools/delegate");
const { print } = require("graphql/language");
const { execute, GraphQLSchema, Kind, OperationTypeNode, parse, SelectionSetNode } = require('graphql');

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
    /*transforms: [
        new RenameObjectFields((_typeName, fieldName) => fieldName.replace(/^title/, "emailAddress"))
    ]*/
    });
};

const resolvers = {
    Query: {
        myTrack: async(_, args, context, info) => {
            const schema = await remoteSchema();
            const data = await delegateToSchema({
                schema: schema,
                operation: 'query',
                fieldName: 'track',
                args: {
                    id: args.id
                },
                context, 
                info
            })
            return data;
        },
        myTracks: async(_, __, context, info) => {
            const schema = await remoteSchema();
            const data = await delegateToSchema({
                schema: schema,
                operation: 'query',
                fieldName: 'tracksForHome',
                context, 
                info,
                transforms: [
                    new WrapQuery(
                    // path at which to apply wrapping and extracting
                        ['tracksForHome'], 
                        (subtree) => {
                        var newSelectionSet = {
                            kind: Kind.SELECTION_SET,
                            selections: subtree.selections.map(function (selection) {
                                // just append fragments, not interesting for this test
                                if (selection.kind === Kind.INLINE_FRAGMENT || selection.kind === Kind.FRAGMENT_SPREAD) {
                                    return selection;
                                }
                                // prepend `address` to name and camelCase
                                var oldFieldName = selection.name.value;
                                return {
                                    kind: Kind.FIELD,
                                    name: {
                                        kind: Kind.NAME,
                                        value: oldFieldName,
                                    },
                                };
                            }),
                        };
                        console.log(newSelectionSet.selections);
                        return newSelectionSet;
                    },
                    result => { 
                        console.log(result);
                        return result; 
                    }), 
                ]
            })
            return data;
        },
        myModule: async(_, args, context, info) => {
            const schema = await remoteSchema();
            const data = await delegateToSchema({
                schema: schema,
                operation: 'query',
                fieldName: 'module',
                args: {
                    id: args.id
                },
                context, 
                info
            })
            return data;
        },
    }
}
module.exports = resolvers;    
    