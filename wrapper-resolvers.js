const { wrapSchema, WrapQuery, introspectSchema, RenameObjectFields } = require('@graphql-tools/wrap');
const { fetch } = require("cross-fetch");
const { delegateToSchema } = require("@graphql-tools/delegate");
const { print } = require("graphql/language");
const { Kind } = require('graphql');

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
    executor
    });
};

const createSelectionSet = function(name) {
    return {
        kind: Kind.FIELD,
        name: {
            kind: Kind.NAME,
            value: name
        }
    }
}

const addFieldToSelectionSet = function(field, selectionSet) {
    selectionSet.selections.push({
        kind: Kind.FIELD,
        name: {
            kind: Kind.FIELD,
            value: field
        }
    })
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
                                    }
                                    if(selection.name.value === "id") {
                                        return {
                                            kind: Kind.FIELD,
                                            name: {
                                                kind: Kind.NAME,
                                                value: "id"
                                            }
                                        }
                                    }
                                    if(selection.name.value === "myTitle") {
                                        return {
                                            kind: Kind.FIELD,
                                            name: {
                                                kind: Kind.NAME,
                                                value: "title"
                                            }
                                        }
                                    }
                                }),
                              };
                              return newSelectionSet;
                        },
                        (result) => {
                            result.forEach(function(element) {
                                if(element.author !== undefined)
                                    if(element.author.photo !== undefined)
                                        element.authorPhoto = element.author.photo;
                                if(element.id !== undefined)
                                    element.id = element.id
                                if(element.title !== undefined)
                                    element.myTitle = element.title
                            })
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
                info,
                transforms: [
                    new WrapQuery(
                        ["module"],
                        (subtree) => {
                            const newSelectionSet = {
                                kind: Kind.SELECTION_SET,
                                selections: subtree.selections.map(selection => {
                                    if(selection.name.value === "myTitleHaha") {
                                        return {
                                            kind: Kind.FIELD,
                                            name: {
                                                kind: Kind.NAME,
                                                value: "title"
                                            }
                                        }
                                    } 
                                    if(selection.name.value === "id") {
                                        return {
                                            kind: Kind.FIELD,
                                            name: {
                                                kind: Kind.NAME,
                                                value: "id"
                                            }
                                        }
                                    }
                                    if(selection.name.value === "content") {
                                        return {
                                            kind: Kind.FIELD,
                                            name: {
                                                kind: Kind.NAME,
                                                value: "content"
                                            }
                                        }
                                    }
                                })
                            }
                            return newSelectionSet;
                        },
                        (result) => {
                            result.id = result.id;
                            result.myTitleHaha = result.title;
                            result.content = result.content;
                            return result;
                        }
                    )
                ]
            })
            return data;
        },
    }
}
module.exports = resolvers;    

/*
(result) => {
    result.forEach(function(element) {
        if(element.author !== undefined)
            if(element.author.photo !== undefined)
                element.authorPhoto = element.author.photo;
        if(element.id !== undefined)
            element.id = element.id
        if(element.title !== undefined)
            element.myTitle = element.title
    })
    return result;
*/