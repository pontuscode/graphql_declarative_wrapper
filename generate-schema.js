const fs = require("fs").promises;
const { visit } = require("graphql/language");
const prompt = require('prompt-sync')({sigint: true});

const builtInScalars = [
    "Int", "Float", "String", "Boolean", "ID", 
    "Int!", "Float!", "String!", "Boolean!", "ID!", 
    "['Int']", "['Float']", "['String']", "['Boolean']", "['ID']",
    "['Int!']", "['Float!']", "['String!']", "['Boolean!']", "['ID!']",
    "['Int!']!", "['Float!']!", "['String!']!", "['Boolean!']!", "['ID!']!"
]
/**
 * @param {*} wsDef is the typedefs of the wrapper schema definitions
 * @param {*} directivesUsed is a list of directives parsed from the wrapper schema definitions
 * @param {*} remoteSchema is the typedefs of the remote schema
 * @param {*} remoteServerUrl is the url of the remote server that is hosting the server of the remote schema
 * @param {*} wrapperName is the name of the final wrapper schema
 * @returns a success boolean and an error message (if something went wrong when generating)
 */
const generateSchema = async function(wsDef, directivesUsed, remoteSchema, remoteServerUrl, wrapperName) {
    let errorMessage;
    const typeDefinitions = await generateTypeDefinitions(wsDef.schema[0].document, wrapperName, directivesUsed);
    const delegatedResolvers = await generateResolvers(wsDef.schema[0].document, directivesUsed, remoteSchema.schema[0], remoteServerUrl, wrapperName);
    let success = (typeDefinitions !== "" && delegatedResolvers !== "");
    return {
        "success": success,
        "error": errorMessage
    }
}

const generateResolvers = async function(wsDef, directivesUsed, remoteSchema, remoteServerUrl, typeDefFileName) {
    let typeDefFileContent = "";
    let fileContent = `const { wrapSchema, WrapQuery, introspectSchema, RenameObjectFields } = require('@graphql-tools/wrap');
const { fetch } = require("cross-fetch");
const { delegateToSchema } = require("@graphql-tools/delegate");
const { print } = require("graphql/language");
const { Kind } = require('graphql');

const executor = async ({ document, variables }) => {
    const query = print(document);
    const fetchResult = await fetch("${remoteServerUrl}", {
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
    `;
    /* In this for-loop we write all the resolver functions with their respective wrapQuery transforms. */
    for(let i = 0; i < directivesUsed.length; i++){
        // If the user does not want to include all fields, make "custom" resolver for each field value
        if(directivesUsed[i].argumentName === "type" && directivesUsed[i].includeAllFields === false) {
            if(directivesUsed[i].resolvers !== undefined){
                let parsedArgument = parseArgument(directivesUsed[i].resolvers);
                let objectTypeName = directivesUsed[i].objectTypeName;
                if(parsedArgument.singleQuery !== undefined) {
                    fileContent += writeResolverWithArgs(objectTypeName, directivesUsed, parsedArgument.singleQuery, wsDef, remoteSchema);
                    typeDefFileContent += addToQueryType(objectTypeName, parsedArgument.singleQuery, isList = false);
                } 
                if(parsedArgument.listQuery !== undefined) {
                    fileContent += writeResolverWithoutArgs(objectTypeName, directivesUsed, parsedArgument.listQuery, remoteSchema);
                    typeDefFileContent += addToQueryType(objectTypeName, parsedArgument.listQuery, isList = true);
                }
            }
        } // If the user wants to include all fields and has specified a resolver function, just delegate everything to the resolver function "as is".
        else if(directivesUsed[i].argumentName === "type" && directivesUsed[i].includeAllFields === true) {
            if(directivesUsed[i].resolvers !== undefined) {
                let parsedArgument = parseArgument(directivesUsed[i].resolvers);
                let objectTypeName = directivesUsed[i].objectTypeName;
                if(parsedArgument.singleQuery !== undefined) {
                    fileContent += writeIncludeAllResolverWithArgs(objectTypeName, directivesUsed[i], parsedArgument.singleQuery);
                    typeDefFileContent += addToQueryType(objectTypeName, parsedArgument.singleQuery, isList = false);
                }
                if(parsedArgument.listQuery !== undefined) {
                    fileContent += writeIncludeAllResolversWithoutArgs(objectTypeName, directivesUsed[i], parsedArgument.listQuery);
                    typeDefFileContent += addToQueryType(objectTypeName, parseArgument.listQuery, isList = true);
                }
            }
        } else if(directivesUsed[i].argumentName === "interface" && directivesUsed[i].includeAllFields === false) {
            let parsedArgument = parseArgument(directivesUsed[i].resolvers);
            let interfaceTypeName = directivesUsed[i].interfaceTypeName;
            let typesImplementingInterface = {};
            for(let j = 0; j < directivesUsed.length; j++) {
                if(directivesUsed[j].argumentName === "type") {
                    if(directivesUsed[j].interfaces !== undefined) {
                        Object.entries(directivesUsed[j].interfaces).forEach(entry => {
                            const [name, value] = entry; 
                            if(name === directivesUsed[i].interfaceTypeName) {
                                typesImplementingInterface[directivesUsed[j].remoteObjectTypeName] = directivesUsed[j].objectTypeName;
                            }
                        })
                    }
                }
            }
            if(parsedArgument.singleQuery !== undefined) {
                fileContent += writeResolverWithArgs(interfaceTypeName, directivesUsed, parsedArgument.singleQuery, wsDef, remoteSchema, typesImplementingInterface);
                typeDefFileContent += addToQueryType(interfaceTypeName, parsedArgument.singleQuery, isList = false);
            } 
            if(parsedArgument.listQuery !== undefined) {
                fileContent += writeResolverWithoutArgs(interfaceTypeName, directivesUsed, parsedArgument.listQuery, remoteSchema, typesImplementingInterface);
                typeDefFileContent += addToQueryType(interfaceTypeName, parsedArgument.listQuery, isList = true);
            }
        }
    }

    fileContent += `},\n`
    /* In this for-loop we write all the field-specific resolvers that map the results from the remote server to the correct wrapper fields. */
    for(let i = 0; i < directivesUsed.length; i++) {
        // If we are wrapping a type that does not include all fields, create type-specific resolvers for it
        if(directivesUsed[i].directive === "wrap" && directivesUsed[i].argumentName === "type" && directivesUsed[i].includeAllFields === false) {
        // If we have not yet created type-specific resolvers for this object type
            fileContent += `${generateIndentation(1)}${directivesUsed[i].objectTypeName}: {\n`;
            // Loop through all the directives and look for fields inside this object type
            for(let j = 0; j < directivesUsed.length; j++) {
                // If it's the same type and we are using some other directive argument than 'type'
                if(directivesUsed[j].objectTypeName === directivesUsed[i].objectTypeName) {
                    if(directivesUsed[j].argumentName[0] === "field" || directivesUsed[j].argumentName[0] === "path") {
                        fileContent += generateTypeSpecificResolver(directivesUsed[j]);
                    }
                    // If the argumentName is 'values', the directive is concatenate
                    if(directivesUsed[j].argumentName[0] === "values") {
                        fileContent += addConcatenateResolvers(directivesUsed[j], remoteSchema.document.definitions);
                    }
                }
            }
            fileContent += `${generateIndentation(1)}},\n`;
        }
    }
    fileContent += `
}
module.exports = resolvers;    
    `;
    await fs.writeFile("wrapper-resolvers.js", fileContent);
    typeDefFileContent += "\n}";
    await fs.appendFile(typeDefFileName, typeDefFileContent);
    return fileContent;
}

const camelCase = function(input) {
    let temp = input;
    let camelCased = temp[0].toLowerCase() + temp.slice(1);
    return camelCased;
}

const parseArgument = function(input) {
    let regex = /[\W]/;
    let parsedValues = {};
    if(input.singleQuery !== undefined){
        let splitSingle = input.singleQuery.split(regex);
        parsedValues.singleQuery = {
            "resolver": splitSingle[0],
            "left": splitSingle[1],
            "right": splitSingle[3]
        };
    }
    if(input.listQuery !== undefined){
        let splitList = input.listQuery.split(regex);
        parsedValues.listQuery = {
            "resolver": splitList[0]
        };
    }
    return parsedValues;
}

const generateIndentation = function(factor) {
    let text = "";
    for(let i = 0; i < factor; i++){
        text += "\t";
    }
    return text;
}

const generateWrapQueryField = function(directivesUsed, wsDef) {
    let text = "";
    if(builtInScalars.includes(directivesUsed.fieldValue)) {
        text += `
            ${generateIndentation(6)}if(selection.name.value === "${directivesUsed.fieldName}") {
            ${generateIndentation(7)}newSelectionSet.selections.push( {
            ${generateIndentation(8)}kind: Kind.FIELD,
            ${generateIndentation(8)}name: {
            ${generateIndentation(9)}kind: Kind.NAME,
            ${generateIndentation(9)}value: "${directivesUsed.argumentValues}"
            ${generateIndentation(8)}}
            ${generateIndentation(7)}})
            ${generateIndentation(6)}}
        `;
    } else {
        text += `
            ${generateIndentation(6)}if(selection.name.value === "${directivesUsed.fieldName}") {
            ${generateIndentation(7)}newSelectionSet.selections.push( {
            ${generateIndentation(8)}kind: Kind.FIELD,
            ${generateIndentation(8)}name: {
            ${generateIndentation(9)}kind: Kind.NAME,
            ${generateIndentation(9)}value: "${directivesUsed.argumentValues}"
            ${generateIndentation(8)}},
            ${generateIndentation(8)}selectionSet: {
            ${generateIndentation(9)}kind: Kind.SELECTION_SET,
            ${generateIndentation(9)}selections: [
        `;
        for(let i = 0; i < wsDef.length; i++) {
            if(wsDef[i].objectTypeName === directivesUsed.fieldValue && wsDef[i].argumentName !== "type") {
                text += `
                    ${generateIndentation(8)}{
                    ${generateIndentation(9)}kind: Kind.FIELD,
                    ${generateIndentation(9)}name: {
                    ${generateIndentation(10)}kind: Kind.NAME,
                    ${generateIndentation(10)}value: "${wsDef[i].fieldName}"
                    ${generateIndentation(9)}}
                    ${generateIndentation(8)}},
                `;
            }
        }
        text += `
            ${generateIndentation(9)}]
            ${generateIndentation(8)}}
            ${generateIndentation(7)}})
            ${generateIndentation(6)}}
        `;
    }
    return text;
}

const generateWrapQueryPath = function(directivesUsed) {
    let text =`
        ${generateIndentation(7)}if(selection.name.value === "${directivesUsed.fieldName}") {
        ${generateIndentation(8)}newSelectionSet.selections.push( {
    `;
    for(let i = 0; i < directivesUsed.argumentValues.length; i++) {
        if(i === directivesUsed.argumentValues.length - 1) { // If we are at the last element in the list
            text += `
                ${generateIndentation((i*2) + 7)}kind: Kind.FIELD,
                ${generateIndentation((i*2) + 7)}name: {
                ${generateIndentation((i*2) + 8)}kind: Kind.NAME,
                ${generateIndentation((i*2) + 8)}value: "${directivesUsed.argumentValues[i].value}"
                ${generateIndentation((i*2) + 7)}}
            `;
            /* Loop to close out all brackets are square parenthesis */
            for(let j = 0; j < directivesUsed.argumentValues.length - 1; j++) { 
                // Close selections object }, selections list ], selection set } 
                text += `
                    ${generateIndentation(i - (j*2) + 7)}}]
                    ${generateIndentation(i - (j*2) + 6)}}
                `;
            }
        } else {
            text += `
                ${generateIndentation((i*2) + 7)}kind: Kind.FIELD,
                ${generateIndentation((i*2) + 7)}name: {
                ${generateIndentation((i*2) + 8)}kind: Kind.NAME,
                ${generateIndentation((i*2) + 8)}value: "${directivesUsed.argumentValues[i].value}"
                ${generateIndentation((i*2) + 7)}}, 
                ${generateIndentation((i*2) + 7)}selectionSet: {
                ${generateIndentation((i*2) + 8)}kind: Kind.SELECTION_SET,
                ${generateIndentation((i*2) + 8)}selections: [{
            `;
        }
    }
    text += `
        ${generateIndentation(8)}})
        ${generateIndentation(7)}}
    `;
    return text;
}


const parseConcArgs = function(directive, rsDef) {
    let remoteName = directive.remoteObjectTypeName;
    returnList = [];
    let remoteFields;
    rsDef.forEach(definition => {
        if(definition.name.value === remoteName)
            remoteFields = definition.fields;
    })
    let nameFound;
    directive.argumentValues.forEach(value => {
        nameFound = false;
        remoteFields.forEach(field => {
            if(value.value === field.name.value) {
                nameFound = true;
            }    
        })
        if(nameFound)
            returnList.push([value.value, true]);    
        else
            returnList.push([value.value, false]);    
    })
    return returnList;
}

const generateConcatenateField = function(directive, rsDef) {
    const concValues = parseConcArgs(directive,rsDef);
    let text = "";
    if(builtInScalars.includes(directive.fieldValue)) {
        text += `
        ${generateIndentation(7)}if(selection.name.value === "${directive.fieldName}") {
        `
        concValues.forEach(field => {
            if(field[1]){
                text += `
                    ${generateIndentation(5)}newSelectionSet.selections.push( {
                    ${generateIndentation(6)}kind: Kind.FIELD,
                    ${generateIndentation(7)}name: {
                    ${generateIndentation(8)}kind: Kind.NAME,
                    ${generateIndentation(8)}value: "${field[0]}"
                    ${generateIndentation(7)}}
                    ${generateIndentation(6)}}
                    ${generateIndentation(5)})
                `;
            }
        })
        text += `
        ${generateIndentation(7)}}
        `;
    }
    return [text, concValues];    
}

const addConcatenateResolvers = function(directive, rsDef) {
    const concDirective = [directive.fieldName, directive.objectTypeName, parseConcArgs(directive,rsDef)];
    let text = "";
    text += `
        ${generateIndentation(0)}${concDirective[0]}: async(parent, _, _context, _info) => {
    `;
    concDirective[2].forEach(value => {    

        if(value[1]){
            text += `
            ${generateIndentation(0)}if(parent.${concDirective[0]} === undefined) 
            ${generateIndentation(1)}parent.${concDirective[0]} = parent.${value[0]}
            ${generateIndentation(0)}else
            ${generateIndentation(1)}parent.${concDirective[0]} += parent.${value[0]}
            `;
        }
        else{
            text += `
            ${generateIndentation(0)}parent.${concDirective[0]} += "${value[0]}" \n`;
        }
    })
    text += `
        ${generateIndentation(1)}return parent.${concDirective[0]}
        ${generateIndentation(0)}}\n`
    return text
}

const addToQueryType = function(objectTypeName, argument, isList) {
    let text;

    if(isList === true) {
        text = `
    ${camelCase(objectTypeName)}s: [${objectTypeName}]
        `;
    } else {
        text = `
    ${camelCase(objectTypeName)}(${argument.left}: ${argument.right}!): ${objectTypeName}
        `;
    }
    return text;
}

const writeResolverWithArgs = function(objectTypeName, directivesUsed, remoteResolver, wsDef, remoteSchema, typesImplementingInterface) {
    let concValues = [];
    let text = `    
        ${camelCase(objectTypeName)}: async(_, args, context, info) => {
        ${generateIndentation(1)}const schema = await remoteSchema();
        ${generateIndentation(1)}const data = await delegateToSchema({
        ${generateIndentation(2)}schema: schema,
        ${generateIndentation(2)}operation: 'query',
        ${generateIndentation(2)}fieldName: '${remoteResolver.resolver}',
        ${generateIndentation(2)}args: {
        ${generateIndentation(3)}${remoteResolver.left}: args.${remoteResolver.left}
        ${generateIndentation(2)}},
        ${generateIndentation(2)}context, 
        ${generateIndentation(2)}info,
        ${generateIndentation(2)}transforms: [
        ${generateIndentation(3)}new WrapQuery(
        ${generateIndentation(4)}["${remoteResolver.resolver}"],
        ${generateIndentation(4)}(subtree) => {
        ${generateIndentation(5)}const newSelectionSet = {
        ${generateIndentation(6)}kind: Kind.SELECTION_SET,
        ${generateIndentation(6)}selections: [] 
        ${generateIndentation(5)}}
        ${generateIndentation(5)}subtree.selections.forEach(selection => {
    `;
    for(let i = 0; i < directivesUsed.length; i++){
        if(directivesUsed[i].objectTypeName === objectTypeName || directivesUsed[i].interfaceTypeName === objectTypeName){
            if(directivesUsed[i].directive === "wrap") {
                if(directivesUsed[i].argumentName.includes("field")) {
                    text += generateWrapQueryField(directivesUsed[i], directivesUsed);
                } 
                if(directivesUsed[i].argumentName.includes("path")) {
                    text += generateWrapQueryPath(directivesUsed[i]);
                }
            }
            if(directivesUsed[i].directive === "concatenate") {
                textAndConcValues = generateConcatenateField(directivesUsed[i], remoteSchema.document.definitions);
                text += textAndConcValues[0];
                concValues.push(textAndConcValues[1]);
            }
        }
    }
    text += `
        ${generateIndentation(6)}})
        ${generateIndentation(4)}return newSelectionSet;
        ${generateIndentation(3)}},
    `;
    if(typesImplementingInterface !== undefined) {
        text += `
            ${generateIndentation(2)}result => {
            ${generateIndentation(3)}if(result !== null) {
        `;
        Object.entries(typesImplementingInterface).forEach(entry => {
            const [name, value] = entry;
            text += `
                ${generateIndentation(3)}if(result.__typename === "${name}") {
                ${generateIndentation(4)}result.__typename = "${value}";
                ${generateIndentation(3)}}
            `;
        })
        text += `
            ${generateIndentation(3)}}
            ${generateIndentation(3)}return result;
            ${generateIndentation(2)}}
        `;
    } else {
        text += `
            ${generateIndentation(2)}result => {
            ${generateIndentation(3)}return result;
            ${generateIndentation(2)}}
        `;
    }

    text += `
        ${generateIndentation(2)}),
        ${generateIndentation(1)}]
        ${generateIndentation(1)}})
        ${generateIndentation(1)}return data;
        },
    `;
    return text;
}

const generateTypeSpecificResolver = function(directive) {
    let text = "";
    if(directive.argumentName.includes("field")){
        text += `${generateIndentation(2)}${directive.fieldName}: (parent) => {\n`;
        text += `${generateIndentation(3)}return (parent.${directive.argumentValues} !== undefined) ? parent.${directive.argumentValues} : null;\n`;
        text += `${generateIndentation(2)}},\n`;
    } else if(directive.argumentName.includes("path")) {
        text += `${generateIndentation(2)}${directive.fieldName}: (parent) => {\n`;
        let path = "parent.";
        for(let i = 0; i < directive.argumentValues.length; i++) {
            path += directive.argumentValues[i].value;
            // If we're not on the last element
            if(i !== (directive.argumentValues.length - 1)) {
                path += ".";
            }
        }
        text += `${generateIndentation(3)}return (${path} !== undefined) ? ${path} : null;\n`;
        text += `${generateIndentation(2)}},\n`;
    } else if(directive.argumentName.includes("concatenate")) {
        console.log("hey!");
    }
    return text;
}

const writeResolverWithoutArgs = function(objectTypeName, directivesUsed, remoteResolver, remoteSchema){
    let text = `    
        ${camelCase(objectTypeName)}s: async(_, __, context, info) => {
        ${generateIndentation(1)}const schema = await remoteSchema();
        ${generateIndentation(1)}const data = await delegateToSchema({
        ${generateIndentation(2)}schema: schema,
        ${generateIndentation(2)}operation: 'query',
        ${generateIndentation(2)}fieldName: '${remoteResolver.resolver}',
        ${generateIndentation(2)}context, 
        ${generateIndentation(2)}info,
        ${generateIndentation(2)}transforms: [
        ${generateIndentation(3)}new WrapQuery(
        ${generateIndentation(4)}["${remoteResolver.resolver}"],
        ${generateIndentation(4)}(subtree) => {
        ${generateIndentation(5)}const newSelectionSet = {
        ${generateIndentation(6)}kind: Kind.SELECTION_SET,
        ${generateIndentation(6)}selections: [] 
        ${generateIndentation(5)}}
        ${generateIndentation(5)}subtree.selections.forEach(selection => {
    `;
    for(let i = 0; i < directivesUsed.length; i++){
        if(directivesUsed[i].objectTypeName === objectTypeName){
            if(directivesUsed[i].directive === "wrap") {
                if(directivesUsed[i].argumentName.includes("field")) {
                    text += generateWrapQueryField(directivesUsed[i], directivesUsed);
                } 
                if(directivesUsed[i].argumentName.includes("path")) {
                    text += generateWrapQueryPath(directivesUsed[i]);
                }
            }
            if(directivesUsed[i].directive === "concatenate") {             
                textAndConcValues = generateConcatenateField(directivesUsed[i], remoteSchema.document.definitions);
                text += textAndConcValues[0];
                concValues = textAndConcValues[1];
            }
        }
    }
    text += `
        ${generateIndentation(6)}})
        ${generateIndentation(4)}return newSelectionSet;
        ${generateIndentation(3)}},
        ${generateIndentation(3)}result => {
        ${generateIndentation(4)}return result;
        ${generateIndentation(3)}}
        ${generateIndentation(2)})
        ${generateIndentation(1)}]
    `;

    text += `
        ${generateIndentation(1)}})
        ${generateIndentation(1)}return data;
        },
    `;
    return text;
}

const writeIncludeAllResolverWithArgs = function(objectTypeName, directiveItem, remoteResolver) {
    let text = `    
        ${camelCase(objectTypeName)}: async(_, args, context, info) => {
        ${generateIndentation(1)}const schema = await remoteSchema();
        ${generateIndentation(1)}const data = await delegateToSchema({
        ${generateIndentation(2)}schema: schema,
        ${generateIndentation(2)}operation: 'query',
        ${generateIndentation(2)}fieldName: '${remoteResolver.resolver}',
        ${generateIndentation(2)}args: {
        ${generateIndentation(3)}${remoteResolver.left}: args.${remoteResolver.left}
        ${generateIndentation(2)}},
        ${generateIndentation(2)}context, 
        ${generateIndentation(2)}info,
        ${generateIndentation(2)}transforms: [
        ${generateIndentation(3)}new WrapQuery(
        ${generateIndentation(4)}["${remoteResolver.resolver}"],
        ${generateIndentation(4)}(subtree) => {
        ${generateIndentation(5)}const newSelectionSet = {
        ${generateIndentation(6)}kind: Kind.SELECTION_SET,
        ${generateIndentation(6)}selections: [] 
        ${generateIndentation(5)}}
        ${generateIndentation(5)}subtree.selections.forEach(selection => {
    `;
    Object.entries(directiveItem.includeFields).forEach(entry => {
        const [name, value] = entry;
        if(builtInScalars.includes(value)) { // We currently only support built-in scalars.
            text += `
                ${generateIndentation(4)}if(selection.name.value === "${name}") {
                ${generateIndentation(5)}newSelectionSet.selections.push({
                ${generateIndentation(6)}kind: Kind.FIELD,
                ${generateIndentation(6)}name: {
                ${generateIndentation(7)}kind: Kind.NAME,
                ${generateIndentation(7)}value: "${name}"
                ${generateIndentation(6)}}
                ${generateIndentation(5)}})
                ${generateIndentation(4)}}
            `; 
        }
    });
    text += `
        ${generateIndentation(5)}})
        ${generateIndentation(4)}return newSelectionSet;
        ${generateIndentation(3)}},
        ${generateIndentation(3)}(result) => {
        ${generateIndentation(4)}return result;
        ${generateIndentation(3)}}
        ${generateIndentation(2)}),
        ${generateIndentation(1)}]
        ${generateIndentation(1)}})
        ${generateIndentation(1)}return data;
        },
    `;
    return text;
}

const writeIncludeAllResolversWithoutArgs = function(objectTypeName, directiveItem, remoteResolver) {
    let text = `    
        ${camelCase(objectTypeName)}s: async(_, __, context, info) => {
        ${generateIndentation(1)}const schema = await remoteSchema();
        ${generateIndentation(1)}const data = await delegateToSchema({
        ${generateIndentation(2)}schema: schema,
        ${generateIndentation(2)}operation: 'query',
        ${generateIndentation(2)}fieldName: '${remoteResolver.resolver}',
        ${generateIndentation(2)}context, 
        ${generateIndentation(2)}info,
        ${generateIndentation(2)}transforms: [
        ${generateIndentation(3)}new WrapQuery(
        ${generateIndentation(4)}["${remoteResolver.resolver}"],
        ${generateIndentation(4)}(subtree) => {
        ${generateIndentation(5)}const newSelectionSet = {
        ${generateIndentation(6)}kind: Kind.SELECTION_SET,
        ${generateIndentation(6)}selections: [] 
        ${generateIndentation(5)}}
        ${generateIndentation(5)}subtree.selections.forEach(selection => {
    `;
    Object.entries(directiveItem.includeFields).forEach(entry => {
        const [name, value] = entry;
        if(builtInScalars.includes(value)) { // We currently only support built-in scalars.
            text += `
                ${generateIndentation(4)}if(selection.name.value === "${name}") {
                ${generateIndentation(5)}newSelectionSet.selections.push({
                ${generateIndentation(6)}kind: Kind.FIELD,
                ${generateIndentation(6)}name: {
                ${generateIndentation(7)}kind: Kind.NAME,
                ${generateIndentation(7)}value: "${name}"
                ${generateIndentation(6)}}
                ${generateIndentation(5)}})
                ${generateIndentation(4)}}
            `; 
        }
    });
    text += `
        ${generateIndentation(5)}})
        ${generateIndentation(4)}return newSelectionSet;
        ${generateIndentation(3)}},
        ${generateIndentation(3)}(result) => {
        ${generateIndentation(4)}result.forEach(function(element) {
    `;
    Object.entries(directiveItem.includeFields).forEach(entry => {
        const [name, value] = entry;
        if(builtInScalars.includes(value)) { // We currently only support built-in scalars.
            text += `
                ${generateIndentation(3)}if(element.${name} !== undefined) {
                ${generateIndentation(4)}element.${name} = element.${name}; 
                ${generateIndentation(3)}}
            `;
        }
    });
    text += `
        ${generateIndentation(4)}});
        ${generateIndentation(4)}return result;
        ${generateIndentation(3)}}
        ${generateIndentation(2)}),
        ${generateIndentation(1)}]
        ${generateIndentation(1)}})
        ${generateIndentation(1)}return data;
        },
    `;
    return text;
}

const generateTypeDefinitions = async function(wsDef, fileName, directivesUsed) {
    let fileContent = "";
    wsDef.definitions.forEach(ast => {
        visit(ast, {
            ObjectTypeDefinition(node) {
                if(fileContent === "") { // If the content is currently empty we should not add any brackets 
                    fileContent += "type " + node.name.value;
                } else {
                    fileContent += "}\n\n type " + node.name.value;
                }
                // Check if the user wants to implement any interfaces
                for(let i = 0; i < directivesUsed.length; i++) {
                    if(directivesUsed[i].objectTypeName === node.name.value && directivesUsed[i].interfaces !== undefined) {
                        fileContent += " implements";
                        Object.keys(directivesUsed[i].interfaces).forEach(key => {
                            fileContent += " & " + key;
                        });
                    }
                }
                fileContent += " {\n"; // new line to field declarations
                // Check if the user wants to include all fields
                for(let i = 0; i < directivesUsed.length; i++) {
                    if(directivesUsed[i].objectTypeName === node.name.value && directivesUsed[i].includeAllFields === true) {
                        // If they want to include all fields, add the fields to the type definition
                        Object.entries(directivesUsed[i].includeFields).forEach(entry => {
                            const [name, value] = entry;
                            if(builtInScalars.includes(value)) { // Currently we only support built in scalars!
                                fileContent += `\t${name}: ${value}\n`;
                            }
                        });
                    }
                }
            }
        });
        visit(ast, {
            InterfaceTypeDefinition(node) {
                if(fileContent === "") { // If the content is currently empty we should not add any brackets 
                    fileContent += "interface " + node.name.value + " {\n";
                } else {
                    fileContent += "}\n\n interface " + node.name.value + " {\n";
                }
                // Check if the user wants to include all fields
                for(let i = 0; i < directivesUsed.length; i++) {
                    if(directivesUsed[i].objectTypeName === node.name.value && directivesUsed[i].includeAllFields === true) {
                        // If they want to include all fields, add the fields to the type definition
                        Object.entries(directivesUsed[i].includeFields).forEach(entry => {
                            const [name, value] = entry;
                            if(builtInScalars.includes(value)) { // Currently we only support built in scalars!
                                fileContent += `\t${name}: ${value}\n`;
                            }
                        });
                    }
                }
            }
        });
        visit(ast, {
            FieldDefinition(node) {
                fileContent += "\t" + node.name.value;
                if(node.arguments.length > 0) {
                    fileContent += "(";
                }
                for(let i = 0; i < node.arguments.length; i++){
                    fileContent += node.arguments[i].name.value + ": " + node.arguments[i].type.type.name.value;
                    if(node.arguments[i].type.kind === "NonNullType"){
                        fileContent += "!";
                    }
                }
                if(node.arguments.length > 0) {
                    fileContent += ")";
                }
                let value = parseValue(node);
                if(Array.isArray(value)) {
                    value = `[${value}]`;
                }
                fileContent += ": " + value + "\n";
            }
        });
    });
    fileContent += "}";
    fileContent += `

type Query {
    `;
    await fs.writeFile(fileName, fileContent);
    return fileContent;
}

const parseValue = function(node) {
    let returnValue;
    visit(node, {
        NamedType(named) {
            returnValue = named.name.value;
        }
    });
    visit(node, {
        ListType(list) {
            visit(list, {
                NamedType(named) {
                    returnValue = [named.name.value];
                }
            });
        }
    });
    return returnValue;
}

const writeToFile = function(fileName, fileContent) {
    fs.readFile(fileName, function(err, data) {
        if(data === undefined) { //File does not exist
            fs.writeFileSync(fileName, fileContent);
        } else {
            const answer = prompt(`Filename already exists! Are you sure you want to use name ${fileName}? (Y/N)`);
            if(answer.toLowerCase === "y") {
                fs.writeFileSync(fileName, fileContent);
                console.log("Wrote to file");
            } else {
                console.log("Did not write to file!");
            }
        }
    });
}

exports.generateSchema = generateSchema;