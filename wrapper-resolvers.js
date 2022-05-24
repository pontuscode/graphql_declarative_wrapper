const { wrapSchema, introspectSchema, RenameTypes, WrapFields, MapFields, MapLeafValues, RenameObjectFields } = require('@graphql-tools/wrap');
const { fetch } = require("cross-fetch");
const { delegateToSchema } = require("@graphql-tools/delegate");
const { print } = require("graphql/language");

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
        myTracks: async(_, __, context, info) => {
            const schema = await remoteSchema();
            const data = await delegateToSchema({
                schema: schema,
                operation: 'query',
                fieldName: 'tracksForHome',
                context, 
                info
            })
            return data;
        },
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
    