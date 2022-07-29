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

//-----------------------------------------------------------------------------------//
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

//-----------------------------------------------------------------------------------//
/**
 * 
 * @param {*} wsDef 
 * @param {*} fileName 
 * @param {*} directivesUsed 
 * @returns 
 */
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
                    if(directivesUsed[i].interfaceTypeName === node.name.value && directivesUsed[i].includeAllFields === true) {
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
                    if(value.includes("!")) { // Check if is non-null
                        value = `[${value}!]`;
                    } else {
                        value = `[${value}]`;
                    }
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

//-----------------------------------------------------------------------------------//
/**
 * 
 * @param {*} wsDef 
 * @param {*} directivesUsed 
 * @param {*} remoteSchema 
 * @param {*} remoteServerUrl 
 * @param {*} typeDefFileName 
 * @returns 
 */
const generateResolvers = async function(wsDef, directivesUsed, remoteSchema, remoteServerUrl, typeDefFileName) {
    let typeDefFileContent = "";
    let extractNestedFieldsTextOne = "";
    let extractNestedFieldsTextTwo = "";

    let fileContent = "const { wrapSchema, WrapQuery, introspectSchema, RenameObjectFields } = require('@graphql-tools/wrap')\n";
    fileContent += "const { fetch } = require('cross-fetch');\n";
    fileContent += "const { delegateToSchema } = require('@graphql-tools/delegate')\n";
    fileContent += "const { print } = require('graphql/language');\n";
    fileContent += "const { Kind } = require('graphql');\n\n"

    fileContent += "const executor = async ({ document, variables }) => {\n";
    fileContent += `${generateIndentation(1)}const query = print(document);\n`;
    fileContent += `${generateIndentation(1)}const fetchResult = await fetch("${remoteServerUrl}", {\n`;
    fileContent += `${generateIndentation(2)}method: "POST",\n`;
    fileContent += `${generateIndentation(2)}headers: {\n`;
    fileContent += `${generateIndentation(3)}"Content-Type": "application/json",\n`;
    fileContent += `${generateIndentation(2)}},\n`;
    fileContent += `${generateIndentation(2)}body: JSON.stringify({ query, variables }),\n`;
    fileContent += `${generateIndentation(1)}});\n`;
    fileContent += `${generateIndentation(1)}return fetchResult.json();\n`;
    fileContent += `};\n\n`;

    fileContent += "const remoteSchema = async () => {\n";
    fileContent += `${generateIndentation(1)}const schema = await introspectSchema(executor);\n`;
    fileContent += `${generateIndentation(1)}return wrapSchema({\n`;
    fileContent += `${generateIndentation(2)}schema,\n`;
    fileContent += `${generateIndentation(2)}executor\n`;
    fileContent += `${generateIndentation(1)}});\n`;
    fileContent += "};\n\n";

    fileContent += "let schema;\n\n";
    
    fileContent += "const getRemoteSchema = async() => {\n";
    fileContent += `${generateIndentation(1)}schema = await remoteSchema();\n`;
    fileContent += "}\n\n";

    fileContent += "getRemoteSchema();\n\n";

    fileContent += "const resolvers = {\n";
    fileContent += `${generateIndentation(1)}Query: {\n`;
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
                    let temp = writeResolverWithoutArgs(objectTypeName, directivesUsed, parsedArgument.listQuery, remoteSchema);
                    // fileContent += writeResolverWithoutArgs(objectTypeName, directivesUsed, parsedArgument.listQuery, remoteSchema);
                    fileContent += temp[0]
                    extractNestedFieldsTextOne += temp[1];
                    extractNestedFieldsTextTwo += temp[2];

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
            // If it is an interface type we need to find which object types are implementing it
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
                let temp = writeResolverWithoutArgs(interfaceTypeName, directivesUsed, parsedArgument.listQuery, remoteSchema, typesImplementingInterface);
                fileContent += temp[0]
                extractNestedFieldsTextOne += temp[1]
                extractNestedFieldsTextTwo += temp[2]
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
                    if(directivesUsed[j].argumentName === "field" || directivesUsed[j].argumentName === "path") {
                        fileContent += generateTypeSpecificResolver(directivesUsed[j], directivesUsed);
                    }
                    // If the argumentName is 'values', the directive is concatenate
                    if(directivesUsed[j].argumentName === "values") {
                        fileContent += addConcatenateResolvers(directivesUsed[j], remoteSchema.document.definitions);
                    }
                }
            }
            fileContent += `${generateIndentation(1)}},\n`;
        // The structure of an includeAllFields directive is slightly different, so if it is used we used a separate function to generate its resolvers
        } else if(directivesUsed[i].directive === "wrap" && directivesUsed[i].argumentName === "type" && directivesUsed[i].includeAllFields === true) {
            fileContent += `${generateIndentation(1)}${directivesUsed[i].objectTypeName}: {\n`;
            fileContent += generateIncludeAllTypeSpecificResolver(directivesUsed[i]);
            fileContent += `${generateIndentation(1)}},\n`;
        }
    }
    fileContent += "}\n";
    fileContent += writeNestedExtractFunctions(directivesUsed, remoteSchema.document.definitions);
    fileContent += "module.exports = resolvers;\n";

    await fs.writeFile("wrapper-resolvers.js", fileContent);
    typeDefFileContent += "\n}";

    await fs.appendFile(typeDefFileName, typeDefFileContent);
    return fileContent;
}

//-----------------------------------------------------------------------------------//
/**
 * 
 * @param {*} input 
 * @returns 
 */
const camelCase = function(input) {
    let temp = input;
    let camelCased = temp[0].toLowerCase() + temp.slice(1);
    return camelCased;
}

//-----------------------------------------------------------------------------------//
/**
 * 
 * @param {*} input 
 * @returns 
 */
const upperCase = function(input) {
    let temp = input;
    let capitalCased = temp[0].toUpperCase() + temp.slice(1);
    return capitalCased;
}

//-----------------------------------------------------------------------------------//
/**
 * 
 * @param {*} input 
 * @returns 
 */
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

//-----------------------------------------------------------------------------------//
/**
 * 
 * @param {*} factor 
 * @returns 
 */
const generateIndentation = function(factor) {
    let text = "";
    for(let i = 0; i < factor; i++){
        text += "\t";
    }
    return text;
}

//-----------------------------------------------------------------------------------//
/**
 * 
 * @param {*} directivesUsed 
 * @param {*} selectionName 
 * @param {*} selectionSetName 
 * @param {*} indentationOffset 
 * @returns 
 */
const generateWrapQueryPath = function(directivesUsed, selectionName, selectionSetName, indentationOffset) {
    let text =`
        ${generateIndentation(indentationOffset)}if(${selectionName}.name.value === "${directivesUsed.fieldName}") {
        ${generateIndentation(indentationOffset + 1)}${selectionSetName}.selections.push( {
    `;
    
    for(let i = 0; i < directivesUsed.argumentValues.length; i++) {
        if(i === directivesUsed.argumentValues.length - 1) { // If we are at the last element in the list
            text += `
                ${generateIndentation((i*2) + indentationOffset)}kind: Kind.FIELD,
                ${generateIndentation((i*2) + indentationOffset)}name: {
                ${generateIndentation((i*2) + indentationOffset + 1)}kind: Kind.NAME,
                ${generateIndentation((i*2) + indentationOffset + 1)}value: "${directivesUsed.argumentValues[i].value}"
                ${generateIndentation((i*2) + indentationOffset)}}
            `;
            /* Loop to close out all brackets and square parenthesis */
            for(let j = 0; j < directivesUsed.argumentValues.length - 1; j++) { 
                // Close selections object }, selections list ], selection set } 
                text += `
                    ${generateIndentation(i - (j*2) + indentationOffset - 1)}}]
                    ${generateIndentation(i - (j*2) + indentationOffset - 2)}}
                `;
            }
        } else {

            text += `
                ${generateIndentation((i*2) + indentationOffset)}kind: Kind.FIELD,
                ${generateIndentation((i*2) + indentationOffset)}name: {
                ${generateIndentation((i*2) + indentationOffset + 1)}kind: Kind.NAME,
                ${generateIndentation((i*2) + indentationOffset + 1)}value: "${directivesUsed.argumentValues[i].value}"
                ${generateIndentation((i*2) + indentationOffset)}}, 
                ${generateIndentation((i*2) + indentationOffset)}selectionSet: {
                ${generateIndentation((i*2) + indentationOffset + 1)}kind: Kind.SELECTION_SET,
                ${generateIndentation((i*2) + indentationOffset + 1)}selections: [{
            `;
        }
    }
    text += `
        ${generateIndentation(indentationOffset + 1)}})
        ${generateIndentation(indentationOffset)}}
    `;
    return text;
}

//-----------------------------------------------------------------------------------//
/**
 * 
 * @param {*} directive 
 * @param {*} rsDef 
 * @returns 
 */
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

//-----------------------------------------------------------------------------------//
/**
 * 
 * @param {*} directive 
 * @param {*} rsDef 
 * @param {*} remoteResolver 
 * @returns 
 */
const generateConcatenateField = function(directive, rsDef, remoteResolver) {
    const concValues = parseConcArgs(directive,rsDef);
    let text = "";
    let extractNestedFieldsTextOne = ""
    let extractNestedFieldsTextTwo = ""
    if(builtInScalars.includes(directive.fieldValue)) {
        text += `
        ${generateIndentation(6)}if(selection.name.value === "${directive.fieldName}") {
        `;
        extractNestedFieldsTextOne += `
        ${generateIndentation(1)}if(remoteResolver.name.value === "${directive.remoteObjectTypeName}"){
        ${generateIndentation(2)}if(nestedSelection.name.value === "${directive.fieldName}"){`;
        extractNestedFieldsTextTwo += `
        ${generateIndentation(1)}if(remoteResolver.ofType.name === "${directive.remoteObjectTypeName}"){
        ${generateIndentation(2)}if(nestedSelection.name.value === "${directive.fieldName}"){`;
        concValues.forEach(field => {
            if(field[1]){
                text += `
                    ${generateIndentation(4)}newSelectionSet.selections.push( {
                    ${generateIndentation(5)}kind: Kind.FIELD,
                    ${generateIndentation(6)}name: {
                    ${generateIndentation(7)}kind: Kind.NAME,
                    ${generateIndentation(7)}value: "${field[0]}"
                    ${generateIndentation(6)}}
                    ${generateIndentation(5)}}
                    ${generateIndentation(4)})
                `;
                extractNestedFieldsTextOne += `
                    ${generateIndentation(0)}result.selections.push( {
                    ${generateIndentation(1)}kind: Kind.FIELD,
                    ${generateIndentation(1)}name: {
                    ${generateIndentation(2)}kind: Kind.NAME,
                    ${generateIndentation(2)}value: "${field[0]}"
                    ${generateIndentation(1)}}
                    ${generateIndentation(0)}})`;
                extractNestedFieldsTextTwo += `
                    ${generateIndentation(0)}result.selections.push( {
                    ${generateIndentation(1)}kind: Kind.FIELD,
                    ${generateIndentation(1)}name: {
                    ${generateIndentation(2)}kind: Kind.NAME,
                    ${generateIndentation(2)}value: "${field[0]}"
                    ${generateIndentation(1)}}
                    ${generateIndentation(0)}})`;
            }
        })
        text += `
        ${generateIndentation(6)}}
        `;
        extractNestedFieldsTextOne += `
        ${generateIndentation(2)}}
        ${generateIndentation(1)}}
        `;
        extractNestedFieldsTextTwo += `
        ${generateIndentation(2)}}
        ${generateIndentation(1)}}
        `;
    }
    return [text, extractNestedFieldsTextOne, extractNestedFieldsTextTwo]
}

//-----------------------------------------------------------------------------------//
/**
 * 
 * @param {*} directive 
 * @param {*} rsDef 
 * @returns 
 */
const addConcatenateResolvers = function(directive, rsDef) {
    const concDirective = [directive.fieldName, directive.objectTypeName, parseConcArgs(directive,rsDef)];
    let text = "";
    text += `
        ${generateIndentation(0)}${concDirective[0]}: async(parent) => {
    `;
    
    concDirective[2].forEach(value => {    

        if(value[1]){
            text += `
            ${generateIndentation(0)}if(parent.${concDirective[0]} === undefined && parent.${value[0]} !== undefined) 
            ${generateIndentation(1)}parent.${concDirective[0]} = parent.${value[0]}
            ${generateIndentation(0)}else if(parent.${value[0]} !== undefined)
            ${generateIndentation(1)}parent.${concDirective[0]} += parent.${value[0]}
            `;
        }
        else{
            text += `
            ${generateIndentation(0)}if(parent.${concDirective[0]} === undefined) 
            ${generateIndentation(1)}parent.${concDirective[0]} = "${value[0]}" 
            ${generateIndentation(0)}else
            ${generateIndentation(1)}parent.${concDirective[0]} += "${value[0]}"
            `;
        }
    })
    text += `
        ${generateIndentation(1)}return parent.${concDirective[0]}
        ${generateIndentation(0)}},\n`
    return text
}

//-----------------------------------------------------------------------------------//
/**
 * 
 * @param {*} objectTypeName 
 * @param {*} argument 
 * @param {*} isList 
 * @returns 
 */
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

//-----------------------------------------------------------------------------------//
/**
 * 
 * @param {*} directivesUsed 
 * @param {*} objectTypeName 
 * @param {*} rsDef 
 * @returns 
 */
const writeTypeSpecificExtractFunction = function(directivesUsed, objectTypeName, rsDef) {
    let text = "";
    
    for(let i = 0; i < directivesUsed.length; i++) {
        if(directivesUsed[i].directive === "wrap") {
            // If it's a field and its value type is not included in the list of built-in scalars, then again we need to call the correct nested function
            if(
                directivesUsed[i].argumentName === "field" && 
                (directivesUsed[i].objectTypeName === objectTypeName || directivesUsed[i].interfaceTypeName === objectTypeName) && 
                builtInScalars.includes(directivesUsed[i].fieldValue) === false
            ) {
                if(Array.isArray(directivesUsed[i].fieldValue)) {
                    directivesUsed[i].fieldValue = directivesUsed[i].fieldValue[0]
                }

                text += `${generateIndentation(2)}if(nestedSelection.name.value === "${directivesUsed[i].fieldName}") {\n`; 
                text += `${generateIndentation(3)}result.selections.push({\n`;
                text += `${generateIndentation(4)}kind: Kind.FIELD,\n`;
                text += `${generateIndentation(4)}name: {\n`;
                text += `${generateIndentation(5)}kind: Kind.NAME,\n`;
                text += `${generateIndentation(5)}value: "${directivesUsed[i].argumentValues}"\n`;
                text += `${generateIndentation(4)}},\n`;
                text += `${generateIndentation(3)}selectionSet: extractNested${directivesUsed[i].fieldValue}Fields(nestedSelection)\n`;
                text += `${generateIndentation(3)}})\n`
                text += `${generateIndentation(2)}}\n`
            }
            // If it's a field and its value type is included in the built-in scalars, then just map the field name to the remote schema
            if(
                directivesUsed[i].argumentName === "field" && 
                (directivesUsed[i].objectTypeName === objectTypeName || directivesUsed[i].interfaceTypeName === objectTypeName) && 
                builtInScalars.includes(directivesUsed[i].fieldValue) === true
            ) {
                text += `${generateIndentation(2)}if(nestedSelection.name.value === "${directivesUsed[i].fieldName}") {\n`;
                text += `${generateIndentation(3)}result.selections.push({\n`;
                text += `${generateIndentation(4)}kind: Kind.FIELD, \n`;
                text += `${generateIndentation(4)}name: {\n`;
                text += `${generateIndentation(5)}kind: Kind.NAME, \n`;
                text += `${generateIndentation(5)}value: "${directivesUsed[i].argumentValues}"\n`;
                text += `${generateIndentation(4)}},\n`;
                text += `${generateIndentation(3)}})\n`;
                text += `${generateIndentation(2)}}\n`;
            }

            // If it's a path, then just map the field name to the correct path in the remote schema
            if(
                directivesUsed[i].argumentName === "path" && 
                (directivesUsed[i].objectTypeName === objectTypeName || directivesUsed[i].interfaceTypeName === objectTypeName)
            ) {
                text += generateWrapQueryPath(directivesUsed[i], selectionName = "nestedSelection", selectionSetName = "result", indentationOffset = 0);
            }
        }
        if(directivesUsed[i].directive === "concatenate" && (directivesUsed[i].objectTypeName === objectTypeName || directivesUsed[i].interfaceTypeName === objectTypeName)) {
            // console.log(directivesUsed[i])
            let concValues = parseConcArgs(directivesUsed[i], rsDef);
            text += `${generateIndentation(2)}if(nestedSelection.name.value === "${directivesUsed[i].fieldName}") {\n`;
            concValues.forEach(field => {
                if(field[1]){
                    text += `
            ${generateIndentation(0)}result.selections.push( {
            ${generateIndentation(1)}kind: Kind.FIELD,
            ${generateIndentation(2)}name: {
            ${generateIndentation(3)}kind: Kind.NAME,
            ${generateIndentation(3)}value: "${field[0]}"
            ${generateIndentation(2)}}
            ${generateIndentation(1)}}
            ${generateIndentation(0)})
                
            `;
                }
            });
            text += `
        }\n`;
        }
    }
    text += `${generateIndentation(1)}})\n`;
    text += `${generateIndentation(1)}return result;\n`;
    text += `}\n\n`;
    return text;
}

//-----------------------------------------------------------------------------------//
/**
 * 
 * @param {*} directivesUsed 
 * @param {*} rsDef 
 * @returns 
 */
const writeNestedExtractFunctions = function(directivesUsed, rsDef) {
    let text = "";
    for(let i = 0; i < directivesUsed.length; i++) {
        if(directivesUsed[i].directive === "wrap" && (directivesUsed[i].argumentName === "type" || directivesUsed[i].argumentName === "interface")) {
            if(directivesUsed[i].argumentName === "type") {
                text += `const extractNested${directivesUsed[i].objectTypeName}Fields = (selection) => {\n`;
            } else if(directivesUsed[i].argumentName === "interface") {
                text += `const extractNested${directivesUsed[i].interfaceTypeName}Fields = (selection) => {\n`;
            }
            text += `${generateIndentation(1)}let result = {\n`;
            text += `${generateIndentation(2)}kind: Kind.SELECTION_SET, \n`;
            text += `${generateIndentation(2)}selections: []\n`;
            text += `${generateIndentation(1)}}\n`;
            text += `${generateIndentation(1)}selection.selectionSet.selections.forEach(nestedSelection => {\n`;
            if(directivesUsed[i].argumentName === "type") {
                text += writeTypeSpecificExtractFunction(directivesUsed, directivesUsed[i].objectTypeName, rsDef);
            } else if(directivesUsed[i].argumentName === "interface") {
                text += writeTypeSpecificExtractFunction(directivesUsed, directivesUsed[i].interfaceTypeName, rsDef);
            }
        }
    }
    text += "\n\n";
    return text;
}

//-----------------------------------------------------------------------------------//
/**
 * 
 * @param {*} objectTypeName 
 * @param {*} directivesUsed 
 * @param {*} remoteResolver 
 * @param {*} wsDef 
 * @param {*} remoteSchema 
 * @param {*} typesImplementingInterface 
 * @returns 
 */
const writeResolverWithArgs = function(objectTypeName, directivesUsed, remoteResolver, wsDef, remoteSchema, typesImplementingInterface) {
    let concValues = [];
    let text = `    
        ${camelCase(objectTypeName)}: async(_, args, context, info) => {
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
                // If the field does not have a built-in scalar value type, we must extract the nested values via the "correct" extracting function.
                if(directivesUsed[i].argumentName === "field" && builtInScalars.includes(directivesUsed[i].fieldValue) === false) {

                    if(Array.isArray(directivesUsed[i].fieldValue)) { 
                        directivesUsed[i].fieldValue = directivesUsed[i].fieldValue[0];
                    }

                    text += `${generateIndentation(6)}if(selection.name.value === "${directivesUsed[i].fieldName}") {\n`; 
                    text += `${generateIndentation(7)}newSelectionSet.selections.push({\n`;
                    text += `${generateIndentation(8)}kind: Kind.FIELD,\n`;
                    text += `${generateIndentation(8)}name: {\n`;
                    text += `${generateIndentation(9)}kind: Kind.NAME,\n`;
                    text += `${generateIndentation(9)}value: "${directivesUsed[i].argumentValues}"\n`;
                    text += `${generateIndentation(8)}},\n`;
                    text += `${generateIndentation(8)}selectionSet: extractNested${directivesUsed[i].fieldValue}Fields(selection)\n`;
                    text += `${generateIndentation(7)}})\n`
                    text += `${generateIndentation(6)}}\n`
                }
                // If the field has a built-in scalar value type, we can just perform the field name mapping to the remote schema.
                if(directivesUsed[i].argumentName === "field" && builtInScalars.includes(directivesUsed[i].fieldValue) === true) {
                    text += `${generateIndentation(7)}if(selection.name.value === "${directivesUsed[i].fieldName}"){\n`;
                    text += `${generateIndentation(8)}newSelectionSet.selections.push({\n`;
                    text += `${generateIndentation(9)}kind: Kind.FIELD, \n`;
                    text += `${generateIndentation(9)}name: {\n`;
                    text += `${generateIndentation(10)}kind: Kind.NAME, \n`;
                    text += `${generateIndentation(10)}value: "${directivesUsed[i].argumentValues}"\n`;
                    text += `${generateIndentation(9)}},\n`;
                    text += `${generateIndentation(8)}})\n`;
                    text += `${generateIndentation(7)}}\n`;
                }
                if(directivesUsed[i].argumentName === "path") {
                    text += generateWrapQueryPath(directivesUsed[i], selectionName = "selection", selectionSetName = "newSelectionSet", indentationOffset = 6);
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
        ${generateIndentation(4)}})\n
        ${generateIndentation(4)}return newSelectionSet;
        ${generateIndentation()}},
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

//-----------------------------------------------------------------------------------//
/**
 * 
 * @param {*} currentDirective 
 * @param {*} directivesUsed 
 * @returns 
 */
const generateTypeSpecificResolver = function(currentDirective, directivesUsed) {
    let text = "";
    let interfaceTypeResolvers = {};
    // Check if the value of the current directive is of type Interface. If it is, we need to resolve the __typename before resolving anything else. 
    for(let i = 0; i < directivesUsed.length; i++) {
        if(currentDirective.fieldValue === directivesUsed[i].interfaceTypeName) {
            for(let j = 0; j < directivesUsed.length; j++) {
                if(directivesUsed[j].interfaces !== undefined) {
                    Object.keys(directivesUsed[j].interfaces).forEach(key => {
                        if(key === directivesUsed[i].interfaceTypeName) {
                            interfaceTypeResolvers[directivesUsed[j].remoteObjectTypeName] = directivesUsed[j].objectTypeName;
                        }
                    })
                }
            }
        }
    }
    if(currentDirective.argumentName === "field"){
        text += `${generateIndentation(2)}${currentDirective.fieldName}: (parent) => {\n`;
        if(Object.keys(interfaceTypeResolvers).length > 0) {
            text += `${generateIndentation(3)}parent.${currentDirective.fieldName}.forEach(child => {\n`;
            Object.entries(interfaceTypeResolvers).forEach(entry => {
                const [name, value] = entry;
                text += `${generateIndentation(4)}if(child.__typename === "${name}") {\n`;
                text += `${generateIndentation(5)}child.__typename = "${value}"\n`;
                text += `${generateIndentation(4)}}\n`;
            });
            text += `${generateIndentation(3)}})\n`;
        }
        text += `${generateIndentation(3)}return (parent.${currentDirective.argumentValues} !== undefined) ? parent.${currentDirective.argumentValues} : null;\n`;
        text += `${generateIndentation(2)}},\n`;
    } else if(currentDirective.argumentName === "path") {
        // If the path does not include any lists, then we can just map the value to the full path
        if(Array.isArray(currentDirective.fieldValue) === false) {
            text += `${generateIndentation(2)}${currentDirective.fieldName}: (parent) => {\n`;
            if(Object.keys(interfaceTypeResolvers).length > 0) {
                text += `${generateIndentation(3)}parent.${currentDirective.fieldName}.forEach(child => {\n`;
                Object.entries(interfaceTypeResolvers).forEach(entry => {
                    const [name, value] = entry;
                    text += `${generateIndentation(4)}if(child.__typename === "${name}") {\n`;
                    text += `${generateIndentation(5)}child.__typename = "${value}"\n`;
                    text += `${generateIndentation(4)}}\n`;
                });
                text += `${generateIndentation(3)}})\n`;
            }
            let path = "parent.";
            for(let i = 0; i < currentDirective.argumentValues.length; i++) {
                path += currentDirective.argumentValues[i].value;
                // If we're not on the last element
                if(i !== (currentDirective.argumentValues.length - 1)) {
                    path += ".";
                }
            }
            text += `${generateIndentation(3)}return (${path} !== undefined) ? ${path} : null;\n`;
            text += `${generateIndentation(2)}},\n`;
        // If the path DOES include lists, we must create a loop to extract all values from the list
        } else if(Array.isArray(currentDirective.fieldValue) === true) {
            text += `${generateIndentation(2)}${currentDirective.fieldName}: (parent) => {\n`;
            text += `${generateIndentation(3)}let result = [];\n`;
            let path = "parent.";
            // Find the path to the second-to-last element. This is the object we will iterate over later.
            for(let i = 0; i < currentDirective.argumentValues.length-1; i++) {
                path += currentDirective.argumentValues[i].value;
                // If we're not on the second-to-last element
                if(i !== (currentDirective.argumentValues.length - 2)) {
                    path += ".";
                }
            }
            text += `${generateIndentation(3)}if(${path} !== undefined) {\n`;
            text += `${generateIndentation(4)}${path}.forEach(child => {\n`;
            text += `${generateIndentation(5)}result.push(child.${currentDirective.argumentValues[currentDirective.argumentValues.length-1].value})\n`;
            text += `${generateIndentation(4)}})\n`;
            text += `${generateIndentation(3)}}\n`;
            text += `${generateIndentation(3)}return result;\n`;
            text += `${generateIndentation(2)}},\n`;
        }
    }

    return text;
}

//-----------------------------------------------------------------------------------//

const generateIncludeAllTypeSpecificResolver = function(currentDirective) {
    let text = "";
    text += `${generateIndentation(2)}${currentDirective.objectTypeName}: {\n`;
    console.log(currentDirective);
    Object.entries(currentDirective.includeFields).forEach(entry => {
        const [name, value] = entry;
        // includeAllFields only supports built-in scalar value types, so ensure that this is the case
        if(builtInScalars.includes(value)) {
            text += `${generateIndentation(3)}${name}: (parent) => {\n`;
            text += `${generateIndentation(4)}return (parent.${name} !== undefined) ? parent.${name} : null;\n`;
            text += `${generateIndentation(3)}},\n`;
        }
    })
    text += `${generateIndentation(2)}},\n`;
    return text;
}

//-----------------------------------------------------------------------------------//
/**
 * 
 * @param {*} objectTypeName 
 * @param {*} directivesUsed 
 * @param {*} remoteResolver 
 * @param {*} remoteSchema 
 * @param {*} typesImplementingInterface 
 * @returns 
 */
const writeResolverWithoutArgs = function(objectTypeName, directivesUsed, remoteResolver, remoteSchema, typesImplementingInterface){
    let upperCaseResolver = upperCase(remoteResolver.resolver)
    let extractNestedFieldsTextOne = ""
    let extractNestedFieldsTextTwo = ""
    let text = `    
        ${camelCase(objectTypeName)}s: async(_, __, context, info) => {
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
            if(directivesUsed[i].objectTypeName === objectTypeName || directivesUsed[i].interfaceTypeName === objectTypeName){
                if(directivesUsed[i].directive === "wrap") {

                    // If the field does not have a built-in scalar value type, we must extract the nested values via the "correct" extracting function.
                    if(directivesUsed[i].argumentName === "field" && builtInScalars.includes(directivesUsed[i].fieldValue) === false) {
                        if(Array.isArray(directivesUsed[i].fieldValue)) {
                            directivesUsed[i].fieldValue = directivesUsed[i].fieldValue[0];
                        }
                        text += `${generateIndentation(6)}if(selection.name.value === "${directivesUsed[i].fieldName}") {\n`; 
                        text += `${generateIndentation(7)}newSelectionSet.selections.push({\n`;
                        text += `${generateIndentation(8)}kind: Kind.FIELD,\n`;
                        text += `${generateIndentation(8)}name: {\n`;
                        text += `${generateIndentation(9)}kind: Kind.NAME,\n`;
                        text += `${generateIndentation(9)}value: "${directivesUsed[i].argumentValues}"\n`;
                        text += `${generateIndentation(8)}},\n`;
                        text += `${generateIndentation(8)}selectionSet: extractNested${directivesUsed[i].fieldValue}Fields(selection)\n`;
                        text += `${generateIndentation(7)}})\n`
                        text += `${generateIndentation(6)}}\n`
                    }
                    // If the field has a built-in scalar value type, we can just perform the field name mapping to the remote schema.
                    if(directivesUsed[i].argumentName === "field" && builtInScalars.includes(directivesUsed[i].fieldValue) === true) {
                        text += `${generateIndentation(7)}if(selection.name.value === "${directivesUsed[i].fieldName}"){\n`;
                        text += `${generateIndentation(8)}newSelectionSet.selections.push({\n`;
                        text += `${generateIndentation(9)}kind: Kind.FIELD, \n`;
                        text += `${generateIndentation(9)}name: {\n`;
                        text += `${generateIndentation(10)}kind: Kind.NAME, \n`;
                        text += `${generateIndentation(10)}value: "${directivesUsed[i].argumentValues}"\n`;
                        text += `${generateIndentation(9)}},\n`;
                        text += `${generateIndentation(8)}})\n`;
                        text += `${generateIndentation(7)}}\n`;
                    }
                    if(directivesUsed[i].argumentName === "path") {
                        text += generateWrapQueryPath(directivesUsed[i], selectionName = "selection", selectionSetName = "newSelectionSet", indentationOffset = 6);
                    }
                }
                if(directivesUsed[i].directive === "concatenate") {            
                    textAndConcValues = generateConcatenateField(directivesUsed[i], remoteSchema.document.definitions, upperCaseResolver);
                    text += textAndConcValues[0];
                    extractNestedFieldsTextOne += textAndConcValues[1];
                    extractNestedFieldsTextTwo += textAndConcValues[2];
                }
            }
        }

        text += `
        ${generateIndentation(5)}})\n
        ${generateIndentation(4)}return newSelectionSet;
        ${generateIndentation(4)}},
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
    return [text, extractNestedFieldsTextOne, extractNestedFieldsTextTwo];
}

//-----------------------------------------------------------------------------------//
/**
 * 
 * @param {*} objectTypeName 
 * @param {*} directiveItem 
 * @param {*} remoteResolver 
 * @returns 
 */
const writeIncludeAllResolverWithArgs = function(objectTypeName, directiveItem, remoteResolver) {
    let text = `    
        ${camelCase(objectTypeName)}: async(_, args, context, info) => {
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

//-----------------------------------------------------------------------------------//
/**
 * 
 * @param {*} objectTypeName 
 * @param {*} directiveItem 
 * @param {*} remoteResolver 
 * @returns 
 */
const writeIncludeAllResolversWithoutArgs = function(objectTypeName, directiveItem, remoteResolver) {
    let text = `    
        ${camelCase(objectTypeName)}s: async(_, __, context, info) => {
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

//-----------------------------------------------------------------------------------//
/** This function is used to parse the value type of a node in an AST
 * @param {*} node: The node from which we want to extract the value
 * @returns the value type of the node. Returns a list of the type if it is a list. 
 */
 const parseValue = function(node) {
    let returnValue;
    let set = false;
    visit(node, {
        NonNullType(nonNull) {
            visit(nonNull, {
                NamedType(named) {
                    returnValue = named.name.value + "!";
                    set = true;
                }
            });
        }
    });
    visit(node, {
        NamedType(named) {
            if(!set){
                returnValue = named.name.value;
                set = true;
            }
        }
    });
    visit(node, {
        ListType(list) {
            visit(list, {
                NamedType(named) {
                    if(list.type.kind === "NonNullType") {
                        returnValue = [named.name.value + "!"];
                    } else {
                        returnValue = [named.name.value];   
                    }
                }
            });
        }
    });
    return returnValue;
}

//-----------------------------------------------------------------------------------//
/**
 * 
 * @param {*} fileName 
 * @param {*} fileContent 
 */
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