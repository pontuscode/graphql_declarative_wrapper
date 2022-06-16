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
        					}
        					subtree.selections.forEach(selection => {
    
            						if(selection.name.value === "id") {
            							newSelectionSet.selections.push( {
            								kind: Kind.FIELD,
            								name: {
            									kind: Kind.NAME,
            									value: "id"
            								}
            							})
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
    
        							if(selection.name.value === "myModulesCount") {
        								newSelectionSet.selections.push( {
    
                							kind: Kind.FIELD,
                							name: {
                								kind: Kind.NAME,
                								value: "modulesCount"
                							}
            
        								})
        							}
    
        							if(selection.name.value === "concatenateTest") {
        
                    					newSelectionSet.selections.push( {
                    						kind: Kind.FIELD,
                    							name: {
                    								kind: Kind.NAME,
                    								value: "description"
                    							}
                    						}
                    					)
                
                    					newSelectionSet.selections.push( {
                    						kind: Kind.FIELD,
                    							name: {
                    								kind: Kind.NAME,
                    								value: "thumbnail"
                    							}
                    						}
                    					)
                
        							}
        
        						})
        				return newSelectionSet;
        			},
        			result => {
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
        						selections: [] 
        					}
        					subtree.selections.forEach(selection => {
    
            						if(selection.name.value === "id") {
            							newSelectionSet.selections.push( {
            								kind: Kind.FIELD,
            								name: {
            									kind: Kind.NAME,
            									value: "id"
            								}
            							})
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
    
        							if(selection.name.value === "myModulesCount") {
        								newSelectionSet.selections.push( {
    
                							kind: Kind.FIELD,
                							name: {
                								kind: Kind.NAME,
                								value: "modulesCount"
                							}
            
        								})
        							}
    
        							if(selection.name.value === "concatenateTest") {
        
                    					newSelectionSet.selections.push( {
                    						kind: Kind.FIELD,
                    							name: {
                    								kind: Kind.NAME,
                    								value: "description"
                    							}
                    						}
                    					)
                
                    					newSelectionSet.selections.push( {
                    						kind: Kind.FIELD,
                    							name: {
                    								kind: Kind.NAME,
                    								value: "thumbnail"
                    							}
                    						}
                    					)
                
        							}
        
        						})
        				return newSelectionSet;
        			},
        			result => {
        				return result;
        			}
        		)
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
        						selections: [] 
        					}
        					subtree.selections.forEach(selection => {
    
            						if(selection.name.value === "id") {
            							newSelectionSet.selections.push( {
            								kind: Kind.FIELD,
            								name: {
            									kind: Kind.NAME,
            									value: "id"
            								}
            							})
            						}
        
            						if(selection.name.value === "content") {
            							newSelectionSet.selections.push( {
            								kind: Kind.FIELD,
            								name: {
            									kind: Kind.NAME,
            									value: "content"
            								}
            							})
            						}
        
        							if(selection.name.value === "anotherConcatenate") {
        
                    					newSelectionSet.selections.push( {
                    						kind: Kind.FIELD,
                    							name: {
                    								kind: Kind.NAME,
                    								value: "content"
                    							}
                    						}
                    					)
                
                    					newSelectionSet.selections.push( {
                    						kind: Kind.FIELD,
                    							name: {
                    								kind: Kind.NAME,
                    								value: "videoUrl"
                    							}
                    						}
                    					)
                
        							}
        
        						})
        				return newSelectionSet;
        			},
        			result => {
        				return result;
        			}
    
        		),
        	]
        	})
        	return data;
        },
        
        myFullModule: async(_, args, context, info) => {
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
        						selections: [] 
        					}
        					subtree.selections.forEach(selection => {
    
                				if(selection.name.value === "id") {
                					newSelectionSet.selections.push({
                						kind: Kind.FIELD,
                						name: {
                							kind: Kind.NAME,
                							value: "id"
                						}
                					})
                				}
            
                				if(selection.name.value === "title") {
                					newSelectionSet.selections.push({
                						kind: Kind.FIELD,
                						name: {
                							kind: Kind.NAME,
                							value: "title"
                						}
                					})
                				}
            
                				if(selection.name.value === "length") {
                					newSelectionSet.selections.push({
                						kind: Kind.FIELD,
                						name: {
                							kind: Kind.NAME,
                							value: "length"
                						}
                					})
                				}
            
                				if(selection.name.value === "content") {
                					newSelectionSet.selections.push({
                						kind: Kind.FIELD,
                						name: {
                							kind: Kind.NAME,
                							value: "content"
                						}
                					})
                				}
            
                				if(selection.name.value === "durationInSeconds") {
                					newSelectionSet.selections.push({
                						kind: Kind.FIELD,
                						name: {
                							kind: Kind.NAME,
                							value: "durationInSeconds"
                						}
                					})
                				}
            
        					})
        				return newSelectionSet;
        			},
        			(result) => {
        				return result;
        			}
        		),
        	]
        	})
        	return data;
        },
        
        myFullTrack: async(_, args, context, info) => {
        	const schema = await remoteSchema();
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
        					}
        					subtree.selections.forEach(selection => {
    
                				if(selection.name.value === "id") {
                					newSelectionSet.selections.push({
                						kind: Kind.FIELD,
                						name: {
                							kind: Kind.NAME,
                							value: "id"
                						}
                					})
                				}
            
                				if(selection.name.value === "title") {
                					newSelectionSet.selections.push({
                						kind: Kind.FIELD,
                						name: {
                							kind: Kind.NAME,
                							value: "title"
                						}
                					})
                				}
            
                				if(selection.name.value === "thumbnail") {
                					newSelectionSet.selections.push({
                						kind: Kind.FIELD,
                						name: {
                							kind: Kind.NAME,
                							value: "thumbnail"
                						}
                					})
                				}
            
                				if(selection.name.value === "length") {
                					newSelectionSet.selections.push({
                						kind: Kind.FIELD,
                						name: {
                							kind: Kind.NAME,
                							value: "length"
                						}
                					})
                				}
            
                				if(selection.name.value === "modulesCount") {
                					newSelectionSet.selections.push({
                						kind: Kind.FIELD,
                						name: {
                							kind: Kind.NAME,
                							value: "modulesCount"
                						}
                					})
                				}
            
                				if(selection.name.value === "description") {
                					newSelectionSet.selections.push({
                						kind: Kind.FIELD,
                						name: {
                							kind: Kind.NAME,
                							value: "description"
                						}
                					})
                				}
            
                				if(selection.name.value === "numberOfViews") {
                					newSelectionSet.selections.push({
                						kind: Kind.FIELD,
                						name: {
                							kind: Kind.NAME,
                							value: "numberOfViews"
                						}
                					})
                				}
            
                				if(selection.name.value === "durationInSeconds") {
                					newSelectionSet.selections.push({
                						kind: Kind.FIELD,
                						name: {
                							kind: Kind.NAME,
                							value: "durationInSeconds"
                						}
                					})
                				}
            
        					})
        				return newSelectionSet;
        			},
        			(result) => {
        				return result;
        			}
        		),
        	]
        	})
        	return data;
        },
        
        myFullTracks: async(_, __, context, info) => {
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
        						selections: [] 
        					}
        					subtree.selections.forEach(selection => {
    
                				if(selection.name.value === "id") {
                					newSelectionSet.selections.push({
                						kind: Kind.FIELD,
                						name: {
                							kind: Kind.NAME,
                							value: "id"
                						}
                					})
                				}
            
                				if(selection.name.value === "title") {
                					newSelectionSet.selections.push({
                						kind: Kind.FIELD,
                						name: {
                							kind: Kind.NAME,
                							value: "title"
                						}
                					})
                				}
            
                				if(selection.name.value === "thumbnail") {
                					newSelectionSet.selections.push({
                						kind: Kind.FIELD,
                						name: {
                							kind: Kind.NAME,
                							value: "thumbnail"
                						}
                					})
                				}
            
                				if(selection.name.value === "length") {
                					newSelectionSet.selections.push({
                						kind: Kind.FIELD,
                						name: {
                							kind: Kind.NAME,
                							value: "length"
                						}
                					})
                				}
            
                				if(selection.name.value === "modulesCount") {
                					newSelectionSet.selections.push({
                						kind: Kind.FIELD,
                						name: {
                							kind: Kind.NAME,
                							value: "modulesCount"
                						}
                					})
                				}
            
                				if(selection.name.value === "description") {
                					newSelectionSet.selections.push({
                						kind: Kind.FIELD,
                						name: {
                							kind: Kind.NAME,
                							value: "description"
                						}
                					})
                				}
            
                				if(selection.name.value === "numberOfViews") {
                					newSelectionSet.selections.push({
                						kind: Kind.FIELD,
                						name: {
                							kind: Kind.NAME,
                							value: "numberOfViews"
                						}
                					})
                				}
            
                				if(selection.name.value === "durationInSeconds") {
                					newSelectionSet.selections.push({
                						kind: Kind.FIELD,
                						name: {
                							kind: Kind.NAME,
                							value: "durationInSeconds"
                						}
                					})
                				}
            
        					})
        				return newSelectionSet;
        			},
        			(result) => {
        				result.forEach(function(element) {
    
                			if(element.id !== undefined) {
                				element.id = element.id; 
                			}
            
                			if(element.title !== undefined) {
                				element.title = element.title; 
                			}
            
                			if(element.thumbnail !== undefined) {
                				element.thumbnail = element.thumbnail; 
                			}
            
                			if(element.length !== undefined) {
                				element.length = element.length; 
                			}
            
                			if(element.modulesCount !== undefined) {
                				element.modulesCount = element.modulesCount; 
                			}
            
                			if(element.description !== undefined) {
                				element.description = element.description; 
                			}
            
                			if(element.numberOfViews !== undefined) {
                				element.numberOfViews = element.numberOfViews; 
                			}
            
                			if(element.durationInSeconds !== undefined) {
                				element.durationInSeconds = element.durationInSeconds; 
                			}
            
        				});
        				return result;
        			}
        		),
        	]
        	})
        	return data;
        },
    },
	MyTrack: {
		id: (parent) => {
			return (parent.id !== undefined) ? parent.id : null;
		},
		myTitle: (parent) => {
			return (parent.title !== undefined) ? parent.title : null;
		},
		author: (parent) => {
			return (parent.author !== undefined) ? parent.author : null;
		},
		authorName: (parent) => {
			return (parent.author.name !== undefined) ? parent.author.name : null;
		},
		myModulesCount: (parent) => {
			return (parent.modulesCount !== undefined) ? parent.modulesCount : null;
		},

        concatenateTest: async(parent, _, _context, _info) => {
    
            if(parent.concatenateTest === undefined) 
            	parent.concatenateTest = parent.description
            else
            	parent.concatenateTest += parent.description
            
            parent.concatenateTest += " " 

            if(parent.concatenateTest === undefined) 
            	parent.concatenateTest = parent.thumbnail
            else
            	parent.concatenateTest += parent.thumbnail
            
        	return parent.concatenateTest
        }
	},
	MyAuthor: {
		id: (parent) => {
			return (parent.id !== undefined) ? parent.id : null;
		},
		name: (parent) => {
			return (parent.name !== undefined) ? parent.name : null;
		},
	},
	MyModule: {
		id: (parent) => {
			return (parent.id !== undefined) ? parent.id : null;
		},
		content: (parent) => {
			return (parent.content !== undefined) ? parent.content : null;
		},

        anotherConcatenate: async(parent, _, _context, _info) => {
    
            if(parent.anotherConcatenate === undefined) 
            	parent.anotherConcatenate = parent.content
            else
            	parent.anotherConcatenate += parent.content
            
            parent.anotherConcatenate += " " 

            if(parent.anotherConcatenate === undefined) 
            	parent.anotherConcatenate = parent.videoUrl
            else
            	parent.anotherConcatenate += parent.videoUrl
            
        	return parent.anotherConcatenate
        }
	},

}
module.exports = resolvers;    
    