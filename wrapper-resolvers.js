const { wrapSchema, introspectSchema, RenameTypes, MapFields, MapLeafValues, RenameObjectFields, TransformObjectFields, WrapQuery, WrapFields, TransformQuery, defaultCreateProxyingResolver } = require('@graphql-tools/wrap');
const { fetch } = require("cross-fetch");
const { delegateToSchema } = require("@graphql-tools/delegate");
const { print } = require("graphql/language");
const { SingleFieldSubscriptionsRule, SelectionSetNode } = require('graphql');
const { visit, Kind, visitWithTypeInfo, TypeInfo } = require('graphql');

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



// const WrapFields = (path, fields) => {
//     return new WrapQuery([path], (subtree) => {
//         console.log("tja");
//         if(!subtree)
//             return {
//                 kind:"SelectionSet",
//                 selections: [...fields],
//             };
//         subtree.selections = [...subtree.selections, ...fields];
//         return subtree;
//     },
//     (result) => {return result;}
//     );
// }

const remoteSchema = async () => {
    const schema = await introspectSchema(executor);
    return wrapSchema({
    schema,
    executor,
    // transforms: [
    //     new WrapQuery (
    //     // path at which to apply wrapping and extracting
    //     [ path ] ,
    //     // modify the SelectionSetNode
    //     ( subtree: SelectionSetNode ) => subtree ,
    //     // how to process the data result at path
    //     result => result ,
    //     ) 
    // ]
    // transforms: [
    //     new WrapQuery(
    //         [ 'track' ],
    //         (subtree) => {
    //           return {
        
    //             selectionSet: {
    //                 thing: Kind.SELECTION_SET,
    //                 selections: [
    //                 {
    //                     kind: Kind.FIELD,
    //                     name: {
    //                         kind: Kind.NAME,
    //                         value: "thumbnail"
    //                     },
    //                     value: {
    //                         kind: Kind.VARIABLE,
    //                         name: {
    //                         kind: Kind.NAME,
    //                         value: "thumbnail"
    //                         }
    //                     }
    //                     },
    //                     {
    //                     kind: Kind.FIELD,
    //                     name: {
    //                         kind: Kind.NAME,
    //                         value: "description"
    //                     },
    //                     value: {
    //                         kind: Kind.VARIABLE,
    //                         name: {
    //                         kind: Kind.NAME,
    //                         value: "description"
    //                         }
    //                     }
    //                     }
    //                 ],
    //                 selectionSet: subtree
    //             }

                
    //           }
    //         }
    //       , 
    //       result => result && result.myTrack)
    //     ]


        // new TransformObjectFields((typeName, fieldName, fieldConfig) => { 
        //     let curr;
        //     console.log(fieldConfig);
        //     console.log("typeName: " + typeName + "-- fieldName: " +fieldName);
        //     if(typeName === "Track")
        //         console.log("yep");
        //     // if(fieldName === "concatenateTest") console.log("hello"); 
        //     return [`${fieldName}`, fieldConfig]}),
        // new WrapFields = (path, fields) => {
        //     new WrapQuery([path], (subtree) => {
        //         console.log(subtree);
        //         if(!subtree)
        //             return {
        //                 kind:"SelectionSet",
        //                 selections: [...fields],
        //             };
        //         subtree.selections = [...subtree.selections, ...fields];
        //         return subtree;
        //     },
        //     (result) => {return result;}
        //     );
        // }


        // new WrapFields("MyTrack")
    
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
                info,


            })
            return data;
        },
        myTrack: async(_, args, context, info) => {
            const schema = await remoteSchema();
            const listOfStuff = [["thumbnail", true],[" ", false], ["description", true]];
            const data = await delegateToSchema({
                schema: schema,
                
                operation: 'query',
                fieldName: 'track',
                args: {
                    id: args.id
                },
                context,
                info,
                transforms: [
                    new WrapQuery(
                        ["track"],
                        (subtree) => {
                            const newSelectionSet = {
                                kind: Kind.SELECTION_SET,
                                selections: []
                            };
                            subtree.selections.forEach(selection => {
                                if(selection.name.value === "concatenateTest"){
                                    listOfStuff.forEach(function(currName) { //This forEach function will add a new selection the the selectionSet for the (to be) concatenated field.
                                        if(currName[1] === true){
                                            temp = {
                                                kind: Kind.FIELD,
                                                name: {
                                                    kind: Kind.NAME,
                                                    value: currName[0]
                                                }
                                            }
                                            newSelectionSet.selections.push(temp);
                                        }
                                    })
                                }
                                else{
                                    newSelectionSet.selections.push(selection);
                                }

                            })

                            return newSelectionSet;
                        },
                        (result) => {
                            for(var pair in listOfStuff){
                                if(listOfStuff[pair][1] === true)
                                {
                                    if(result.concatenateTest === undefined)
                                        result.concatenateTest = result[listOfStuff[pair][0]];
                                    else
                                        result.concatenateTest += result[listOfStuff[pair][0]];
                                    
                                }
                                else
                                    result.concatenateTest += listOfStuff[pair][0];
                            }
                            return result;
                        }
                    ),
                  ],

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
    