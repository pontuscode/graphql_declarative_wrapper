const { makeExecutableSchema } = require("@graphql-tools/schema");
const { loadSchemaSync } = require('@graphql-tools/load');
const { GraphQLFileLoader } = require('@graphql-tools/graphql-file-loader');
const { delegateToSchema } = require("@graphql-tools/delegate");
const fs = require("fs").promises;
const { parse, visit, print } = require("graphql/language");
const { ApolloServer } = require("apollo-server/node_modules/apollo-server-express");
const { wrapSchema, introspectSchema } = require('@graphql-tools/wrap');
const { split } = require("lodash");
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
    const typeDefinitions = await generateTypeDefinitions(wsDef.schema[0].document, wrapperName);
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
    for(let i = 0; i < directivesUsed.length; i++){
        if(directivesUsed[i].argumentName === "type") {
            if(directivesUsed[i].resolvers !== undefined){
                let parsedArgument = parseArgument(directivesUsed[i].resolvers);
                let objectTypeName = directivesUsed[i].objectTypeName;
                if(parsedArgument.singleQuery !== undefined) {
                    fileContent += writeResolverWithArgs(objectTypeName, directivesUsed, parsedArgument.singleQuery, wsDef);
                    typeDefFileContent += addToQueryType(objectTypeName, parsedArgument.singleQuery, isList = false);
                } 
                if(parsedArgument.listQuery !== undefined) {
                    fileContent += writeResolverWithoutArgs(objectTypeName, directivesUsed, parsedArgument.listQuery);
                    typeDefFileContent += addToQueryType(objectTypeName, parsedArgument.listQuery, isList = true);
                }
            }
        }
    }
    fileContent += `}
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
        //console.log(splitSingle);
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
    //console.log(parsedValues);
    return parsedValues;
    /*let splitSingle = input.split(regex);
    let parsedValues = {
        "remoteResolver": splitString[0]
    }
    if(splitString.length > 1) { // If there were no arguments, the length of the split will be only the resolver function (so length is 1)
        argument = {
            "left": splitString[1],
            "right": splitString[2]
        }
        parsedValues.argument = argument;
    }
    return parsedValues;*/
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
            ${generateIndentation(7)}return {
            ${generateIndentation(8)}kind: Kind.FIELD,
            ${generateIndentation(8)}name: {
            ${generateIndentation(9)}kind: Kind.NAME,
            ${generateIndentation(9)}value: "${directivesUsed.argumentValues}"
            ${generateIndentation(8)}}
            ${generateIndentation(7)}}
            ${generateIndentation(6)}}
        `;
    } else {
        text += `
            ${generateIndentation(6)}if(selection.name.value === "${directivesUsed.fieldName}") {
            ${generateIndentation(7)}return {
            ${generateIndentation(8)}kind: Kind.FIELD,
            ${generateIndentation(8)}name: {
            ${generateIndentation(9)}kind: Kind.NAME,
            ${generateIndentation(9)}value: "${directivesUsed.argumentValues}"
            ${generateIndentation(8)}},
            ${generateIndentation(8)}selectionSet: {
            ${generateIndentation(9)}kind: Kind.SELECTION_SET,
            ${generateIndentation(9)}selections: [
        `;
        //console.log(wsDef);
        for(let i = 0; i < wsDef.length; i++) {
            if(wsDef[i].objectTypeName === directivesUsed.fieldValue && wsDef[i].argumentName !== "type") {
                //console.log(wsDef[i]);
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
            ${generateIndentation(7)}}
            ${generateIndentation(6)}}
        `;
    }
    return text;
}

const generateWrapQueryPath = function(directivesUsed) {
    let text =`
        ${generateIndentation(7)}if(selection.name.value === "${directivesUsed.fieldName}") {
        ${generateIndentation(8)}return {
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
        ${generateIndentation(8)}}
        ${generateIndentation(7)}}
    `;
    return text;
}

const generateWrapResult = function(directivesUsed) {
    let text = "";
    if(directivesUsed.argumentName.includes("field")) {
        text += `
            ${generateIndentation(3)}if(result.${directivesUsed.argumentValues} !== undefined) {
            ${generateIndentation(4)}result.${directivesUsed.fieldName} = result.${directivesUsed.argumentValues};
            ${generateIndentation(3)}}
        `;
    } 
    if(directivesUsed.argumentName.includes("path")) {
        let tempText = "result";
        for(let i = 0; i < directivesUsed.argumentValues.length; i++) {
            tempText += "." + directivesUsed.argumentValues[i].value;
            if(i == directivesUsed.argumentValues.length - 1) { // If we are at the last element, set the result object to its value
                text += `
                    ${generateIndentation(i + 1)}result.${directivesUsed.fieldName} = ${tempText};
                `;
                for(let j = 1; j < directivesUsed.argumentValues.length; j++) {
                    text += `
                        ${generateIndentation(i + 1 - j)}}
                    `;
                }
            } else { // Else, just keep building the if statement
                text += `
                    ${generateIndentation(i + 1)}if(${tempText} !== undefined) {
                `;
            }
        }
    }
    return text;
}

const generateWrapListResult = function(directivesUsed) {
    let text = "";
    //console.log(directivesUsed);
    if(directivesUsed.argumentName.includes("field")) {
        text += `
            ${generateIndentation(4)}if(element.${directivesUsed.argumentValues} !== undefined) {
            ${generateIndentation(5)}element.${directivesUsed.fieldName} = element.${directivesUsed.argumentValues};
            ${generateIndentation(4)}}
        `;
    } 
    if(directivesUsed.argumentName.includes("path")) {
        let tempText = "element";
        for(let i = 0; i < directivesUsed.argumentValues.length; i++) {
            tempText += "." + directivesUsed.argumentValues[i].value;
            if(i == directivesUsed.argumentValues.length - 1) { // If we are at the last element, set the result object to its value
                text += `
                    ${generateIndentation(i + 2)}element.${directivesUsed.fieldName} = ${tempText};
                `;
                for(let j = 1; j < directivesUsed.argumentValues.length; j++) {
                    text += `
                        ${generateIndentation(i + 1 - j)}}
                    `;
                }
            } else { // Else, just keep building the if statement
                text += `
                    ${generateIndentation(i + 2)}if(${tempText} !== undefined) {
                `;
            }
        }
    }
    return text;
}

const writeResolverWithArgs = function(objectTypeName, directivesUsed, remoteResolver, wsDef) {
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
        ${generateIndentation(6)}selections: subtree.selections.map(selection => {
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
        }
    }
    text += `
        ${generateIndentation(6)}})
        ${generateIndentation(5)}};
        ${generateIndentation(4)}return newSelectionSet;
        ${generateIndentation(3)}},
        ${generateIndentation(3)}(result) => {
    `;
    for(let i = 0; i < directivesUsed.length; i++){
        if(directivesUsed[i].objectTypeName === objectTypeName) {
            if(directivesUsed[i].directive === "wrap") {
                if(directivesUsed[i].argumentName.includes("field") || directivesUsed[i].argumentName.includes("path")) {
                    text += generateWrapResult(directivesUsed[i]);
                }
            }
        }
    }
    text += `
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

const writeResolverWithoutArgs = function(objectTypeName, directivesUsed, remoteResolver){
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
        ${generateIndentation(6)}selections: subtree.selections.map(selection => {
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
        }
    }
    text += `
        ${generateIndentation(6)}})
        ${generateIndentation(5)}};
        ${generateIndentation(4)}return newSelectionSet;
        ${generateIndentation(3)}},
        ${generateIndentation(3)}(result) => {
        ${generateIndentation(4)}result.forEach(function(element) {
    `;
    for(let i = 0; i < directivesUsed.length; i++){
        if(directivesUsed[i].objectTypeName === objectTypeName) {
            if(directivesUsed[i].directive === "wrap") {
                if(directivesUsed[i].argumentName.includes("field") || directivesUsed[i].argumentName.includes("path")) {
                    text += generateWrapListResult(directivesUsed[i]);
                }
            }
        }
    }
    text += `
        ${generateIndentation(4)}})
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

const generateTypeDefinitions = async function(wsDef, fileName) {
    let fileContent = "";
    wsDef.definitions.forEach(ast => {
        visit(ast, {
            ObjectTypeDefinition(node) {
                if(fileContent === "") { // If the content is currently empty we should not add any brackets 
                    fileContent += "type " + node.name.value + " {\n";
                } else {
                    fileContent += "}\n\n type " + node.name.value + " {\n";
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