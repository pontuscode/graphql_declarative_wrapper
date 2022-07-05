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

const resolvers = {
	Query: {
    
        wrappedUniversity: async(_, args, context, info) => {
        	const schema = await remoteSchema();
        	const data = await delegateToSchema({
        		schema: schema,
        		operation: 'query',
        		fieldName: 'university',
        		args: {
        			nr: args.nr
        		},
        		context, 
        		info,
        		transforms: [
        			new WrapQuery(
        				["university"],
        				(subtree) => {
        					const newSelectionSet = {
        						kind: Kind.SELECTION_SET,
        						selections: [] 
        					}
        					subtree.selections.forEach(selection => {
        						if(selection.selectionSet !== undefined) {
        							newSelectionSet.selections.push({
        								kind: Kind.FIELD,
        								name: {
        									kind: Kind.NAME,
        									value: selection.name.value
        								},
        								selectionSet: extractNestedFields(selection, schema._typeMap["University"])
        							})
        						} else {
        							newSelectionSet.selections.push({
        								kind: Kind.FIELD,
        								name: {
        									kind: Kind.NAME,
        									value: selection.name.value
        								}
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
        
        wrappedFaculty: async(_, args, context, info) => {
        	const schema = await remoteSchema();
        	const data = await delegateToSchema({
        		schema: schema,
        		operation: 'query',
        		fieldName: 'faculty',
        		args: {
        			nr: args.nr
        		},
        		context, 
        		info,
        		transforms: [
        			new WrapQuery(
        				["faculty"],
        				(subtree) => {
        					const newSelectionSet = {
        						kind: Kind.SELECTION_SET,
        						selections: [] 
        					}
        					subtree.selections.forEach(selection => {
        						if(selection.selectionSet !== undefined) {
        							newSelectionSet.selections.push({
        								kind: Kind.FIELD,
        								name: {
        									kind: Kind.NAME,
        									value: selection.name.value
        								},
        								selectionSet: extractNestedFields(selection, schema._typeMap["Faculty"])
        							})
        						} else {
        							newSelectionSet.selections.push({
        								kind: Kind.FIELD,
        								name: {
        									kind: Kind.NAME,
        									value: selection.name.value
        								}
        							})
        						}
        					})
        				return newSelectionSet;
        				},
    
            		result => {
            			if(result !== null) {
        
                			if(result.__typename === "Professor") {
                				result.__typename = "WrappedProfessor";
                			}
            
                			if(result.__typename === "Lecturer") {
                				result.__typename = "WrappedLecturer";
                			}
            
            			}
            			return result;
            		}
        
        		),
        	]
        	})
        	return data;
        },
        
        wrappedDepartment: async(_, args, context, info) => {
        	const schema = await remoteSchema();
        	const data = await delegateToSchema({
        		schema: schema,
        		operation: 'query',
        		fieldName: 'department',
        		args: {
        			nr: args.nr
        		},
        		context, 
        		info,
        		transforms: [
        			new WrapQuery(
        				["department"],
        				(subtree) => {
        					const newSelectionSet = {
        						kind: Kind.SELECTION_SET,
        						selections: [] 
        					}
        					subtree.selections.forEach(selection => {
        						if(selection.selectionSet !== undefined) {
        							newSelectionSet.selections.push({
        								kind: Kind.FIELD,
        								name: {
        									kind: Kind.NAME,
        									value: selection.name.value
        								},
        								selectionSet: extractNestedFields(selection, schema._typeMap["Department"])
        							})
        						} else {
        							newSelectionSet.selections.push({
        								kind: Kind.FIELD,
        								name: {
        									kind: Kind.NAME,
        									value: selection.name.value
        								}
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
        
        wrappedLecturer: async(_, args, context, info) => {
        	const schema = await remoteSchema();
        	const data = await delegateToSchema({
        		schema: schema,
        		operation: 'query',
        		fieldName: 'lecturer',
        		args: {
        			nr: args.nr
        		},
        		context, 
        		info,
        		transforms: [
        			new WrapQuery(
        				["lecturer"],
        				(subtree) => {
        					const newSelectionSet = {
        						kind: Kind.SELECTION_SET,
        						selections: [] 
        					}
        					subtree.selections.forEach(selection => {
        						if(selection.selectionSet !== undefined) {
        							newSelectionSet.selections.push({
        								kind: Kind.FIELD,
        								name: {
        									kind: Kind.NAME,
        									value: selection.name.value
        								},
        								selectionSet: extractNestedFields(selection, schema._typeMap["Lecturer"])
        							})
        						} else {
        							newSelectionSet.selections.push({
        								kind: Kind.FIELD,
        								name: {
        									kind: Kind.NAME,
        									value: selection.name.value
        								}
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
        
        wrappedGraduateStudents: async(_, __, context, info) => {
        	const schema = await remoteSchema();
        	const data = await delegateToSchema({
        		schema: schema,
        		operation: 'query',
        		fieldName: 'graduateStudents',
        		context, 
        		info,
        		transforms: [
        			new WrapQuery(
        				["graduateStudents"],
        				(subtree) => {
        					const newSelectionSet = {
        						kind: Kind.SELECTION_SET,
        						selections: [] 
        					}
        					subtree.selections.forEach(selection => {
        						if(selection.selectionSet !== undefined) {
        							newSelectionSet.selections.push({
        								kind: Kind.FIELD,
        								name: {
        									kind: Kind.NAME,
        									value: selection.name.value
        								},
        								selectionSet: extractNestedFields(selection, schema._typeMap["GraduateStudents"])
        							})
        						}
        						 else {
        							newSelectionSet.selections.push({
        								kind: Kind.FIELD,
        								name: {
        									kind: Kind.NAME,
        									value: selection.name.value
        								}
        							})
        						}
        
        						if(selection.name.value === "newEmail") {
        
                    				newSelectionSet.selections.push( {
                    					kind: Kind.FIELD,
                    						name: {
                    							kind: Kind.NAME,
                    							value: "emailAddress"
                    						}
                    					}
                    				)
                
        						}
        
        						if(selection.name.value === "contactInfo") {
        
                    				newSelectionSet.selections.push( {
                    					kind: Kind.FIELD,
                    						name: {
                    							kind: Kind.NAME,
                    							value: "telephone"
                    						}
                    					}
                    				)
                
                    				newSelectionSet.selections.push( {
                    					kind: Kind.FIELD,
                    						name: {
                    							kind: Kind.NAME,
                    							value: "emailAddress"
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
        
        wrappedResearchGroup: async(_, args, context, info) => {
        	const schema = await remoteSchema();
        	const data = await delegateToSchema({
        		schema: schema,
        		operation: 'query',
        		fieldName: 'researchGroup',
        		args: {
        			nr: args.nr
        		},
        		context, 
        		info,
        		transforms: [
        			new WrapQuery(
        				["researchGroup"],
        				(subtree) => {
        					const newSelectionSet = {
        						kind: Kind.SELECTION_SET,
        						selections: [] 
        					}
        					subtree.selections.forEach(selection => {
        						if(selection.selectionSet !== undefined) {
        							newSelectionSet.selections.push({
        								kind: Kind.FIELD,
        								name: {
        									kind: Kind.NAME,
        									value: selection.name.value
        								},
        								selectionSet: extractNestedFields(selection, schema._typeMap["ResearchGroup"])
        							})
        						} else {
        							newSelectionSet.selections.push({
        								kind: Kind.FIELD,
        								name: {
        									kind: Kind.NAME,
        									value: selection.name.value
        								}
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
	WrappedUniversity: {
		id: (parent) => {
			return (parent.id !== undefined) ? parent.id : null;
		},
		undergraduateDegreeObtainedByFaculty: (parent) => {
			parent.undergraduateDegreeObtainedByFaculty.forEach(child => {
				if(child.__typename === "Professor") {
					child.__typename = "WrappedProfessor"
				}
				if(child.__typename === "Lecturer") {
					child.__typename = "WrappedLecturer"
				}
			})
			return (parent.undergraduateDegreeObtainedByFaculty !== undefined) ? parent.undergraduateDegreeObtainedByFaculty : null;
		},
		departments: (parent) => {
			return (parent.departments !== undefined) ? parent.departments : null;
		},
		undergraduateDegreeObtainedBystudent: (parent) => {
			return (parent.undergraduateDegreeObtainedBystudent !== undefined) ? parent.undergraduateDegreeObtainedBystudent : null;
		},
		doctoralDegreeObtainers: (parent) => {
			parent.doctoralDegreeObtainers.forEach(child => {
				if(child.__typename === "Professor") {
					child.__typename = "WrappedProfessor"
				}
				if(child.__typename === "Lecturer") {
					child.__typename = "WrappedLecturer"
				}
			})
			return (parent.doctoralDegreeObtainers !== undefined) ? parent.doctoralDegreeObtainers : null;
		},
	},
	WrappedDepartment: {
		id: (parent) => {
			return (parent.id !== undefined) ? parent.id : null;
		},
		subOrganizationOf: (parent) => {
			return (parent.subOrganizationOf !== undefined) ? parent.subOrganizationOf : null;
		},
		faculties: (parent) => {
			parent.faculties.forEach(child => {
				if(child.__typename === "Professor") {
					child.__typename = "WrappedProfessor"
				}
				if(child.__typename === "Lecturer") {
					child.__typename = "WrappedLecturer"
				}
			})
			return (parent.faculties !== undefined) ? parent.faculties : null;
		},
		head: (parent) => {
			return (parent.head !== undefined) ? parent.head : null;
		},
	},
	WrappedProfessor: {
		id: (parent) => {
			return (parent.id !== undefined) ? parent.id : null;
		},
		telephone: (parent) => {
			return (parent.telephone !== undefined) ? parent.telephone : null;
		},
		emailAddress: (parent) => {
			return (parent.emailAddress !== undefined) ? parent.emailAddress : null;
		},

        contactInfo: async(parent, _, _context, _info) => {
    
            if(parent.contactInfo === undefined) 
            	parent.contactInfo = parent.telephone
            else
            	parent.contactInfo += parent.telephone
            
            if(parent.contactInfo === undefined) 
            	parent.contactInfo = " " 
            else
            	parent.contactInfo += " "
            
            if(parent.contactInfo === undefined) 
            	parent.contactInfo = parent.emailAddress
            else
            	parent.contactInfo += parent.emailAddress
            
        	return parent.contactInfo
        },
		researchInterest: (parent) => {
			return (parent.researchInterest !== undefined) ? parent.researchInterest : null;
		},
		profType: (parent) => {
			return (parent.profType !== undefined) ? parent.profType : null;
		},
		undergraduateDegreeFrom: (parent) => {
			return (parent.undergraduateDegreeFrom !== undefined) ? parent.undergraduateDegreeFrom : null;
		},
		masterDegreeFrom: (parent) => {
			return (parent.masterDegreeFrom !== undefined) ? parent.masterDegreeFrom : null;
		},
		doctoralDegreeFrom: (parent) => {
			return (parent.doctoralDegreeFrom !== undefined) ? parent.doctoralDegreeFrom : null;
		},
		worksFor: (parent) => {
			return (parent.worksFor !== undefined) ? parent.worksFor : null;
		},
		publications: (parent) => {
			return (parent.publications !== undefined) ? parent.publications : null;
		},
	},
	WrappedLecturer: {
		id: (parent) => {
			return (parent.id !== undefined) ? parent.id : null;
		},
		telephone: (parent) => {
			return (parent.telephone !== undefined) ? parent.telephone : null;
		},
		emailAddress: (parent) => {
			return (parent.emailAddress !== undefined) ? parent.emailAddress : null;
		},

        contactInfo: async(parent, _, _context, _info) => {
    
            if(parent.contactInfo === undefined) 
            	parent.contactInfo = parent.telephone
            else
            	parent.contactInfo += parent.telephone
            
            if(parent.contactInfo === undefined) 
            	parent.contactInfo = " " 
            else
            	parent.contactInfo += " "
            
            if(parent.contactInfo === undefined) 
            	parent.contactInfo = parent.emailAddress
            else
            	parent.contactInfo += parent.emailAddress
            
        	return parent.contactInfo
        },
		position: (parent) => {
			return (parent.position !== undefined) ? parent.position : null;
		},
		undergraduateDegreeFrom: (parent) => {
			return (parent.undergraduateDegreeFrom !== undefined) ? parent.undergraduateDegreeFrom : null;
		},
		masterDegreeFrom: (parent) => {
			return (parent.masterDegreeFrom !== undefined) ? parent.masterDegreeFrom : null;
		},
		doctoralDegreeFrom: (parent) => {
			return (parent.doctoralDegreeFrom !== undefined) ? parent.doctoralDegreeFrom : null;
		},
		worksFor: (parent) => {
			return (parent.worksFor !== undefined) ? parent.worksFor : null;
		},
		publications: (parent) => {
			return (parent.publications !== undefined) ? parent.publications : null;
		},
	},
	WrappedGraduateStudent: {
		id: (parent) => {
			return (parent.id !== undefined) ? parent.id : null;
		},
		telephone: (parent) => {
			return (parent.telephone !== undefined) ? parent.telephone : null;
		},
		emailAddress: (parent) => {
			return (parent.emailAddress !== undefined) ? parent.emailAddress : null;
		},

        newEmail: async(parent, _, _context, _info) => {
    
            if(parent.newEmail === undefined) 
            	parent.newEmail = "cooler" 
            else
            	parent.newEmail += "cooler"
            
            if(parent.newEmail === undefined) 
            	parent.newEmail = parent.emailAddress
            else
            	parent.newEmail += parent.emailAddress
            
        	return parent.newEmail
        },

        contactInfo: async(parent, _, _context, _info) => {
    
            if(parent.contactInfo === undefined) 
            	parent.contactInfo = parent.telephone
            else
            	parent.contactInfo += parent.telephone
            
            if(parent.contactInfo === undefined) 
            	parent.contactInfo = " " 
            else
            	parent.contactInfo += " "
            
            if(parent.contactInfo === undefined) 
            	parent.contactInfo = parent.emailAddress
            else
            	parent.contactInfo += parent.emailAddress
            
        	return parent.contactInfo
        },
		age: (parent) => {
			return (parent.age !== undefined) ? parent.age : null;
		},
		memberOf: (parent) => {
			return (parent.memberOf !== undefined) ? parent.memberOf : null;
		},
		undergraduateDegreeFrom: (parent) => {
			return (parent.undergraduateDegreeFrom !== undefined) ? parent.undergraduateDegreeFrom : null;
		},
		advisor: (parent) => {
			return (parent.advisor !== undefined) ? parent.advisor : null;
		},
	},
	WrappedResearchGroup: {
		id: (parent) => {
			return (parent.id !== undefined) ? parent.id : null;
		},
		subOrganizationOf: (parent) => {
			return (parent.subOrganizationOf !== undefined) ? parent.subOrganizationOf : null;
		},
	},
	WrappedPublication: {
		id: (parent) => {
			return (parent.id !== undefined) ? parent.id : null;
		},
		title: (parent) => {
			return (parent.title !== undefined) ? parent.title : null;
		},
		abstract: (parent) => {
			return (parent.abstract !== undefined) ? parent.abstract : null;
		},
		authors: (parent) => {
			parent.authors.forEach(child => {
				if(child.__typename === "Professor") {
					child.__typename = "WrappedProfessor"
				}
				if(child.__typename === "Lecturer") {
					child.__typename = "WrappedLecturer"
				}
				if(child.__typename === "GraduateStudent") {
					child.__typename = "WrappedGraduateStudent"
				}
			})
			return (parent.authors !== undefined) ? parent.authors : null;
		},
	},
}
const extractNestedFields = (selection,selectionType) => {
	let result = {
		kind: Kind.SELECTION_SET, 
		selections: []
	}
	let remoteResolver
	if(selectionType !== undefined){
		if(selectionType._fields){
			remoteResolver = selectionType._fields[selection.name.value].type
		}
		else{
			remoteResolver = selectionType.ofType._fields[selection.name.value].type
		}
	}
	selection.selectionSet.selections.forEach(nestedSelection => {
		if(nestedSelection.selectionSet != undefined) {
			result.selections.push({
				kind: Kind.FIELD,
				name: {
					kind: Kind.NAME,
					value: nestedSelection.name.value
				},
				selectionSet: extractNestedFields(nestedSelection, remoteResolver)
			})
		} else {
			result.selections.push({
				kind: Kind.FIELD,
				name: {
					kind: Kind.NAME,
					value: nestedSelection.name.value
				}
			})
		}
		if(remoteResolver._fields){
        	if(remoteResolver.name.value === "GraduateStudent"){
        		if(nestedSelection.name.value === "newEmail"){
                    result.selections.push( {
                    	kind: Kind.FIELD,
                    	name: {
                    		kind: Kind.NAME,
                    		value: "emailAddress"
                    	}
                    })
        		}
        	}
        
        	if(remoteResolver.name.value === "GraduateStudent"){
        		if(nestedSelection.name.value === "contactInfo"){
                    result.selections.push( {
                    	kind: Kind.FIELD,
                    	name: {
                    		kind: Kind.NAME,
                    		value: "telephone"
                    	}
                    })
                    result.selections.push( {
                    	kind: Kind.FIELD,
                    	name: {
                    		kind: Kind.NAME,
                    		value: "emailAddress"
                    	}
                    })
        		}
        	}
        	}else{
        	if(remoteResolver.ofType.name === "GraduateStudent"){
        		if(nestedSelection.name.value === "newEmail"){
                    result.selections.push( {
                    	kind: Kind.FIELD,
                    	name: {
                    		kind: Kind.NAME,
                    		value: "emailAddress"
                    	}
                    })
        		}
        	}
        
        	if(remoteResolver.ofType.name === "GraduateStudent"){
        		if(nestedSelection.name.value === "contactInfo"){
                    result.selections.push( {
                    	kind: Kind.FIELD,
                    	name: {
                    		kind: Kind.NAME,
                    		value: "telephone"
                    	}
                    })
                    result.selections.push( {
                    	kind: Kind.FIELD,
                    	name: {
                    		kind: Kind.NAME,
                    		value: "emailAddress"
                    	}
                    })
        		}
        	}
        }
	})
	return result;
}

module.exports = resolvers;
