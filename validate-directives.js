const { visit } = require("graphql/language");

let WrappedTypes = [];

const builtInScalars = [
    "Int", "Float", "String", "Boolean", "ID", 
    "Int!", "Float!", "String!", "Boolean!", "ID!", 
    "['Int']", "['Float']", "['String']", "['Boolean']", "['ID']",
    "['Int!']", "['Float!']", "['String!']", "['Boolean!']", "['ID!']",
    "['Int!']!", "['Float!']!", "['String!']!", "['Boolean!']!", "['ID!']!"
]

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

const _doParseExcludedFields = function(excludedFieldsAstNode) {
    let values;
    try {
        values = excludedFieldsAstNode.value.values;
    } catch(err) {
        return undefined;
    }

    let excludedFields = [];
    for(let i = 0; i < values.length; i++) {
        excludedFields.push(values[i].value);
    }
    return excludedFields;
}

//-----------------------------------------------------------------------------------//
/**
 * This function is used to get the list of excluded fields (with regards to includeAllFields). 
 * @param {*} args: an AST node containing the "parent node's" arguments 
 * @returns A list of strings containing the fields the user wants to exclude, or undefined if the list is empty
 */
 const parseExcludedFields = function(args) {
    for(let i = 0; i < args.length; i++) {
        if(args[i].name.value === "excludeFields") {
            return _doParseExcludedFields(args[i]);
        }
    }
}

//-----------------------------------------------------------------------------------//
/**
 * This function is used to get the list of excluded fields (with regards to includeAllFields). 
 * @param {*} args: an AST node containing the "parent node's" arguments 
 * @returns A list containing the fields the user wants to exclude, or undefined if the argument was not used.
 */
const getExcludeFieldsNode = function(args) {
    for(let i = 0; i < args.length; i++) {
        if(args[i].name.value === "excludeFields") {
            return args[i];
        }
    }
    return undefined;
}

const valueNodeIsStringType = function(node) {
    return node.kind === "StringValue";
}

const nodeIsListType = function(node) {
    return node.value.kind === "ListValue";
}
//-----------------------------------------------------------------------------------//
/**
 * This function is used to validate the includeAllFields and excludeFields arguments 
 * @param {*} excludeFieldsNode: AST node representing the list of fields the user wants to exclude
 * @returns a boolean indicating if the include/exclude usage was valid, and an error message if it was not valid
 */
const validateIncludeExclude = function(excludeFieldsNode) {
    // If the user did not want to exclude any fields we can return early.
    let valid = true;
    let errorMessage = "";
    if(excludeFieldsNode === undefined) {
        return {
            "valid": true,
            "errorMessage": ""
        }
    }

    if(nodeIsListType(excludeFieldsNode) === false) {
        valid = false;
        errorMessage = "The value type of argument 'excludeFields' must be a 'List'.\n";
    }

    let valueNodes = excludeFieldsNode.value.values;

    valueNodes.forEach(valueNode => {
        if(valueNodeIsStringType(valueNode) === false) {
            valid = false;
            errorMessage = `Expected 'StringValue' for each element in 'excludeFields', got '${valueNode.kind}'.`
        }
    })

    return {
        "valid": valid,
        "errorMessage": errorMessage
    }
}

//-----------------------------------------------------------------------------------//
/**
 * This function is used to parse the names of the resolver functions that the user specified in the arguments "singleQuery" and "listQuery"
 * @param {*} args: an AST node containing the "parent node's" arguments 
 * @returns: an object with the names of the resolver functions
 */
const parseResolvers = function(args) {
    let singleQuery;
    let listQuery;
    for(let i = 0; i < args.length; i++){
        if(args[i].name.value === "singleQuery") {
            singleQuery = args[i].value.value;
        } else if(args[i].name.value === "listQuery") {
            listQuery = args[i].value.value;
        }
    }
    return {
        "singleQuery": singleQuery,
        "listQuery": listQuery
    }
}

//-----------------------------------------------------------------------------------//
/**
 * This function is used to parse the name and value types of the arguments in the resolver functions
 * @param {*} input: an AST node containing the "parent node's" arguments 
 * @returns an object with the name of the resolver function, and the functions argument names and value types
 */
const parseResolverArguments = function(input) {
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
 * @param {*} node: an AST node in the wrapper schema definitions
 * @returns an object with key-value pairs of the implemented interface names, and the value is blank. The values are added in the function validateInterfaces.
 */
const parseInterfaces = function(node) {
    let interfaces = {};
    if(node.interfaces !== undefined) {
        if(node.interfaces.length > 0) { // has the user implemented any interfaces on this type?
            for(let i = 0; i < node.interfaces.length; i++) {
                interfaces[node.interfaces[i].name.value] = "";
            }
        }
    }
    return (Object.entries(interfaces).length > 0) ? interfaces : undefined;
}

//-----------------------------------------------------------------------------------//
/**
 * 
 * @param {*} args: the arguments of an AST node in the wrapper schema definitions
 * @returns an object with the name of the interface type in the remote schema and the name of the argument used 
 */
const parseInterfaceTypeArguments = function(args) {
    let remoteInterfaceTypeName = "";
    let argumentName = "";
    args.forEach(arg => {
        if(arg.name.value === "interface") {
            remoteInterfaceTypeName = arg.value.value;
            argumentName = arg.name.value;
        }
    })

    if(argumentName !== "") {
        return {
            "remoteInterfaceTypeName": remoteInterfaceTypeName,
            "argumentName": argumentName
        }
    } else {
        return undefined;
    }
}

//-----------------------------------------------------------------------------------//
/**
 * 
 * @param {*} args: the arguments of an AST node in the wrapper schema definitions
 * @returns an object with the name of the object type in the remote schema and the name of the argument used 
 */
const parseObjectTypeArguments = function(args) {
    let remoteObjectTypeName = "";
    let argumentName = "";
    args.forEach(arg => {
        if(arg.name.value === "type") {
            remoteObjectTypeName = arg.value.value;
            argumentName = arg.name.value;
        }
    })
    if(argumentName !== "") {
        return {
            "remoteObjectTypeName": remoteObjectTypeName,
            "argumentName": argumentName
        }
    } else {
        return undefined;
    }
}

//-----------------------------------------------------------------------------------//
/**
 * 
 * @param {*} directivesUsed: the list of all directives found during parsing
 * @param {*} interfaces: object that is non-null if the current object/interface type has implemented any interfaces
 * @returns an object with key-value pairs of the implemented interface names and their names in the remote schema
 */
const validateInterfaces = function(directivesUsed, interfaces) {
    let valid = true;
    let errorMessage = "";
    if(interfaces !== undefined) {
        Object.keys(interfaces).forEach(key => {
            for(let i = 0; i < directivesUsed.length; i++) {

                if(directivesUsed[i].argumentName === "interface" && directivesUsed[i].interfaceTypeName === key) {
                    interfaces[key] = directivesUsed[i].remoteInterfaceTypeName;
                }
            }
        })
        Object.entries(interfaces).forEach(entry => {
            const [name, value] = entry;
            if(name.length === 0 || value.length === 0) {
                valid = false;
                errorMessage = `Could not find type ${name} for interface X`;
            }
        });
    }
    return {
        "valid": valid,
        "errorMessage": errorMessage
    }
}

const nodeHasDirectives = function(node) {
    let hasDirectives = false;
    try {
        hasDirectives = node.directives.length > 0;
    } catch(err) {
        
    } finally {
        return hasDirectives;
    }
}

const findWrapDirective = function(directives) {
    for(let i = 0; i < directives.length; i++) {
        if(directives[i].name.value === "wrap") {
            return directives[i];
        }
    }
    return undefined;
}

const requiredArgsForObjectType = function(args) {
    let requiredFound = false;
    for(let i = 0; i < args.length; i++) {
        if(args[i].name.value === "type") {
            requiredFound = true;
        }
    }
    return requiredFound;
}

const requiredArgsForInterfaceType = function(args) {
    let requiredFound = false;
    for(let i = 0; i < args.length; i++) {
        if(args[i].name.value === "interface") {
            requiredFound = true;
        }
    }
    return requiredFound;
}

const directiveContainsRequiredArgs = function(args, location) {
    if(location === "ObjectType") {
        return requiredArgsForObjectType(args);
    }
    if(location === "InterfaceType") {
        return requiredArgsForInterfaceType(args);
    }
}

const checkRecognizedArgs = function(args, recognizedArgs) {

    for(let i = 0; i < args.length; i++) {
        let argumentName = args[i].name.value;
        if(recognizedArgs.includes(argumentName) === false) {
            return false;
        }
    }
    return true;
}

const directiveContainsOnlyKnownArgs = function(args, location) {
    if(location === "ObjectType") {
        recognizedArgs = ["type", "includeAllFields", "excludeFields", "listQuery", "singleQuery"];
        return checkRecognizedArgs(args, recognizedArgs);
    }
    if(location === "InterfaceType") {
        recognizedArgs = ["interface", "includeAllFields", "excludeFields", "listQuery", "singleQuery"];
        return checkRecognizedArgs(args, recognizedArgs);
    }
}

const includeAllFieldsArgumentIsUsed = function(args) {
    let argUsed = args.find(item => {return (item.name.value === "includeAllFields" && item.value.value === true)});
    return argUsed !== undefined;
}

const findMatchingParentObject = function(directivesUsed, parentType, parentName) {
    for(let i = 0; i < directivesUsed.length; i++) {
        if(parentType === "InterfaceType" && parentName === directivesUsed[i].interfaceTypeName) {
            return directivesUsed[i];
        }

        if(parentType === "ObjectType" && parentName === directivesUsed[i].objectTypeName) {
            return directivesUsed[i];
        }
    }
}

const addSelfToIncludedFieldsOfParent = function(directivesUsed, parentType, parentName, node) {
    let parentObject = findMatchingParentObject(directivesUsed, parentType, parentName);
    parentObject.includeFields[node.name.value] = parseValue(node);
}

//-----------------------------------------------------------------------------------//
/**
 * 
 * @param {*} schema: the wrapper schema definitions
 * @returns object with the directives used, a bool that indicates if errors were found, and an errorMessage that is blank if no errors were found
 * 
 * Since we don't have any knowledge of the remote schema at this point, we only validate the syntax and structure of the wrapper schema definitions at this point.
 * Examples of validation steps: 
 *   Ensure there are arguments for each type and field 
 *   Ensure the arguments are of the expected data types
 *   Ensure the arguments are used correctly 
 */
const parseSchemaDirectives = function(schema) { 
    directivesUsed = [];
    let remoteObjectTypeName;
    let remoteInterfaceTypeName;
    let parentType;
    let parentIncludesAllFields = false;
    let parentName;
    let valid = true;
    let errorMessage = "";
    schema.definitions.forEach(ast => {
        // Exit if we have found an invalid usage
        if(valid === false) {
            return;
        }
        //---------------------------OBJECT TYPES--------------------------------------//
        visit(ast, {
            ObjectTypeDefinition(node) {              
                // VALIDATE GENERAL USE OF THE DIRECTIVE    
                if(nodeHasDirectives(node) === false) {
                    valid = false;
                    errorMessage = `No directives found on type ${node.name.value}.`;
                    return;
                }

                const wrapDirective = findWrapDirective(node.directives);
                if(wrapDirective === undefined) {
                    valid = false;
                    errorMessage = `No 'wrap' directive found on type ${node.name.value}`;
                    return;
                }

                const directiveArguments = wrapDirective.arguments;
                if(directiveContainsRequiredArgs(directiveArguments, "ObjectType") === false) {
                    valid = false;
                    errorMessage = `Did not find required argument 'type' in wrapping arguments on object type ${node.name.value}.\n`;
                    return;
                }

                if(directiveContainsOnlyKnownArgs(directiveArguments, "ObjectType") === false) {
                    valid = false;
                    errorMessage = `Found unknown argument(s) in wrapping arguments on object type '${node.name.value}'.\n`;
                    return;
                }

                // VALIDATE THE USE OF ARGUMENTS includeAllFields and excludeFields 
                // Try to get the excludeFields AST node
                let excludeFieldsNode = getExcludeFieldsNode(directiveArguments);
                // Check if the user has indicated that they want to include all fields          
                const includeAllFieldsUsed = includeAllFieldsArgumentIsUsed(directiveArguments);

                if(includeAllFieldsUsed === false && excludeFieldsNode !== undefined) {
                    valid = false;
                    errorMessage = `Failed to validate object type ${node.name.value}:\n`
                    errorMessage += `'excludeFields' argument can only be used when the 'includeAllFields' argument is set to true.`;
                    return;
                }

                // Pre-declare the list of excluded fields to avoid undefined references
                let excludedFields = undefined;

                if(includeAllFieldsUsed === true) {
                    let validateInclude = validateIncludeExclude(excludeFieldsNode);
                    if(validateInclude.valid === false) {
                        valid = false;
                        errorMessage = validateInclude.errorMessage;
                        return;
                    }
                    excludedFields = parseExcludedFields(directiveArguments);

                }

                let resolvers = parseResolvers(directiveArguments);

                let interfaces = parseInterfaces(node);
                let validateInter = validateInterfaces(directivesUsed, interfaces);
                if(validateInter.valid === false) {
                    valid = false;
                    errorMessage = validateInter.errorMessage;
                    return;
                }
                let remoteObjectType = parseObjectTypeArguments(directiveArguments); 

                if(remoteObjectType !== undefined) {
                    let temp = {
                        "remoteObjectTypeName": remoteObjectType.remoteObjectTypeName, 
                        "objectTypeName": node.name.value,
                        "directive": wrapDirective.name.value,
                        "argumentName": remoteObjectType.argumentName, 
                        "argumentValues": remoteObjectType.remoteObjectTypeName, 
                        "resolvers": resolvers,
                        "includeAllFields": includeAllFieldsUsed, 
                        "excludeFields": excludedFields,
                        "includeFields": {}, // These will be added later if includeAllFields is true,
                        "interfaces": interfaces
                    };
                    if(!directivesUsed.includes(temp)){
                        directivesUsed.push(temp); 
                        remoteObjectTypeName = remoteObjectType.remoteObjectTypeName; 

                        // Save some information for (possible) field definition children
                        parentIncludesAllFields = includeAllFieldsUsed;
                        parentName = node.name.value;
                        parentType = "ObjectType";
                    }
                }
            }
        });
        //---------------------------INTERFACE TYPES--------------------------------------//
        visit(ast, {
            InterfaceTypeDefinition(node) {
                // VALIDATE GENERAL USE OF THE DIRECTIVE
                if(nodeHasDirectives(node) === false) {
                    valid = false;
                    errorMessage = `No directives found on interface type ${node.name.value}.`;
                    return;
                }

                const wrapDirective = findWrapDirective(node.directives);
                if(wrapDirective === undefined) {
                    valid = false;
                    errorMessage = `No 'wrap' directive found on interface type ${node.name.value}`;
                    return;
                }

                const directiveArguments = wrapDirective.arguments;
                if(directiveContainsRequiredArgs(directiveArguments, "InterfaceType") === false) {
                    valid = false;
                    errorMessage = `Did not find required argument 'interface' in wrapping arguments on interface type ${node.name.value}.\n`;
                    return;
                }

                if(directiveContainsOnlyKnownArgs(directiveArguments, "InterfaceType") === false) {
                    valid = false;
                    errorMessage = `Found unknown argument(s) in wrapping arguments on interface type '${node.name.value}'.\n`;
                    return;  
                }

                // VALIDATE THE USE OF ARGUMENTS includeAllFields and excludeFields 
                // Try to get the excludeFields AST node
                let excludeFieldsNode = getExcludeFieldsNode(directiveArguments);//directiveArguments);
                // Check if the user has indicated that they want to include all fields          
                const includeAllFieldsUsed = includeAllFieldsArgumentIsUsed(directiveArguments); //directiveArguments);

                if(includeAllFieldsUsed === false && excludeFieldsNode !== undefined) {
                    valid = false;
                    errorMessage = `Failed to validate interface type ${node.name.value}:\n`
                    errorMessage += `'excludeFields' argument can only be used when the 'includeAllFields' argument is set to true.`;
                    return;
                }

                // Pre-declare the list of excluded fields to avoid undefined references
                let excludedFields = undefined;
                if(includeAllFieldsUsed === true) {
                    let validateInclude = validateIncludeExclude(excludeFieldsNode);
                    if(validateInclude.valid === false) {
                        valid = false;
                        errorMessage = validateInclude.errorMessage;
                        return;
                    }
                    excludedFields = parseExcludedFields(directiveArguments);
                }

                let resolvers = parseResolvers(directiveArguments);
                let remoteInterfaceType = parseInterfaceTypeArguments(node.directives[0].arguments);

                if(remoteInterfaceType !== undefined) {
                    let temp = {
                        "remoteInterfaceTypeName": remoteInterfaceType.remoteInterfaceTypeName,
                        "interfaceTypeName": node.name.value,
                        "directive": node.directives[0].name.value,
                        "argumentName": remoteInterfaceType.argumentName, 
                        "argumentValues": remoteInterfaceType.remoteInterfaceTypeName,
                        "resolvers": resolvers,
                        "includeAllFields": includeAllFieldsUsed, 
                        "excludeFields": excludedFields,
                        "includeFields": {} // These will be added later if includeAllFields is true
                    };
                    if(!directivesUsed.includes(temp)){
                        directivesUsed.push(temp); 
                        remoteInterfaceTypeName = remoteInterfaceType.remoteInterfaceTypeName; 
                        
                        // Save some information for (possible) field definition children
                        parentIncludesAllFields = includeAllFieldsUsed;
                        parentName = node.name.value;
                        parentType = "InterfaceType";
                    }
                } 
            }
        });
        //---------------------------FIELD DEFINITIONS--------------------------------------//
        visit(ast, {
            FieldDefinition(node) {
                if(node.directives.length > 0) {
                    for(let i = 0; i < node.directives.length; i++){
                        const fieldValue = parseValue(node);
                        let argumentType = node.directives[i].arguments[0].value.kind;
                        let argumentValue;
                        // This switch-statement covers field+path validation step 1.
                        switch(argumentType) {
                            case "StringValue":
                                if(node.directives[i].arguments[0].name.value === "field") {
                                    argumentValue = [node.directives[i].arguments[0].value.value];
                                } else if(node.directives[i].arguments[0].name.value === "path"){
                                    valid = false;
                                    errorMessage = `Expected List of Strings for argument '${node.directives[i].arguments[0].name.value}' on field '${node.name.value}', got '${argumentType}'.\n`; 
                                }
                                break;
                            case "ListValue":
                                node.directives[i].arguments[0].value.values.forEach(value => {
                                    if(value.kind !== "StringValue") {
                                        valid = false;
                                        errorMessage = `Expected only StringValues in argument in field definition ${node.name.value}, got ${value.kind}.\n`;
                                    }
                                })
                                argumentValue = node.directives[i].arguments[0].value.values;
                                break;
                            default:
                                valid = false;
                                errorMessage = `Expected List or String for argument ${node.directives[i].arguments[0].name.value} on field ${node.name.value}, got ${argumentType}.\n`;
                        }
                        let remote;
                        if(parentIncludesAllFields === true) {
                            addSelfToIncludedFieldsOfParent(directivesUsed, parentType, parentName, node);
                        }
                        if(parentType === "ObjectType") {
                            remote = remoteObjectTypeName;
                        }
                        else if(parentType === "InterfaceType") {
                            remote = remoteInterfaceTypeName;
                        } 
                        else if(remoteObjectTypeName !== undefined) {
                            remote = remoteObjectTypeName;
                        }
                        let temp = {
                            "remoteObjectTypeName": remote,
                            "objectTypeName": ast.name.value,
                            "fieldName": node.name.value,
                            "fieldValue": fieldValue,
                            "directive": node.directives[0].name.value,
                            "argumentName": node.directives[i].arguments[0].name.value,
                            "argumentValues": argumentValue
                        };
                        for (var j = 1; j < node.directives[i].arguments.length; j++) {
                            temp["argumentValues"].push(node.directives[i].arguments[j].value.values);        
                        }
                        directivesUsed.push(temp);
                    }
                }
            }
        });
        remoteInterfaceTypeName = undefined;
    });
    return {
        "directivesUsed": directivesUsed,
        "valid": valid,
        "errorMessage": errorMessage
    }
}

const getFieldInfoFromRemoteType = function(node, fieldNameToFind) {
    let nextFieldInfo = {};
    visit(node, {
        FieldDefinition(field) {
            if(field.name.value !== fieldNameToFind) {
                return;
            }
            let fieldValue = parseValue(field);
            if(Array.isArray(fieldValue) === true) {
                fieldValue = fieldValue[0];
                nextFieldInfo.isListType = true;
            }
            nextFieldInfo.fieldValue = fieldValue;
        }
    })
    return (nextFieldInfo !== {}) ? nextFieldInfo : undefined;
}

const findNextFieldInPath = function(nodeToVisit, fieldNameToFind, remoteSchema, numberOfTraversedFields) {
    let valid = true;
    let errorMessage = "";
    let nextFieldInfo;

    remoteSchema.definitions.forEach(ast => {
        if(valid === false) {
            return;
        }
        visit(ast, {
            ObjectTypeDefinition(node) {
                // If the name of the visited object doesn't match the next remote type, stop visiting this object
                if(node.name.value !== nodeToVisit) {
                    return;
                }
                nextFieldInfo = getFieldInfoFromRemoteType(node, fieldNameToFind, numberOfTraversedFields);
            },
            InterfaceTypeDefinition(node) {
                // If the name of the visited interface doesn't match the next remote type, stop visiting this interface
                if(node.name.value !== nodeToVisit) {
                    return;
                }
                nextFieldInfo = getFieldInfoFromRemoteType(node, fieldNameToFind, numberOfTraversedFields);
            }
        })
    });

    return {
        "valid": valid,
        "errorMessage": errorMessage,
        "nextFieldInfo": nextFieldInfo
    }
}

const sanityCheckFieldInfo = function(fieldInfo, fieldNameToFind, isLastStepInPath) {
    let valid = true;
    let errorMessage = "";
    if(fieldInfo.valid === false) {
        valid = false;
        errorMessage += `Failed to validate field name '${fieldNameToFind}' in wrapping path.\n`;
    }
    if(fieldInfo.nextFieldInfo === undefined) {
        valid = false;
        errorMessage += `Failed to find information about field '${fieldNameToFind}' in remote schema.\n`;
    } else {
        if(isLastStepInPath === false) {
            if(builtInScalars.includes(fieldInfo.nextFieldInfo.fieldValue) === true) {
                valid = false;
                errorMessage += `Failed to validate field name '${fieldNameToFind}' when traversing path.\n`;
                errorMessage += `Value type can only be built-in scalar type in the last step of the path.`;
            }
        } else if(isLastStepInPath === true) {
            if(builtInScalars.includes(fieldInfo.nextFieldInfo.fieldValue) === false) {
                valid = false;
                errorMessage += `Failed to validate field name '${fieldNameToFind}' when traversing path.\n`;
                errorMessage += `Value type must be built-in scalar type in the last step of the path.`;
            }
        }
    }

    return {
        "valid": valid,
        "errorMessage": errorMessage
    }
}

//-----------------------------------------------------------------------------------//
/**
 * This function is used when the user has wrapped a field using the 'path' argument. It traverses the path and validates it each step of the way. 
 * @param {*} item: the field definition that is wrapping a field using the 'path' argument
 * @param {*} remoteSchema: the remote schema to be wrapped
 * @param {*} directivesUsed: the list of all directives found during parsing
 * @returns an object with a boolean indicating the path was valid, and an error message if it was invalid
 */
const traverseAndValidatePath = function(item, remoteSchema, directivesUsed) {
    let valid = true;
    let errorMessage = "";
    // Ensure there are values in the 'path' argument list
    if(item.argumentValues.length === 0) {
        valid = false;
        errorMessage = `The length of the 'path' argument must be greater than 1, found empty list in field definition with name '${item.fieldName}'.\n`;
    }

    let traversedFieldInfo;
    let nextType;
    let fieldNameToFind;
    let mustBeListType = false;
    let isLastStepInPath = false;
    for(let i = 0; i < item.argumentValues.length; i++) {
        if(i === 0) { // First iteration we check the wrapped remote object/interface type
            // Are we looking for an object type or interface type?
            if(item.objectTypeName !== undefined) {
                nextType = item.remoteObjectTypeName;
            } else if(item.interfaceTypeName !== undefined) {
                nextType = item.remoteInterfaceTypeName;
            }
        } 
        fieldNameToFind = item.argumentValues[i].value;

        // Try to traverse the path and find information about next field.
        traversedFieldInfo = findNextFieldInPath(nextType, fieldNameToFind, remoteSchema, i);
        
        // The next type to look in is the value type of the field in the remote schema
        nextType = traversedFieldInfo.nextFieldInfo.fieldValue;

        // If the value type of the remote field was a list, the value type of the field in the wrapper schema definitions must also be a list. 
        // However, we must also remember if we have found any list types before. So we can use boolean OR to have a "persistent" memory of this. 
        mustBeListType = (traversedFieldInfo.nextFieldInfo.isListType || mustBeListType);
        // If we are on the last step of the path, we must ensure that the value type is a built-in scalar. This is done during fieldInfo sanity checks. 
        isLastStepInPath = ((i + 1) === item.argumentValues.length);
        fieldInfoSanityCheck = sanityCheckFieldInfo(traversedFieldInfo, fieldNameToFind, isLastStepInPath);

        if(fieldInfoSanityCheck.valid === false) {
            valid = false;
            errorMessage = fieldInfoSanityCheck.errorMessage;
            break;
        }
    }
    let leafNodeScalarType = traversedFieldInfo.nextFieldInfo.fieldValue;
    // If any lists were found in the path, ensure that the value type of the field is also a list
    if(mustBeListType === true) {
        if(Array.isArray(item.fieldValue) === false) {
            valid = false;
            errorMessage = `Failed to validate 'path' of field '${item.fieldName}'.\n`;
            errorMessage += `Found ListType in one or more value types along the path. The value type of '${item.fieldName}' must therefore be a ListType.\n`;
        } 
    }
    // If the value type is a list, ensure that the value type inside the list matches the value type of the leaf node in the remote schema
    if(valid === true && Array.isArray(item.fieldValue) === true) {
        if(Array.isArray(item.fieldValue) === true) {
            if(leafNodeScalarType !== item.fieldValue[0]) {
                valid = false;
                errorMessage = `Failed to validate 'path' of field '${item.fieldName}'.\n`;
                errorMessage += `Value type '${item.fieldValue[0]}' must match the value type in the remote schema.\n`;
                errorMessage += `Found '${leafNodeScalarType}' on field '${item.argumentValues[item.argumentValues.length-1].value}' remote schema.\n`;
            }
        } else {
            if(leafNodeScalarType !== item.fieldValue) {
                valid = false;
                errorMessage = `Failed to validate 'path' of field '${item.fieldName}'.\n`;
                errorMessage += `Value type '${item.fieldValue}' must match the value type in the remote schema. Found '${leafNodeScalarType}' in remote schema.\n`;
                errorMessage += `Found '${leafNodeScalarType}' on field '${item.argumentValues[item.argumentValues.length-1].value}' remote schema.\n`;
            }
        }
    }

    return {
        "valid": valid,
        "errorMessage": errorMessage
    }
}

const allExcludedFieldNamesExist = function(node, excludeFields) {
    // If the user did not exclude any fields, exit early.
    if(excludeFields === undefined) {
        return true;
    }

    foundFields = 0;
    neededFields = excludeFields.length;
    errorMessage = "";
    for(let i = 0; i < excludeFields.length; i++) {
        visit(node, {
            FieldDefinition(field) {
                if(field.name.value === excludeFields[i]) {
                    foundFields++;
                }
            }
        });
        if(foundFields !== (i + 1)) { // Make sure we found a new field in each iteration.
            errorMessage = `Did not find excluded field '${excludeFields[i]}' in remote schema.`;
            break;
        }
    }
    valid = (foundFields === neededFields);
    return {
        "valid": valid,
        "errorMessage": errorMessage
    }
}

const fieldNamesClash = function(remoteFields, fieldName) {
    for(let i = 0; i < remoteFields.length; i++) {
        if(remoteFields[i].name.value === fieldName) {
            return true;
        }
    }
    return false;
}

const noFieldNamesClashWithRemoteSchema = function(node, includeFields) {
    valid = true;
    errorMessage = "";
    Object.entries(includeFields).forEach(([fieldName, _fieldValue]) => {
        if(fieldNamesClash(node.fields, fieldName) === true) {
            valid = false;
            errorMessage = "Found duplicate field name when validating 'includeAllFields' argument.\n"
            errorMessage += `Field name '${fieldName}' is already defined in the remote schema.`;
        }
    });

    return {
        "valid": valid,
        "errorMessage": errorMessage
    }
}

//-----------------------------------------------------------------------------------//
/**
 * This function is used to validate a directive against the remote schema. Each directive has different validation steps, so they are divided based on the parameter 'argument'
 * @param {*} item: the directive to be validated against the remote schema
 * @param {*} node: the node in the remote schema currently being validated "against"
 * @param {*} argument: the name of the directive to be validated
 * @param {*} directivesUsed: the list of all directives found during parsing
 * @returns an object with a boolean indicating if the directive was valid, and an error message if it was invalid
 */
const validateAgainstRemoteSchema = function(item, node, argument, directivesUsed) {
    let valid = true;
    let errorMessage;
    let splitArgs;
    let foundResolver = false;
    let foundArg = false;
    switch(argument) {
        //---------------------INCLUDEALLFIELDS + EXCLUDEFIELDS--------------------------------// 
        case "includeExclude":
            allNamesExist = allExcludedFieldNamesExist(node, item.excludeFields);
            if(allNamesExist.valid === false) {
                valid = false;
                errorMessage = allNamesExist.errorMessage;
                break;
            }

            noIncludedNamesClash = noFieldNamesClashWithRemoteSchema(node, item.includeFields);
            if(noIncludedNamesClash.valid === false) {
                valid = false;
                errorMessage = noIncludedNamesClash.errorMessage;
                break;
            }
            break;
        //------------------------------FIELD DEFINITIONS--------------------------------------//
        case "field":
            // If the field exists in the wrapped object or interface type in the remote schema. 
            if(node.name.value === item.argumentValues[0]) { 
                if(node.type.kind !== "ListType") {
                    if(node.type.kind === "NamedType") {
                        // If it is a built-in scalar, just make sure the value types match
                        if(builtInScalars.includes(node.type.name.value)) {
                            if(node.type.name.value !== item.fieldValue) { // If the value types do not match 
                                valid = false;
                                errorMessage = `Value types for field definition '${item.fieldName}' in object '${item.objectTypeName}' did not match remote schema.\n`; 
                                errorMessage += `Value type in remote schema: '${node.type.name.value}'.\n`;
                            }
                        } else {
                            // If it is not a built-in scalar, then we must ensure that the wrapped and remote value types match
                            for(let i = 0; i < directivesUsed.length; i++) {
                                if(directivesUsed[i].directive === "wrap") {
                                    if(directivesUsed[i].argumentName === "type") {
                                        // If the value type of the field matches an object type in the wrapper schema definition, AND this wrapper schema definition wraps 
                                        // an object type in the remote schema, AND the value type in the remote schema is the object type that is being wrapped, then...
                                        if(directivesUsed[i].objectTypeName === item.fieldValue) {
                                            if(node.type.name.value === directivesUsed[i].remoteObjectTypeName) {
                                                valid = true;
                                                errorMessage = "";
                                                break;
                                            } else {
                                                valid = false;
                                                errorMessage = `The value type '${item.fieldValue}' in the wrapper schema definitions does not match the wrapped type in the remote schema.\n`;
                                                errorMessage += `Value type remote schema: '${node.type.name.value}'.\n`; 
                                            }
                                        } else {
                                            valid = false;
                                            errorMessage = `Could not find object type '${item.fieldValue}' in wrapper schema definitions.\n`;
                                        }
                                    } else if(directivesUsed[i].argumentName === "interface") {
                                        if(directivesUsed[i].interfaceTypeName === item.fieldValue) {
                                            if(node.type.name.value === directivesUsed[i].remoteInterfaceTypeName) {
                                                valid = true;
                                                errorMessage = "";
                                                break;
                                            } else {
                                                valid = false;
                                                errorMessage = `The value type '${item.fieldValue}' in the wrapper schema definitions does not match the wrapped type remote schema.\n`;
                                                errorMessage += `Value type remote schema: '${node.type.name.value}'.\n`; 
                                            }
                                        } else {
                                            valid = false;
                                            errorMessage = `Could not find object type '${item.fieldValue}' in wrapper schema definitions.\n`;
                                        }
                                    }
                                }
                            }
                        }
                    } else if(node.type.kind === "NonNullType") {
                        let type = node.type.type.name.value + "!";
                        if(builtInScalars.includes(type)) {
                            if(type !== item.fieldValue) {
                                valid = false;
                                errorMessage = `Value type for field definition '${item.fieldName}' in object '${item.objectTypeName}' did not match remote schema.\n`; 
                                errorMessage += `Value type in remote schema: '${node.type.type.name.value}'.\n`;
                            }
                        } else {

                        }
                    }
                } else if(node.type.kind === "ListType") {
                    if(Array.isArray(item.fieldValue)) {
                        if(builtInScalars.includes(node.type.type.name.value)){
                            let type = node.type.type.name.value + "!";
                            if(type !== item.fieldValue[0]) {
                                valid = false;
                                errorMessage = `Value type for field definition ${item.fieldName} in object '${item.objectTypeName}' did not match remote schema.\n`; 
                                errorMessage += `Value type in remote schema: '${node.type.type.name.value}'.\n`;
                            }
                        } else {

                        }
                    } else {
                        valid = false;
                        errorMessage = `Value type for field definition '${item.fieldName}' in object '${item.objectTypeName}' did not match remote schema.\n`; 
                        errorMessage += `Value type in remote schema is ${node.type.kind}.\n`;
                    }
                }
            } else { // If the current node's name did not equal the item to be validated
                valid = false;
                errorMessage = `Failed to validate field with name '${item.fieldName}' in object '${item.objectTypeName}' in wrapper schema definitions.\n`;
                errorMessage += `Are you sure the wrapping definitions are correct?`
            }
            break;
        //----------------------------SINGLE QUERY------------------------------------//
        case "singleQuery":
            splitArgs = parseResolverArguments(item.resolvers);
            node.definitions.forEach(ast => {
                visit(ast, {
                    ObjectTypeDefinition(obj) {
                        if(obj.name.value === "Query") {
                            obj.fields.forEach(field => {
                                if(field.name.value === splitArgs.singleQuery.resolver) {
                                    foundResolver = true;
                                    field.arguments.forEach(arg => {
                                        if(arg.name.value === splitArgs.singleQuery.left) {
                                            if(arg.type.type.name.value === splitArgs.singleQuery.right) {
                                                foundArg = true;
                                            }
                                        }
                                    })
                                }
                            })
                        }
                    }
                })
            })
            if(foundResolver === false) {
                valid = false;
                errorMessage = `Could not find resolver function named ${splitArgs.singleQuery.resolver} in remote schema.`
            }
            if(foundArg === false) {
                valid = false;
                errorMessage = `Could not find matching resolver argument named ${splitArgs.singleQuery.left} with value type ${splitArgs.singleQuery.right} in remote schema for resolver function ${splitArgs.singleQuery.resolver}.`
            }
            break;
        //----------------------------LIST QUERY---------------------------------------//
        case "listQuery":
            splitArgs = parseResolverArguments(item.resolvers);
            node.definitions.forEach(ast => {
                visit(ast, {
                    ObjectTypeDefinition(obj) {
                        if(obj.name.value === "Query") {
                            obj.fields.forEach(field => {
                                if(field.name.value === splitArgs.listQuery.resolver) {
                                    foundResolver = true;
                                }
                            })
                        }
                    }
                })
            })
            if(foundResolver === false) {
                valid = false;
                errorMessage = `Could not find resolver function named ${splitArgs.listQuery.resolver} in remote schema.`
            }
            break;
        //----------------------------DEFAULT-----------------------------------------//
        default: 
            valid = false;
            errorMessage = "Uncaught validation error, please ensure wrapper schema definitions are correct.\n";
            break;
    }

    return {
        "valid": valid,
        "errorMessage": errorMessage
    }
}

//-----------------------------------------------------------------------------------//
/**
 * @param {*} item: the directive used on the current node in the AST
 * @param {*} node: the current node in the AST
 * 
 * This function is called when the user has used includeAllFields on a wrapper type.
 * The function appends all fields to the wrapper type except the ones specified in excludeFields.
 */
const appendFieldsToType = function(item, node) {
    let temp = {};
    visit(node, {
        FieldDefinition(field) {
            temp[field.name.value] = parseValue(field);
        }
    });
    if(item.excludeFields !== undefined) {
        for(let i = 0; i < item.excludeFields.length; i++) {
            delete temp[item.excludeFields[i]];
        }
    }

    item.includeFields = temp;
}

//-----------------------------------------------------------------------------------// 
/**
 * 
 * @param {*} item is the directive definitions parsed from parseSchemaDirectives
 * @param {*} remoteSchema is the remote schema to validate against
 * 
 * The following cases will result in a failed validation: 
 *  1/ The wrapped type does not exist in the remote schema. 
 *  2/ The field value type in the wrapper schema definition is not the same as the field value type in the remote schema.
 *  3/ The field value type in the wrapper schema definition is not defined as a list, but one or more of the field value types in the remote schema is a list.
 *  4/ One or more of the fields in the 'field' or 'path' argument does not exist in the remote schema. 
 */
const validateWrap = function(item, remoteSchema, directivesUsed) {
    let found = false;
    let validType = true;
    let errorMessage = "";
    let checkedFields = 0;
    if(item.argumentName === "type") { // Validation case 1   
        //--------------------------OBJECT TYPES------------------------------------------//
        remoteSchema.definitions.forEach(ast => {
            visit(ast, {
                ObjectTypeDefinition(node) {
                    if(item.remoteObjectTypeName === node.name.value) { // Does the type exist? Validation case 2
                        if(item.includeAllFields === true) { // If they want to include all fields, validate it against the remote schema. Validation case 3
                            let checkIncludeExclude = validateAgainstRemoteSchema(item, node, "includeExclude");
                            if(checkIncludeExclude.valid === true) {
                                appendFieldsToType(item, node); //If the arguments were correctly used, append the fields to the wrapper type defs
                            } else {
                                validType = false;
                                errorMessage = checkIncludeExclude.errorMessage;
                                return;
                            }
                        } else if(item.includeAllFields === false || item.includeAllFields === undefined) { // Validation case 4
                            if(item.excludeFields !== undefined) {
                                validType = false;
                                errorMessage = `Failed to validate object type '${item.objectTypeName}'.\n`;
                                errorMessage += `Argument 'excludeFields' cannot be used if 'includeAllFields' is not used or if it is set to 'false'.\n`;
                                return
                            }
                        }
                        if(item.resolvers.singleQuery !== undefined) { // Validation case 7
                            let checkResolver = validateAgainstRemoteSchema(item, remoteSchema, "singleQuery");
                            if(checkResolver.valid !== true) {
                                validType = false;
                                errorMessage = checkResolver.errorMessage;
                                return;
                            }
                        }
                        if(item.resolvers.listQuery !== undefined) { // Validation case 7
                            let checkResolver = validateAgainstRemoteSchema(item, remoteSchema, "listQuery");
                            if(checkResolver.valid !== true) {
                                validType = false;
                                errorMessage = checkResolver.errorMessage;
                                return;
                            }
                        }
                        // If it passed all validation, then consider it 'found' and add it to the list of wrapped types 
                        if(validType === true) {
                            found = true;
                            WrappedTypes.push(item.objectTypeName); 
                        }
                    }
                }
            });
        });
    //--------------------------FIELD DEFINITIONS------------------------------------------//
    } else if(item.argumentName === "field" || item.argumentName === "path"){ 
        remoteSchema.definitions.forEach(ast => {
            if(ast.name.value === item.remoteObjectTypeName && found === false) {
                visit(ast, {
                    FieldDefinition(node) { // If it's a field definition
                        switch(item.argumentName) {
                            case "field": // The required argument "field" is used
                                validFieldDefinition = validateAgainstRemoteSchema(item, node, "field", directivesUsed);
                                if(validFieldDefinition.valid === false) { // Count how many fields in the object/interface type that does not match
                                    checkedFields++;
                                }
                                break;
                            case "path": // The required argument "path" is used
                                let validPath = traverseAndValidatePath(item, remoteSchema, directivesUsed);
                                if(validPath.valid === false) {
                                    found = false;
                                    errorMessage = validPath.errorMessage;
                                } else {
                                    found = true;
                                }
                                break;
                            default: 
                                found = false;
                                errorMessage = `Unknown wrapping argument '${item.argumentName}' found on field '${item.fieldName}'.\n`
                                break;
                        }
                    }
                });
                // If the number of non-matching fields is equal to the number of fields in the remote schema, then we did not find the field.
                if(checkedFields >= ast.fields.length && item.argumentName === "field") { 
                    errorMessage = validFieldDefinition.errorMessage;
                } else if(item.argumentName === "field") {
                    found = true;
                }
            }
        });
    //--------------------------INTERFACE TYPES------------------------------------------//
    } else if(item.argumentName === "interface") {
        remoteSchema.definitions.forEach(ast => {
            visit(ast, {
                InterfaceTypeDefinition(node) {
                    if(item.remoteInterfaceTypeName === node.name.value) { // Does the interface exist? 
                        if(item.includeAllFields === true) { // If they want to include all fields, validate it against the remote schema.
                            let checkIncludeExclude = validateAgainstRemoteSchema(item, node, "includeExclude");
                            if(checkIncludeExclude.valid === true) {
                                appendFieldsToType(item, node); //If the arguments were correctly used, append the fields to the wrapper type defs
                            } else {
                                found = false;
                                errorMessage = checkIncludeExclude.errorMessage;
                                return;
                            }
                        }
                        if(item.includeAllFields === false || item.includeAllFields === undefined) { // Validation case 4
                            if(item.excludeFields !== undefined) {
                                validType = false;
                                errorMessage = `Failed to validate interface type '${item.interfaceTypeName}'.\n`;
                                errorMessage += `Argument 'excludeFields' cannot be used if 'includeAllFields' is not used or if it is set to 'false'.\n`;
                            }
                        }
                        if(validType) {
                            found = true;
                            WrappedTypes.push(item.interfaceTypeName)
                        }
                    }
                }
            });
        });   
    } else { // If this else-statement is reached, the user has used the 'wrap' directive incorrectly
        found = false;
        if(item.objectTypeName !== undefined) {
            errorMessage = `Unknown wrapping argument '${item.argumentName}' in object type '${item.objectTypeName}'.\n`;
        } else if (item.interfaceTypeName !== undefined) {
            errorMessage = `Unknown wrapping argument '${item.argumentName}' in interface type '${item.interfaceTypeName}'.\n`;
        } else {
            errorMessage = `Unknown wrapping argument '${item.argumentName}'.\n`;
        }
    }
    return { 
        "valid": found,
        "errorMessage": errorMessage
    }
}

//-----------------------------------------------------------------------------------//

const validateConcatenate = function(item, remoteSchema) {
    let valid = true;
    let nonNullable = false;
    let listType = false;
    let errorMessage;
    
    if(item.argumentName !== "values"){
        return { 
            "valid": false,
            "errorMessage": "concatenate only accepts the 'values' argument"
        }
    }

    //Ensure that arguments of 'values' reside inside a List
    if(typeof(item.argumentValues) !== "object"){
        return { 
            "valid": false,
            "errorMessage": "The values of the 'values' argument in concatenate have to reside in a List. Found \"" + typeof(item.argumentValues) + "\" instead of List"
        }
    }
    
    if(item.argumentValues.length <1){
        return { 
            "valid": false,
            "errorMessage": "the 'values' argument in concatenate requires at least one argument "
        }
    }
    if(WrappedTypes.includes(item.objectTypeName)){
        if(typeof(item.fieldValue) === "object")
            listType = true;
        else if(item.fieldValue.charAt(item.fieldValue.length-1) === "!")
            nonNullable = true;

        let counter = 0;
        let found = false;
        let commonType = "Not set";
        for(ast of remoteSchema.definitions){
            if(ast.name.value === item.remoteObjectTypeName && !found) {
                for(arg of item.argumentValues){
                    let argFound = false;
                    visit(ast, { //in this visit, we only handle remote fields (not delimiters)
                        FieldDefinition(node) {
                            counter += 1
                            if(node.name.value === arg.value){
                                argFound = true;
                                
                                let noError = true;
                                if(commonType === "Not set"){
                                    switch(node.type.kind){
                                        case "NamedType":
                                            commonType = node.type.name.value;
                                            break;
                                        case "NonNullType":
                                            
                                            commonType = node.type.type.name.value + "!";
                                            break;
                                        case "ListType":
                                            commonType = node.type.type.name.value;
                                            break;
                                    }
                                    
                                }   
                                else{
                                    switch(node.type.kind){
                                        case "NamedType": 
                                            if(commonType !== node.type.name.value){
                                                valid = false;
                                                errorMessage = "Arguments in 'values' do not share a common data type. Type was " + commonType + ", but found " +node.type.name.value;
                                                noError = false;
                                            }
                                            break;
                                        case "ListType":
                                            if(commonType !== node.type.type.name.value){
                                                valid = false;
                                                errorMessage = "Arguments in 'values' do not share a common data type. Type was " + commonType + ", but found " +node.type.type.name.value;
                                                noError = false;
                                            }
                                            break;
                                        case "NonNullType":
                                            if(commonType !== node.type.type.name.value+"!"){
                                                valid = false;
                                                errorMessage = "Arguments in 'values' do not share a common data type. Type was " + commonType + ", but found " +node.type.type.name.value;
                                                noError = false;
                                            }
                                            break;
                                    }
                                        
                                }
                                if(!builtInScalars.includes(commonType)){
                                    valid = false;
                                    errorMessage = "Concatenation can only be performed with built in scalar types. You can not use \"" + item.fieldValue + "\"" 
                                }
                                if(noError){
                                    if(node.type.kind === "NamedType"){
                                        if(commonType !== item.fieldValue || nonNullable || listType){
                                            valid = false;
                                            errorMessage = "The data type of FieldDefinition does not match the data types of the arguments in 'values'. FieldDefinition is of type \""+item.fieldValue;
                                            errorMessage += "\" and argument values have the type \"" + commonType +"\""
                                        }
                                    }
                                    else if(node.type.kind === "ListType"){
                                        if(commonType !== item.fieldValue[0] || nonNullable || !listType)
                                        {
                                            valid = false;
                                            errorMessage = "The data type of FieldDefinition does not match the data types of the arguments in 'values'. FieldDefinition is of type \""+item.fieldValue;
                                            errorMessage += "\" and argument values have the type \"" + commonType +"\""
                                        }
                                    }
                                    else if(node.type.kind === "NonNullType"){
                                        if(commonType !== item.fieldValue || !nonNullable || listType){
                                            valid = false;
                                            errorMessage = "The data type of FieldDefinition does not match the data types of the arguments in 'values'. FieldDefinition is of type \""+item.fieldValue;
                                            errorMessage += "\" and argument values have the type \"" + commonType +"\""
                                        } 
                                    }
                                }
                            }
                        }
                    });
                    if(!argFound){ //if argument is a delimiter then check whether it is the first argument, otherwise ensure that commonType is String.
                        if(commonType !== "String" && commonType !== "Not set"){
                            valid = false;
                            errorMessage = "Arguments in 'values' do not share a common data type";
                        }
                        else
                            commonType = "String" //We end up here if the delimiter is the first argument.
                    }
                }
                
            }
        };
        return {
            "valid": valid,
            "errorMessage": errorMessage
        }
    }
    else{
        return { 
            "valid": false,
            "errorMessage": "object type must be wrapped"
        }
    }
}

//-----------------------------------------------------------------------------------//
/**
 * 
 * @param {*} item: the directive object to be validated
 * @param {*} remoteSchema: the remote schema to be wrapped
 * @param {*} directivesUsed: all parsed directives from the wrapper schema definitions
 * @returns an object with a boolean indicating if the item was valid, and an error message if it was invalid
 */
const validateDirective = function(item, remoteSchema, directivesUsed) {
    let valid;
    let errorMessage;
    switch(item.directive){
        case "wrap":
            let wrapValidation = validateWrap(item, remoteSchema, directivesUsed);
            if(wrapValidation.valid === false) {
                valid = false;
                errorMessage = wrapValidation.errorMessage;
            }
            break;
        case "concatenate":
            let concatenateValidation = validateConcatenate(item, remoteSchema);
            if(concatenateValidation.valid === false) {
                valid = false;
                errorMessage = concatenateValidation.errorMessage;
            }
            break;
        default:
            valid = false;
            errorMessage = "Validation failed.\n";
            errorMessage += `Unknown directive name '${item.directive} found.\n`;
            break;
    }
    return {
        "valid": valid,
        "errorMessage": errorMessage
    }
}

//-----------------------------------------------------------------------------------//
/**
 * The main function or entry-point of the validation algorithm.
 * @param {*} wsDef: the wrapper schema definitions specified by the user
 * @param {*} remoteSchema: the remote schema to be wrapped
 * @returns object with boolean indicating if the directives were valid, the parsed directives used, and an error message if the directives were invalid
 */
const validateDirectives = function(wsDef, remoteSchema) {
    let parsedDirectives = parseSchemaDirectives(wsDef.schema[0].document);
    let directivesAreValid = true;
    let errorMessage = "";
    if(parsedDirectives.valid === true) {
        directivesUsed.forEach(item => {
            if(directivesAreValid === true) { // If all directives are currently valid, then continue. Without this error, error messages might "cascade" and the root cause is lost.
                if(remoteSchema.fromUrl) { // Schemas from url currently have a different structure than local schemas.
                    errorMessage = "Remote schemas from url's are not currently supported.";
                    directivesAreValid = false;
                } else {
                    let validate = validateDirective(item, remoteSchema.schema[0].document, directivesUsed);
                    if(validate.valid === false) {
                        directivesAreValid = false;
                        errorMessage = validate.errorMessage;
                    }
                }
            }
        });
    } else {
        directivesAreValid = false;
        errorMessage = parsedDirectives.errorMessage;
    }
    return {
        "directivesAreValid": directivesAreValid,
        "directivesUsed": parsedDirectives.directivesUsed,
        "errorMessage": errorMessage
    }
}

exports.validateDirectives = validateDirectives;