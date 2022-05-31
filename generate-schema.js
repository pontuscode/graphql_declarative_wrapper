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

const generateResolvers = async function(wsDef, directivesUsed, remoteSchema, remoteServerUrl) {
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
    executor,
    /*transforms: [
        new RenameObjectFields((_typeName, fieldName) => fieldName.replace(/^title/, "emailAddress"))
    ]*/
    });
};

const resolvers = {
    Query: {
    `;
    for(let i = 0; i < directivesUsed.length; i++){
        if(directivesUsed[i].argumentName === "type") {
            if(directivesUsed[i].resolvers !== undefined){
                let parsedArgument = parseArgument(directivesUsed[i].resolvers);
                if(parsedArgument.singleQuery !== undefined) {
                    fileContent += writeResolverWithArgs(directivesUsed[i], parsedArgument.singleQuery);
                } 
                if(parsedArgument.listQuery !== undefined) {
                    fileContent += writeResolverWithoutArgs(directivesUsed[i], parsedArgument.listQuery);
                }
            }
        }
    }
    fileContent += `}
}
module.exports = resolvers;    
    `;
    await fs.writeFile("wrapper-resolvers.js", fileContent);
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
        console.log(splitSingle);
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
    console.log(parsedValues);
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

const writeResolverWithArgs = function(directivesUsed, remoteResolver) {
    let text = `    ${camelCase(directivesUsed.objectTypeName)}: async(_, args, context, info) => {
            const schema = await remoteSchema();
            const data = await delegateToSchema({
                schema: schema,
                operation: 'query',
                fieldName: '${remoteResolver.resolver}',
                args: {
                    ${remoteResolver.left}: args.${remoteResolver.left}
                },
                context, 
                info
            })
            return data;
        },
    `;
    return text;
}

const writeResolverWithoutArgs = function(directivesUsed, remoteResolver){
    let text = `    ${camelCase(directivesUsed.objectTypeName)}s: async(_, __, context, info) => {
            const schema = await remoteSchema();
            const data = await delegateToSchema({
                schema: schema,
                operation: 'query',
                fieldName: '${remoteResolver.resolver}',
                context, 
                info
            })
            return data;
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