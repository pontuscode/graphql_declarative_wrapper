const { wrapSchema, WrapQuery, introspectSchema, RenameObjectFields } = require('@graphql-tools/wrap')
const { fetch } = require('cross-fetch');
const { delegateToSchema } = require('@graphql-tools/delegate')
const { print } = require('graphql/language');
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

let schema;

const getRemoteSchema = async() => {
	schema = await remoteSchema();
}

getRemoteSchema();

const resolvers = {
	Query: {
    
        myStudent: async(_, args, context, info) => {
        	const data = await delegateToSchema({
        		schema: schema,
        		operation: 'query',
        		fieldName: 'student',
        		args: {
        			id: args.id
        		},
        		context, 
        		info,
        		transforms: [
        			new WrapQuery(
        				["student"],
        				(subtree) => {
        					const newSelectionSet = {
        						kind: Kind.SELECTION_SET,
        						selections: [] 
        					}
        					subtree.selections.forEach(selection => {
    							if(selection.name.value === "id"){
								newSelectionSet.selections.push({
									kind: Kind.FIELD, 
									name: {
										kind: Kind.NAME, 
										value: "id"
									},
								})
							}
							if(selection.name.value === "firstName"){
								newSelectionSet.selections.push({
									kind: Kind.FIELD, 
									name: {
										kind: Kind.NAME, 
										value: "firstName"
									},
								})
							}
							if(selection.name.value === "surName"){
								newSelectionSet.selections.push({
									kind: Kind.FIELD, 
									name: {
										kind: Kind.NAME, 
										value: "lastName"
									},
								})
							}
						if(selection.name.value === "myProfessors") {
							newSelectionSet.selections.push({
								kind: Kind.FIELD,
								name: {
									kind: Kind.NAME,
									value: "professors"
								},
								selectionSet: extractNestedMyProfessorFields(selection)
							})
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
        
        myProfessor: async(_, args, context, info) => {
        	const data = await delegateToSchema({
        		schema: schema,
        		operation: 'query',
        		fieldName: 'professor',
        		args: {
        			id: args.id
        		},
        		context, 
        		info,
        		transforms: [
        			new WrapQuery(
        				["professor"],
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
    
        						if(selection.name.value === "firstName") {
        							newSelectionSet.selections.push( {
    
                						kind: Kind.FIELD,
                						name: {
                							kind: Kind.NAME,
                							value: "firstName"
                						}
            
        							})
        						}
    							if(selection.name.value === "surName"){
								newSelectionSet.selections.push({
									kind: Kind.FIELD, 
									name: {
										kind: Kind.NAME, 
										value: "lastName"
									},
								})
							}
						if(selection.name.value === "teacherOf") {
							newSelectionSet.selections.push({
								kind: Kind.FIELD,
								name: {
									kind: Kind.NAME,
									value: "teaches"
								},
								selectionSet: extractNestedMyClassFields(selection)
							})
						}
						if(selection.name.value === "examinerOf") {
							newSelectionSet.selections.push({
								kind: Kind.FIELD,
								name: {
									kind: Kind.NAME,
									value: "examinerOf"
								},
								selectionSet: extractNestedMyStudentFields(selection)
							})
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
        
        myClasss: async(_, __, context, info) => {
        	const data = await delegateToSchema({
        		schema: schema,
        		operation: 'query',
        		fieldName: 'classes',
        		context, 
        		info,
        		transforms: [
        			new WrapQuery(
        				["classes"],
        				(subtree) => {
        					const newSelectionSet = {
        						kind: Kind.SELECTION_SET,
        						selections: [] 
        					}
        					subtree.selections.forEach(selection => {
							if(selection.name.value === "id"){
								newSelectionSet.selections.push({
									kind: Kind.FIELD, 
									name: {
										kind: Kind.NAME, 
										value: "id"
									},
								})
							}

        						if(selection.name.value === "professorSurName") {
        							newSelectionSet.selections.push( {
    
                						kind: Kind.FIELD,
                						name: {
                							kind: Kind.NAME,
                							value: "teaches"
                						}, 
                						selectionSet: {
                							kind: Kind.SELECTION_SET,
                							selections: [{
            
                								kind: Kind.FIELD,
                								name: {
                									kind: Kind.NAME,
                									value: "lastName"
                								}
            
                    						}]
                    					}
                
        							})
        						}
    						if(selection.name.value === "teaches") {
							newSelectionSet.selections.push({
								kind: Kind.FIELD,
								name: {
									kind: Kind.NAME,
									value: "teaches"
								},
								selectionSet: extractNestedMyProfessorFields(selection)
							})
						}
						if(selection.name.value === "students") {
							newSelectionSet.selections.push({
								kind: Kind.FIELD,
								name: {
									kind: Kind.NAME,
									value: "students"
								},
								selectionSet: extractNestedMyStudentFields(selection)
							})
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
    },
	MyStudent: {
		id: (parent) => {
			return (parent.id !== undefined) ? parent.id : null;
		},
		firstName: (parent) => {
			return (parent.firstName !== undefined) ? parent.firstName : null;
		},
		surName: (parent) => {
			return (parent.lastName !== undefined) ? parent.lastName : null;
		},
		myProfessors: (parent) => {
			return (parent.professors !== undefined) ? parent.professors : null;
		},
	},
	MyProfessor: {
		id: (parent) => {
			return (parent.id !== undefined) ? parent.id : null;
		},
		firstName: (parent) => {
			return (parent.firstName !== undefined) ? parent.firstName : null;
		},
		surName: (parent) => {
			return (parent.lastName !== undefined) ? parent.lastName : null;
		},
		teacherOf: (parent) => {
			return (parent.teaches !== undefined) ? parent.teaches : null;
		},
		examinerOf: (parent) => {
			return (parent.examinerOf !== undefined) ? parent.examinerOf : null;
		},
	},
	MyClass: {
		id: (parent) => {
			return (parent.id !== undefined) ? parent.id : null;
		},
		professorSurName: (parent) => {
			return (parent.teaches.lastName !== undefined) ? parent.teaches.lastName : null;
		},
		teaches: (parent) => {
			return (parent.teaches !== undefined) ? parent.teaches : null;
		},
		students: (parent) => {
			return (parent.students !== undefined) ? parent.students : null;
		},
	},
}
const extractNestedMyStudentFields = (selection) => {
	let result = {
		kind: Kind.SELECTION_SET, 
		selections: []
	}
	selection.selectionSet.selections.forEach(nestedSelection => {
		if(nestedSelection.name.value === "id") {
			result.selections.push({
				kind: Kind.FIELD, 
				name: {
					kind: Kind.NAME, 
					value: "id"
				},
			})
		}
		if(nestedSelection.name.value === "firstName") {
			result.selections.push({
				kind: Kind.FIELD, 
				name: {
					kind: Kind.NAME, 
					value: "firstName"
				},
			})
		}
		if(nestedSelection.name.value === "surName") {
			result.selections.push({
				kind: Kind.FIELD, 
				name: {
					kind: Kind.NAME, 
					value: "lastName"
				},
			})
		}
		if(nestedSelection.name.value === "myProfessors") {
			result.selections.push({
				kind: Kind.FIELD,
				name: {
					kind: Kind.NAME,
					value: "professors"
				},
			selectionSet: extractNestedMyProfessorFields(nestedSelection)
			})
		}
	})
	return result;
}

const extractNestedMyProfessorFields = (selection) => {
	let result = {
		kind: Kind.SELECTION_SET, 
		selections: []
	}
	selection.selectionSet.selections.forEach(nestedSelection => {

        if(nestedSelection.name.value === "id") {
        	result.selections.push( {
    
                kind: Kind.FIELD,
                name: {
                	kind: Kind.NAME,
                	value: "id"
                }
            
        	})
        }
    
        if(nestedSelection.name.value === "firstName") {
        	result.selections.push( {
    
                kind: Kind.FIELD,
                name: {
                	kind: Kind.NAME,
                	value: "firstName"
                }
            
        	})
        }
    		if(nestedSelection.name.value === "surName") {
			result.selections.push({
				kind: Kind.FIELD, 
				name: {
					kind: Kind.NAME, 
					value: "lastName"
				},
			})
		}
		if(nestedSelection.name.value === "teacherOf") {
			result.selections.push({
				kind: Kind.FIELD,
				name: {
					kind: Kind.NAME,
					value: "teaches"
				},
			selectionSet: extractNestedMyClassFields(nestedSelection)
			})
		}
		if(nestedSelection.name.value === "examinerOf") {
			result.selections.push({
				kind: Kind.FIELD,
				name: {
					kind: Kind.NAME,
					value: "examinerOf"
				},
			selectionSet: extractNestedMyStudentFields(nestedSelection)
			})
		}
	})
	return result;
}

const extractNestedMyClassFields = (selection) => {
	let result = {
		kind: Kind.SELECTION_SET, 
		selections: []
	}
	selection.selectionSet.selections.forEach(nestedSelection => {
		if(nestedSelection.name.value === "id") {
			result.selections.push({
				kind: Kind.FIELD, 
				name: {
					kind: Kind.NAME, 
					value: "id"
				},
			})
		}

        if(nestedSelection.name.value === "professorSurName") {
        	result.selections.push( {
    
                kind: Kind.FIELD,
                name: {
                	kind: Kind.NAME,
                	value: "teaches"
                }, 
                selectionSet: {
                	kind: Kind.SELECTION_SET,
                	selections: [{
            
                		kind: Kind.FIELD,
                		name: {
                			kind: Kind.NAME,
                			value: "lastName"
                		}
            
                    }]
                    }
                
        	})
        }
    		if(nestedSelection.name.value === "teaches") {
			result.selections.push({
				kind: Kind.FIELD,
				name: {
					kind: Kind.NAME,
					value: "teaches"
				},
			selectionSet: extractNestedMyProfessorFields(nestedSelection)
			})
		}
		if(nestedSelection.name.value === "students") {
			result.selections.push({
				kind: Kind.FIELD,
				name: {
					kind: Kind.NAME,
					value: "students"
				},
			selectionSet: extractNestedMyStudentFields(nestedSelection)
			})
		}
	})
	return result;
}



module.exports = resolvers;
