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

const resolvers = {
    Query: {
        
        myTrack: async(_, args, context, info) => {
        	const schema = await remoteSchema();
            const concValues = [["thumbnail", true],[" ", false], ["description", true]];
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
                            newSelectionSet = {
                                kind: Kind.SELECTION_SET,
                                selections: []
                            }


                            subtree.selections.forEach(selection => {
                                if(selection.name.value === "concatenateTest"){
                                    concValues.forEach(function(currName) { //This forEach function will add a new selection the the selectionSet for the (to be) concatenated field.
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

                                if(selection.name.value === "id") {
                                    newSelectionSet.selections.push( {
                                        kind: Kind.FIELD,
                                        name: {
                                            kind: Kind.NAME,
                                            value: "id"
                                        }
                                    });
                                }
    
                                if(selection.name.value === "myTitle") {
                                    newSelectionSet.selections.push( {
                                        kind: Kind.FIELD,
                                        name: {
                                            kind: Kind.NAME,
                                            value: "title"
                                        }
                                    })
                                }
    
                                if(selection.name.value === "author") {
                                    newSelectionSet.selections.push( {
                                        kind: Kind.FIELD,
                                        name: {
                                            kind: Kind.NAME,
                                            value: "author"
                                        },
                                        selectionSet: {
                                            kind: Kind.SELECTION_SET,
                                            selections: [
    
                                                {
                                                    kind: Kind.FIELD,
                                                    name: {
                                                        kind: Kind.NAME,
                                                        value: "id"
                                                    }
                                                },
            
                                                {
                                                    kind: Kind.FIELD,
                                                    name: {
                                                        kind: Kind.NAME,
                                                        value: "name"
                                                    }
                                                },
            
                                            ]
                                        }
                                    })
                                }
    
                                if(selection.name.value === "authorName") {
                                    newSelectionSet.selections.push( {

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
                                                    value: "name"
                                                }
        
                                            }]
                                        }
            
                                    })
                                }
                            })
        				return newSelectionSet;
        			},
        			(result) => {
    
            			if(result.id !== undefined) {
            				result.id = result.id;
            			}
        
            			if(result.title !== undefined) {
            				result.myTitle = result.title;
            			}
        
            			if(result.author !== undefined) {
            				result.author = result.author;
            			}
        
                    	if(result.author !== undefined) {
                
                    		result.authorName = result.author.name;
                
                        	}
                        for(var pair in concValues){
                            if(concValues[pair][1] === true)
                            {
                                if(result.concatenateTest === undefined)
                                    result.concatenateTest = result[concValues[pair][0]];
                                else
                                    result.concatenateTest += result[concValues[pair][0]];            
                            }
                            else
                                result.concatenateTest += concValues[pair][0];
                        }
        				return result;
        			}
        		    ),
        	    ]
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
        
            						if(selection.name.value === "author") {
            							return {
            								kind: Kind.FIELD,
            								name: {
            									kind: Kind.NAME,
            									value: "author"
            								},
            								selectionSet: {
            									kind: Kind.SELECTION_SET,
            									selections: [
        
                    								{
                    									kind: Kind.FIELD,
                    									name: {
                    										kind: Kind.NAME,
                    										value: "id"
                    									}
                    								},
                
                    								{
                    									kind: Kind.FIELD,
                    									name: {
                    										kind: Kind.NAME,
                    										value: "name"
                    									}
                    								},
                
            									]
            								}
            							}
            						}
        
        							if(selection.name.value === "authorName") {
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
                										value: "name"
                									}
            
                    								}]
                    							}
                
        								}
        							}
    
        						})
        					};
        				return newSelectionSet;
        			},
        			(result) => {
        				result.forEach(function(element) {
    
            				if(element.id !== undefined) {
            					element.id = element.id;
            				}
        
            				if(element.title !== undefined) {
            					element.myTitle = element.title;
            				}
        
            				if(element.author !== undefined) {
            					element.author = element.author;
            				}
        
                    		if(element.author !== undefined) {
                
                    			element.authorName = element.author.name;
                
                        	}
                    
        				})
        				return result;
        			}
        		),
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
        		info,
        		transforms: [
        			new WrapQuery(
        				["module"],
        				(subtree) => {
        					const newSelectionSet = {
        						kind: Kind.SELECTION_SET,
        						selections: subtree.selections.map(selection => {
    
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
        					};
        				return newSelectionSet;
        			},
        			(result) => {
    
            			if(result.id !== undefined) {
            				result.id = result.id;
            			}
        
            			if(result.content !== undefined) {
            				result.content = result.content;
            			}
        
        				return result;
        			}
        		),
        	]
        	})
        	return data;
        },
    }
}
module.exports = resolvers;    
    