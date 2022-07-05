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

const extractNestedFields = (selection) => {
	let result = {
		kind: Kind.SELECTION_SET, 
		selections: []
	}
	selection.selectionSet.selections.forEach(nestedSelection => {
		if(nestedSelection.selectionSet != undefined) {
			result.selections.push({
				kind: Kind.FIELD,
				name: {
					kind: Kind.NAME,
					value: nestedSelection.name.value
				},
				selectionSet: extractNestedFields(nestedSelection)
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
	})
	return result;
}

const extractNestedWrappedUniversityFields = (selection) => {
	let result = {
		kind: Kind.SELECTION_SET, 
		selections: []
	}
	selection.selectionSet.selections.forEach(nestedSelection => {
			if(nestedSelection.name.value === "idHaha") {
				result.selections.push({
					kind: Kind.FIELD, 
					name: {
						kind: Kind.NAME, 
						value: "id"
					},
				})
			}
			if(nestedSelection.name.value === "undergraduateDegreeObtainedByFaculty") {
				result.selections.push({
					kind: Kind.FIELD,
					name: {
						kind: Kind.NAME,
						value: "undergraduateDegreeObtainedByFaculty"
					},
				selectionSet: extractNestedWrappedFacultyFields(nestedSelection)
				})
			}
			if(nestedSelection.name.value === "departments") {
				result.selections.push({
					kind: Kind.FIELD,
					name: {
						kind: Kind.NAME,
						value: "departments"
					},
				selectionSet: extractNestedWrappedDepartmentFields(nestedSelection)
				})
			}
			if(nestedSelection.name.value === "undergraduateDegreeObtainedBystudent") {
				result.selections.push({
					kind: Kind.FIELD,
					name: {
						kind: Kind.NAME,
						value: "undergraduateDegreeObtainedBystudent"
					},
				selectionSet: extractNestedWrappedGraduateStudentFields(nestedSelection)
				})
			}
			if(nestedSelection.name.value === "doctoralDegreeObtainers") {
				result.selections.push({
					kind: Kind.FIELD,
					name: {
						kind: Kind.NAME,
						value: "doctoralDegreeObtainers"
					},
				selectionSet: extractNestedWrappedFacultyFields(nestedSelection)
				})
			}
		})
	return result;
}

const extractNestedWrappedDepartmentFields = (selection) => {
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
			if(nestedSelection.name.value === "subOrganizationOf") {
				result.selections.push({
					kind: Kind.FIELD,
					name: {
						kind: Kind.NAME,
						value: "subOrganizationOf"
					},
				selectionSet: extractNestedWrappedUniversityFields(nestedSelection)
				})
			}
			if(nestedSelection.name.value === "faculties") {
				result.selections.push({
					kind: Kind.FIELD,
					name: {
						kind: Kind.NAME,
						value: "faculties"
					},
				selectionSet: extractNestedWrappedFacultyFields(nestedSelection)
				})
			}
		})
	return result;
}

const extractNestedWrappedProfessorFields = (selection) => {
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
			if(nestedSelection.name.value === "telephone") {
				result.selections.push({
					kind: Kind.FIELD, 
					name: {
						kind: Kind.NAME, 
						value: "telephone"
					},
				})
			}
			if(nestedSelection.name.value === "emailAddress") {
				result.selections.push({
					kind: Kind.FIELD, 
					name: {
						kind: Kind.NAME, 
						value: "emailAddress"
					},
				})
			}
			if(nestedSelection.name.value === "researchInterest") {
				result.selections.push({
					kind: Kind.FIELD, 
					name: {
						kind: Kind.NAME, 
						value: "researchInterest"
					},
				})
			}
			if(nestedSelection.name.value === "profType") {
				result.selections.push({
					kind: Kind.FIELD, 
					name: {
						kind: Kind.NAME, 
						value: "profType"
					},
				})
			}
			if(nestedSelection.name.value === "undergraduateDegreeFrom") {
				result.selections.push({
					kind: Kind.FIELD,
					name: {
						kind: Kind.NAME,
						value: "undergraduateDegreeFrom"
					},
				selectionSet: extractNestedWrappedUniversityFields(nestedSelection)
				})
			}
			if(nestedSelection.name.value === "masterDegreeFrom") {
				result.selections.push({
					kind: Kind.FIELD,
					name: {
						kind: Kind.NAME,
						value: "masterDegreeFrom"
					},
				selectionSet: extractNestedWrappedUniversityFields(nestedSelection)
				})
			}
			if(nestedSelection.name.value === "doctoralDegreeFrom") {
				result.selections.push({
					kind: Kind.FIELD,
					name: {
						kind: Kind.NAME,
						value: "doctoralDegreeFrom"
					},
				selectionSet: extractNestedWrappedUniversityFields(nestedSelection)
				})
			}
			if(nestedSelection.name.value === "worksFor") {
				result.selections.push({
					kind: Kind.FIELD,
					name: {
						kind: Kind.NAME,
						value: "worksFor"
					},
				selectionSet: extractNestedWrappedDepartmentFields(nestedSelection)
				})
			}
			if(nestedSelection.name.value === "publications") {
				result.selections.push({
					kind: Kind.FIELD,
					name: {
						kind: Kind.NAME,
						value: "publications"
					},
				selectionSet: extractNestedWrappedPublicationFields(nestedSelection)
				})
			}
		})
	return result;
}

const extractNestedWrappedLecturerFields = (selection) => {
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
			if(nestedSelection.name.value === "telephone") {
				result.selections.push({
					kind: Kind.FIELD, 
					name: {
						kind: Kind.NAME, 
						value: "telephone"
					},
				})
			}
			if(nestedSelection.name.value === "emailAddress") {
				result.selections.push({
					kind: Kind.FIELD, 
					name: {
						kind: Kind.NAME, 
						value: "emailAddress"
					},
				})
			}
			if(nestedSelection.name.value === "position") {
				result.selections.push({
					kind: Kind.FIELD, 
					name: {
						kind: Kind.NAME, 
						value: "position"
					},
				})
			}
			if(nestedSelection.name.value === "undergraduateDegreeFrom") {
				result.selections.push({
					kind: Kind.FIELD,
					name: {
						kind: Kind.NAME,
						value: "undergraduateDegreeFrom"
					},
				selectionSet: extractNestedWrappedUniversityFields(nestedSelection)
				})
			}
			if(nestedSelection.name.value === "masterDegreeFrom") {
				result.selections.push({
					kind: Kind.FIELD,
					name: {
						kind: Kind.NAME,
						value: "masterDegreeFrom"
					},
				selectionSet: extractNestedWrappedUniversityFields(nestedSelection)
				})
			}
			if(nestedSelection.name.value === "doctoralDegreeFrom") {
				result.selections.push({
					kind: Kind.FIELD,
					name: {
						kind: Kind.NAME,
						value: "doctoralDegreeFrom"
					},
				selectionSet: extractNestedWrappedUniversityFields(nestedSelection)
				})
			}
			if(nestedSelection.name.value === "worksFor") {
				result.selections.push({
					kind: Kind.FIELD,
					name: {
						kind: Kind.NAME,
						value: "worksFor"
					},
				selectionSet: extractNestedWrappedDepartmentFields(nestedSelection)
				})
			}
			if(nestedSelection.name.value === "publications") {
				result.selections.push({
					kind: Kind.FIELD,
					name: {
						kind: Kind.NAME,
						value: "publications"
					},
				selectionSet: extractNestedWrappedPublicationFields(nestedSelection)
				})
			}
		})
	return result;
}

const extractNestedWrappedGraduateStudentFields = (selection) => {
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
			if(nestedSelection.name.value === "telephone") {
				result.selections.push({
					kind: Kind.FIELD, 
					name: {
						kind: Kind.NAME, 
						value: "telephone"
					},
				})
			}
			if(nestedSelection.name.value === "emailAddress") {
				result.selections.push({
					kind: Kind.FIELD, 
					name: {
						kind: Kind.NAME, 
						value: "emailAddress"
					},
				})
			}
			if(nestedSelection.name.value === "age") {
				result.selections.push({
					kind: Kind.FIELD, 
					name: {
						kind: Kind.NAME, 
						value: "age"
					},
				})
			}
			if(nestedSelection.name.value === "memberOf") {
				result.selections.push({
					kind: Kind.FIELD,
					name: {
						kind: Kind.NAME,
						value: "memberOf"
					},
				selectionSet: extractNestedWrappedDepartmentFields(nestedSelection)
				})
			}
			if(nestedSelection.name.value === "undergraduateDegreeFrom") {
				result.selections.push({
					kind: Kind.FIELD,
					name: {
						kind: Kind.NAME,
						value: "undergraduateDegreeFrom"
					},
				selectionSet: extractNestedWrappedUniversityFields(nestedSelection)
				})
			}
			if(nestedSelection.name.value === "advisor") {
				result.selections.push({
					kind: Kind.FIELD,
					name: {
						kind: Kind.NAME,
						value: "advisor"
					},
				selectionSet: extractNestedWrappedProfessorFields(nestedSelection)
				})
			}
		})
	return result;
}

const extractNestedWrappedResearchGroupFields = (selection) => {
	let result = {
		kind: Kind.SELECTION_SET, 
		selections: []
	}
	selection.selectionSet.selections.forEach(nestedSelection => {
		})
	return result;
}

const extractNestedWrappedPublicationFields = (selection) => {
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
			if(nestedSelection.name.value === "title") {
				result.selections.push({
					kind: Kind.FIELD, 
					name: {
						kind: Kind.NAME, 
						value: "title"
					},
				})
			}
			if(nestedSelection.name.value === "abstract") {
				result.selections.push({
					kind: Kind.FIELD, 
					name: {
						kind: Kind.NAME, 
						value: "abstract"
					},
				})
			}
			if(nestedSelection.name.value === "authors") {
				result.selections.push({
					kind: Kind.FIELD,
					name: {
						kind: Kind.NAME,
						value: "authors"
					},
				selectionSet: extractNestedWrappedAuthorFields(nestedSelection)
				})
			}
		})
	return result;
}



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
    			if(selection.name.value === "idHaha") {
				newSelectionSet.selections.push({
					kind: Kind.FIELD, 
					name: {
						kind: Kind.NAME, 
						value: "id"
					},
				})
			}
						if(selection.name.value === "undergraduateDegreeObtainedByFaculty") {
							newSelectionSet.selections.push({
								kind: Kind.FIELD,
								name: {
									kind: Kind.NAME,
									value: "undergraduateDegreeObtainedByFaculty"
								},
								selectionSet: extractNestedWrappedFacultyFields(selection)
							})
						}
						if(selection.name.value === "departments") {
							newSelectionSet.selections.push({
								kind: Kind.FIELD,
								name: {
									kind: Kind.NAME,
									value: "departments"
								},
								selectionSet: extractNestedWrappedDepartmentFields(selection)
							})
						}
						if(selection.name.value === "undergraduateDegreeObtainedBystudent") {
							newSelectionSet.selections.push({
								kind: Kind.FIELD,
								name: {
									kind: Kind.NAME,
									value: "undergraduateDegreeObtainedBystudent"
								},
								selectionSet: extractNestedWrappedGraduateStudentFields(selection)
							})
						}
						if(selection.name.value === "doctoralDegreeObtainers") {
							newSelectionSet.selections.push({
								kind: Kind.FIELD,
								name: {
									kind: Kind.NAME,
									value: "doctoralDegreeObtainers"
								},
								selectionSet: extractNestedWrappedFacultyFields(selection)
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
				newSelectionSet.selections.push({
					kind: Kind.FIELD, 
					name: {
						kind: Kind.NAME, 
						value: "id"
					},
				})
			}
			if(selection.name.value === "telephone") {
				newSelectionSet.selections.push({
					kind: Kind.FIELD, 
					name: {
						kind: Kind.NAME, 
						value: "telephone"
					},
				})
			}
			if(selection.name.value === "emailAddress") {
				newSelectionSet.selections.push({
					kind: Kind.FIELD, 
					name: {
						kind: Kind.NAME, 
						value: "emailAddress"
					},
				})
			}
						if(selection.name.value === "undergraduateDegreeFrom") {
							newSelectionSet.selections.push({
								kind: Kind.FIELD,
								name: {
									kind: Kind.NAME,
									value: "undergraduateDegreeFrom"
								},
								selectionSet: extractNestedWrappedUniversityFields(selection)
							})
						}
						if(selection.name.value === "masterDegreeFrom") {
							newSelectionSet.selections.push({
								kind: Kind.FIELD,
								name: {
									kind: Kind.NAME,
									value: "masterDegreeFrom"
								},
								selectionSet: extractNestedWrappedUniversityFields(selection)
							})
						}
						if(selection.name.value === "doctoralDegreeFrom") {
							newSelectionSet.selections.push({
								kind: Kind.FIELD,
								name: {
									kind: Kind.NAME,
									value: "doctoralDegreeFrom"
								},
								selectionSet: extractNestedWrappedUniversityFields(selection)
							})
						}
						if(selection.name.value === "publications") {
							newSelectionSet.selections.push({
								kind: Kind.FIELD,
								name: {
									kind: Kind.NAME,
									value: "publications"
								},
								selectionSet: extractNestedWrappedPublicationFields(selection)
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
				newSelectionSet.selections.push({
					kind: Kind.FIELD, 
					name: {
						kind: Kind.NAME, 
						value: "id"
					},
				})
			}
						if(selection.name.value === "subOrganizationOf") {
							newSelectionSet.selections.push({
								kind: Kind.FIELD,
								name: {
									kind: Kind.NAME,
									value: "subOrganizationOf"
								},
								selectionSet: extractNestedWrappedUniversityFields(selection)
							})
						}
						if(selection.name.value === "faculties") {
							newSelectionSet.selections.push({
								kind: Kind.FIELD,
								name: {
									kind: Kind.NAME,
									value: "faculties"
								},
								selectionSet: extractNestedWrappedFacultyFields(selection)
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
    			if(selection.name.value === "id") {
				newSelectionSet.selections.push({
					kind: Kind.FIELD, 
					name: {
						kind: Kind.NAME, 
						value: "id"
					},
				})
			}
			if(selection.name.value === "telephone") {
				newSelectionSet.selections.push({
					kind: Kind.FIELD, 
					name: {
						kind: Kind.NAME, 
						value: "telephone"
					},
				})
			}
			if(selection.name.value === "emailAddress") {
				newSelectionSet.selections.push({
					kind: Kind.FIELD, 
					name: {
						kind: Kind.NAME, 
						value: "emailAddress"
					},
				})
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
        			if(selection.name.value === "position") {
				newSelectionSet.selections.push({
					kind: Kind.FIELD, 
					name: {
						kind: Kind.NAME, 
						value: "position"
					},
				})
			}
						if(selection.name.value === "undergraduateDegreeFrom") {
							newSelectionSet.selections.push({
								kind: Kind.FIELD,
								name: {
									kind: Kind.NAME,
									value: "undergraduateDegreeFrom"
								},
								selectionSet: extractNestedWrappedUniversityFields(selection)
							})
						}
						if(selection.name.value === "masterDegreeFrom") {
							newSelectionSet.selections.push({
								kind: Kind.FIELD,
								name: {
									kind: Kind.NAME,
									value: "masterDegreeFrom"
								},
								selectionSet: extractNestedWrappedUniversityFields(selection)
							})
						}
						if(selection.name.value === "doctoralDegreeFrom") {
							newSelectionSet.selections.push({
								kind: Kind.FIELD,
								name: {
									kind: Kind.NAME,
									value: "doctoralDegreeFrom"
								},
								selectionSet: extractNestedWrappedUniversityFields(selection)
							})
						}
						if(selection.name.value === "worksFor") {
							newSelectionSet.selections.push({
								kind: Kind.FIELD,
								name: {
									kind: Kind.NAME,
									value: "worksFor"
								},
								selectionSet: extractNestedWrappedDepartmentFields(selection)
							})
						}
						if(selection.name.value === "publications") {
							newSelectionSet.selections.push({
								kind: Kind.FIELD,
								name: {
									kind: Kind.NAME,
									value: "publications"
								},
								selectionSet: extractNestedWrappedPublicationFields(selection)
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
        								selectionSet: extractNestedFields(selection)
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
		idHaha: (parent) => {
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
module.exports = resolvers;
