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
                
                    								{
                    									kind: Kind.FIELD,
                    									name: {
                    										kind: Kind.NAME,
                    										value: "masterDegreeFrom"
                    									}
                    								},
                
                    								{
                    									kind: Kind.FIELD,
                    									name: {
                    										kind: Kind.NAME,
                    										value: "doctoralDegreeFrom"
                    									}
                    								},
                
                    								{
                    									kind: Kind.FIELD,
                    									name: {
                    										kind: Kind.NAME,
                    										value: "publications"
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
        
            						if(selection.name.value === "undergraduateDegreeObtainedBystudent") {
            							newSelectionSet.selections.push( {
            								kind: Kind.FIELD,
            								name: {
            									kind: Kind.NAME,
            									value: "undergraduateDegreeObtainedBystudent"
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
                    										value: "age"
                    									}
                    								},
                
                    								{
                    									kind: Kind.FIELD,
                    									name: {
                    										kind: Kind.NAME,
                    										value: "memberOf"
                    									}
                    								},
                
                    								{
                    									kind: Kind.FIELD,
                    									name: {
                    										kind: Kind.NAME,
                    										value: "undergraduateDegreeFrom"
                    									}
                    								},
                
                    								{
                    									kind: Kind.FIELD,
                    									name: {
                    										kind: Kind.NAME,
                    										value: "advisor"
                    									}
                    								},
                
            									]
            								}
            							})
            						}
        
            						if(selection.name.value === "doctoralDegreeObtainers") {
            							newSelectionSet.selections.push( {
            								kind: Kind.FIELD,
            								name: {
            									kind: Kind.NAME,
            									value: "doctoralDegreeObtainers"
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
                
                    								{
                    									kind: Kind.FIELD,
                    									name: {
                    										kind: Kind.NAME,
                    										value: "masterDegreeFrom"
                    									}
                    								},
                
                    								{
                    									kind: Kind.FIELD,
                    									name: {
                    										kind: Kind.NAME,
                    										value: "doctoralDegreeFrom"
                    									}
                    								},
                
                    								{
                    									kind: Kind.FIELD,
                    									name: {
                    										kind: Kind.NAME,
                    										value: "publications"
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
                
                    								{
                    									kind: Kind.FIELD,
                    									name: {
                    										kind: Kind.NAME,
                    										value: "undergraduateDegreeObtainedBystudent"
                    									}
                    								},
                
                    								{
                    									kind: Kind.FIELD,
                    									name: {
                    										kind: Kind.NAME,
                    										value: "doctoralDegreeObtainers"
                    									}
                    								},
                
            									]
            								}
            							})
            						}
        
            						if(selection.name.value === "masterDegreeFrom") {
            							newSelectionSet.selections.push( {
            								kind: Kind.FIELD,
            								name: {
            									kind: Kind.NAME,
            									value: "masterDegreeFrom"
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
                
                    								{
                    									kind: Kind.FIELD,
                    									name: {
                    										kind: Kind.NAME,
                    										value: "undergraduateDegreeObtainedBystudent"
                    									}
                    								},
                
                    								{
                    									kind: Kind.FIELD,
                    									name: {
                    										kind: Kind.NAME,
                    										value: "doctoralDegreeObtainers"
                    									}
                    								},
                
            									]
            								}
            							})
            						}
        
            						if(selection.name.value === "doctoralDegreeFrom") {
            							newSelectionSet.selections.push( {
            								kind: Kind.FIELD,
            								name: {
            									kind: Kind.NAME,
            									value: "doctoralDegreeFrom"
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
                
                    								{
                    									kind: Kind.FIELD,
                    									name: {
                    										kind: Kind.NAME,
                    										value: "undergraduateDegreeObtainedBystudent"
                    									}
                    								},
                
                    								{
                    									kind: Kind.FIELD,
                    									name: {
                    										kind: Kind.NAME,
                    										value: "doctoralDegreeObtainers"
                    									}
                    								},
                
            									]
            								}
            							})
            						}
        
            						if(selection.name.value === "publications") {
            							newSelectionSet.selections.push( {
            								kind: Kind.FIELD,
            								name: {
            									kind: Kind.NAME,
            									value: "publications"
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
                    										value: "title"
                    									}
                    								},
                
                    								{
                    									kind: Kind.FIELD,
                    									name: {
                    										kind: Kind.NAME,
                    										value: "abstract"
                    									}
                    								},
                
                    								{
                    									kind: Kind.FIELD,
                    									name: {
                    										kind: Kind.NAME,
                    										value: "authors"
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
                
                    								{
                    									kind: Kind.FIELD,
                    									name: {
                    										kind: Kind.NAME,
                    										value: "undergraduateDegreeObtainedBystudent"
                    									}
                    								},
                
                    								{
                    									kind: Kind.FIELD,
                    									name: {
                    										kind: Kind.NAME,
                    										value: "doctoralDegreeObtainers"
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
                
                    								{
                    									kind: Kind.FIELD,
                    									name: {
                    										kind: Kind.NAME,
                    										value: "masterDegreeFrom"
                    									}
                    								},
                
                    								{
                    									kind: Kind.FIELD,
                    									name: {
                    										kind: Kind.NAME,
                    										value: "doctoralDegreeFrom"
                    									}
                    								},
                
                    								{
                    									kind: Kind.FIELD,
                    									name: {
                    										kind: Kind.NAME,
                    										value: "publications"
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
        
            						if(selection.name.value === "age") {
            							newSelectionSet.selections.push( {
            								kind: Kind.FIELD,
            								name: {
            									kind: Kind.NAME,
            									value: "age"
            								}
            							})
            						}
        
            						if(selection.name.value === "memberOf") {
            							newSelectionSet.selections.push( {
            								kind: Kind.FIELD,
            								name: {
            									kind: Kind.NAME,
            									value: "memberOf"
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
                
                    								{
                    									kind: Kind.FIELD,
                    									name: {
                    										kind: Kind.NAME,
                    										value: "undergraduateDegreeObtainedBystudent"
                    									}
                    								},
                
                    								{
                    									kind: Kind.FIELD,
                    									name: {
                    										kind: Kind.NAME,
                    										value: "doctoralDegreeObtainers"
                    									}
                    								},
                
            									]
            								}
            							})
            						}
        
            						if(selection.name.value === "advisor") {
            							newSelectionSet.selections.push( {
            								kind: Kind.FIELD,
            								name: {
            									kind: Kind.NAME,
            									value: "advisor"
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
                    										value: "researchInterest"
                    									}
                    								},
                
                    								{
                    									kind: Kind.FIELD,
                    									name: {
                    										kind: Kind.NAME,
                    										value: "profType"
                    									}
                    								},
                
                    								{
                    									kind: Kind.FIELD,
                    									name: {
                    										kind: Kind.NAME,
                    										value: "undergraduateDegreeFrom"
                    									}
                    								},
                
                    								{
                    									kind: Kind.FIELD,
                    									name: {
                    										kind: Kind.NAME,
                    										value: "masterDegreeFrom"
                    									}
                    								},
                
                    								{
                    									kind: Kind.FIELD,
                    									name: {
                    										kind: Kind.NAME,
                    										value: "doctoralDegreeFrom"
                    									}
                    								},
                
                    								{
                    									kind: Kind.FIELD,
                    									name: {
                    										kind: Kind.NAME,
                    										value: "worksFor"
                    									}
                    								},
                
                    								{
                    									kind: Kind.FIELD,
                    									name: {
                    										kind: Kind.NAME,
                    										value: "publications"
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
        		)
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
module.exports = resolvers;    
    