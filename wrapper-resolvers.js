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
    
            						if(selection.name.value === "id") {
            							newSelectionSet.selections.push( {
            								kind: Kind.FIELD,
            								name: {
            									kind: Kind.NAME,
            									value: "id"
            								}
            							})
            						}
        
            						if(selection.name.value === "undergraduateDegreeObtainedByFaculty") {
            							newSelectionSet.selections.push( {
            								kind: Kind.FIELD,
            								name: {
            									kind: Kind.NAME,
            									value: "undergraduateDegreeObtainedByFaculty"
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
                    										value: "telephone"
                    									}
                    								},
                
                    								{
                    									kind: Kind.FIELD,
                    									name: {
                    										kind: Kind.NAME,
                    										value: "emailAddress"
                    									}
                    								},
                
                    								{
                    									kind: Kind.FIELD,
                    									name: {
                    										kind: Kind.NAME,
                    										value: "undergraduateDegreeFrom"
                    									}
                    								},
                
            									]
            								}
            							})
            						}
        
            						if(selection.name.value === "departments") {
            							newSelectionSet.selections.push( {
            								kind: Kind.FIELD,
            								name: {
            									kind: Kind.NAME,
            									value: "departments"
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
                    										value: "subOrganizationOf"
                    									}
                    								},
                
                    								{
                    									kind: Kind.FIELD,
                    									name: {
                    										kind: Kind.NAME,
                    										value: "faculties"
                    									}
                    								},
                
            									]
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
    
            						if(selection.name.value === "id") {
            							newSelectionSet.selections.push( {
            								kind: Kind.FIELD,
            								name: {
            									kind: Kind.NAME,
            									value: "id"
            								}
            							})
            						}
        
            						if(selection.name.value === "telephone") {
            							newSelectionSet.selections.push( {
            								kind: Kind.FIELD,
            								name: {
            									kind: Kind.NAME,
            									value: "telephone"
            								}
            							})
            						}
        
            						if(selection.name.value === "emailAddress") {
            							newSelectionSet.selections.push( {
            								kind: Kind.FIELD,
            								name: {
            									kind: Kind.NAME,
            									value: "emailAddress"
            								}
            							})
            						}
        
            						if(selection.name.value === "undergraduateDegreeFrom") {
            							newSelectionSet.selections.push( {
            								kind: Kind.FIELD,
            								name: {
            									kind: Kind.NAME,
            									value: "undergraduateDegreeFrom"
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
                    										value: "undergraduateDegreeObtainedByFaculty"
                    									}
                    								},
                
                    								{
                    									kind: Kind.FIELD,
                    									name: {
                    										kind: Kind.NAME,
                    										value: "departments"
                    									}
                    								},
                
            									]
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
    
            						if(selection.name.value === "id") {
            							newSelectionSet.selections.push( {
            								kind: Kind.FIELD,
            								name: {
            									kind: Kind.NAME,
            									value: "id"
            								}
            							})
            						}
        
            						if(selection.name.value === "subOrganizationOf") {
            							newSelectionSet.selections.push( {
            								kind: Kind.FIELD,
            								name: {
            									kind: Kind.NAME,
            									value: "subOrganizationOf"
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
                    										value: "undergraduateDegreeObtainedByFaculty"
                    									}
                    								},
                
                    								{
                    									kind: Kind.FIELD,
                    									name: {
                    										kind: Kind.NAME,
                    										value: "departments"
                    									}
                    								},
                
            									]
            								}
            							})
            						}
        
            						if(selection.name.value === "faculties") {
            							newSelectionSet.selections.push( {
            								kind: Kind.FIELD,
            								name: {
            									kind: Kind.NAME,
            									value: "faculties"
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
                    										value: "telephone"
                    									}
                    								},
                
                    								{
                    									kind: Kind.FIELD,
                    									name: {
                    										kind: Kind.NAME,
                    										value: "emailAddress"
                    									}
                    								},
                
                    								{
                    									kind: Kind.FIELD,
                    									name: {
                    										kind: Kind.NAME,
                    										value: "undergraduateDegreeFrom"
                    									}
                    								},
                
            									]
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
			return (parent.undergraduateDegreeObtainedByFaculty !== undefined) ? parent.undergraduateDegreeObtainedByFaculty : null;
		},
		departments: (parent) => {
			return (parent.departments !== undefined) ? parent.departments : null;
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
			return (parent.faculties !== undefined) ? parent.faculties : null;
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
	},

}
module.exports = resolvers;    
    