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
            const data = await delegateToSchema({
                schema: schema,
                
                operation: 'query',
                fieldName: 'track',
                args: {
                    id: args.id,
                    thumbnail: args.concatenateTest
                },
                context: {
                    concatenatedTest: args.thumbnail //Det här verkar inte göra nånting :(
                }, 
                info,
                // transforms: [
                //     WrapQuery
                // ]
                    
                transforms: [
                    new WrapQuery(
                        ["track"],
                        (subtree) => {
                            // console.log(subtree.selections[0]);
                            const newSelectionSet = {
                                kind: Kind.SELECTION_SET,
                                selections: []
                            };

                            subtree.selections.forEach(selection => {
                                if(selection.name.value === "concatenateTest"){
                                    ["thumbnail"].forEach(function(currName) { //This should not be hardcoded!
                                        console.log(currName);
                                        temp = {
                                            kind: Kind.FIELD,
                                            name: {
                                                kind: Kind.NAME,
                                                value: currName
                                            }
                                            // value: {
                                            //     kind: Kind.VARIABLE,
                                            //     name: {
                                            //         kind: Kind.NAME,
                                            //         value: currName
                                            //     }
                                            // }
                                        }
                                        newSelectionSet.selections.push(temp);
                                    })
                                }
                                else{
                                    newSelectionSet.selections.push(selection);
                                }
                                // newSelectionSet.selections.push(selection);
                                // console.log(selection);
                            })
                                // selections: subtree.selections.map(selection => {
                                //     if(selection.name.value === "concatenateTest") {
                                //         // console.log(selection.name.value);
                                //         return {
                                //             // kind: Kind.SELECTION_SET,
                                            
                                //             kind: Kind.FIELD,
                                //             name: {
                                //                 kind: Kind.NAME,
                                //                 value: "thumbnail"
                                //             },
                                //             value: {
                                //                 kind: Kind.VARIABLE,
                                //                 name: {
                                //                     kind: Kind.NAME,
                                //                     value: "thumbnail"
                                //                 }
                                //             }
                                //              &&
                                //             {   
                                //                 kind: Kind.FIELD,
                                //                 name: {
                                //                     kind: Kind.NAME,
                                //                     value: "description"
                                //                 },
                                //                 value: {
                                //                     kind: Kind.VARIABLE,
                                //                     name: {
                                //                         kind: Kind.NAME,
                                //                         value: "description"
                                //                     }
                                //                 }
                                //             }
                                //         }   
                                //     } else {
                                //         return selection;
                                //     }
                                // }),
                            //   };
                              //console.log(newSelectionSet.selections[2]);
                            // console.log(newSelectionSet);
                            console.log("return works");
                            newSelectionSet.selections.forEach(function(element){
                                console.log(element);
                            })
                            // console.log(subtree);
                            return newSelectionSet;
                        },
                        (result) => {
                            console.log("HEY");
                            console.log(result);
                            result.concatenateTest = result.thumbnail + " " + result.description;
                            return result;
                        }
                    ),


                    // Wrap document takes a subtree as an AST node
                //     new TransformQuery({
                //       // path at which to apply wrapping and extracting
                //       path: ['track'],
                //       queryTransformer: (subtree) => ({
                //         kind: Kind.SELECTION_SET,
                //         selections: [
                //           {
                //             // we create a wrapping AST Field
                //             kind: Kind.FIELD,
                //             name: {
                //               kind: Kind.NAME,
                //               // that field is `address`
                //               value: 'thumbnail',
                //             },
                //             // Inside the field selection
                //             selectionSet: subtree,
                //           },
                //           {
                //             // we create a wrapping AST Field
                //             kind: Kind.FIELD,
                //             name: {
                //               kind: Kind.NAME,
                //               // that field is `address`
                //               value: 'description',
                //             },
                //             // Inside the field selection
                //             selectionSet: subtree,
                //           },
                //         ],
                //       }),
                //       // how to process the data result at path
                //       resultTransformer: (result) => {
                //           console.log("yep " + result?.description);
                //           return (result?.description)
                //       },
                //       errorPathTransformer: (path) => path.slice(1),
                //     }),
                  ],
//                 transforms: [
// // https://github.com/ardatan/graphql-tools/blob/27d1b77b790e81225d8b767f2fa2fe259e8cb37d/src/test/transforms.test.ts#L1180
// //  Check the above for examples of how to use transforms.
//                     // WrapQuery
//                 ]
                // transforms : [
                //     WrapFields ( " g r a d u a t e s t u d e n t _ b y _ p k " , [ createField ( " nr " ) ,
                //     ... fields ]) ,
                // ] ,

                // transforms: [
                //     transformMyTrack()
                // ]
            })
            console.log(data);
            // data["concatenateTest"] = 

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
    