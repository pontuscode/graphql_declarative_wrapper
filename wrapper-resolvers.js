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
                										value: "module"
                									}, 
                									selectionSet: {
                										kind: Kind.SELECTION_SET,
                										selections: [{
            
                											kind: Kind.FIELD,
                											name: {
                												kind: Kind.NAME,
                												value: "title"
                											}
            
                    									}]
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
					result.myTitle = result.title;
    				return result;  
    			}
    		),
    	]})
	return data;
	}}
}
module.exports = resolvers;    
    