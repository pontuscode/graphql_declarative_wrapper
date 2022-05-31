const { wrapSchema, WrapQuery, introspectSchema, RenameTypes, WrapFields, MapFields, MapLeafValues, RenameObjectFields } = require('@graphql-tools/wrap');
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
    transforms: [
        new RenameObjectFields((_typeName, fieldName) => fieldName.replace(/^title/, "myTitle"))
    ]
    });
};

const createField = (name) => {
    return {
        kind: Kind.FIELD,
        name: {
            kind: Kind.NAME,
            value: name,
        },
        arguments: [],
        directives: [],
    }
};

const createTwoLayeredField = (name, fields) => {
    const field = createField(name);
    field.selectionSet = {
        kind: Kind.SELECTION_SET,
        selections: fields
    }
    return field;
}

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
                        ["tracksForHome"],
                        (subtree) => {
                            //console.log(subtree);
                            const newSelectionSet = {
                                kind: Kind.SELECTION_SET,
                                selections: subtree.selections.map(selection => {
                                    if(selection.name.value === "authorPhoto") {
                                        return {
                                            kind: Kind.FIELD,
                                            name: {
                                                kind: Kind.NAME,
                                                value: "author"
                                            },
                                            selectionSet: {
                                                kind: Kind.SELECTION_SET,
                                                selections: [{
                                                    kind: Kind.FIELD,
                                                    name: {
                                                        kind: Kind.NAME,
                                                        value: "photo"
                                                    }   
                                                }]
                                            }
                                        }
                                    } else {
                                        return selection;
                                    }
                                }),
                              };
                              //console.log(newSelectionSet.selections[2]);
                              return newSelectionSet;
                        },
                        (result) => {
                            //authorPhoto: result.author.photo
                            result.forEach(function(element) {
                                element.authorPhoto = element.author.photo;
                            })
                            console.log(result);
                            return result;
                        }
                    ),
                    new WrapQuery(
                        ['tracksByHome', 'authorPhoto'],
                        (subtree) => subtree,
                        result => result
                    ),
                ]
            });
            //console.log(data);
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
        /*myAuthor: async(_, args, context, info) => {
            const schema = await remoteSchema();
            const result = await execute({
                schema,
                document: parse(`
                  query {
                    Author(id: "cat-1") {
                        id
                        name
                    }
                  }
                `),
              });
            
            return result.data.tracksForHome.forEach(function(result) {
                if(result.author.id === args.id){
                    console.log(result.author);
                    return result.author;
                }
            });
        }*/
    }
}
module.exports = resolvers;    
    