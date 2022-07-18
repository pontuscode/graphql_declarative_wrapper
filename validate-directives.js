const { parse, visit, print } = require("graphql/language");
// const wsDef = require("./wrapper-schema-definition");
const { loadSchemaSync, loadTypedefsSync } = require("@graphql-tools/load");
const { GraphQLFileLoader } = require("@graphql-tools/graphql-file-loader");
const { correctASTNodes } = require("@graphql-tools/utils");
const { generateWrapperSchema } = require("./generate-schema");

let WrappedTypes = [];

const builtInScalars = [
    "Int", "Float", "String", "Boolean", "ID", 
    "Int!", "Float!", "String!", "Boolean!", "ID!", 
    "['Int']", "['Float']", "['String']", "['Boolean']", "['ID']",
    "['Int!']", "['Float!']", "['String!']", "['Boolean!']", "['ID!']",
    "['Int!']!", "['Float!']!", "['String!']!", "['Boolean!']!", "['ID!']!"
]

/**
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
                    returnValue = [named.name.value];   
                }
            });
        }
    });
    return returnValue;
}

const parseIncludeExclude = function(args) {
    let includeAllFields = false;
    let excludeFields;
    for(let i = 0; i < args.length; i++) {
        if(args[i].name.value === "includeAllFields") {
            includeAllFields = args[i].value.value;
        }
        if(args[i].name.value === "excludeFields") {
            excludeFields = args[i];
        }
    }
    return {
        "includeAllFields": includeAllFields,
        "excludeFields": excludeFields
    }
}

const validateIncludeExclude = function(includeExcludeFields) {
    let valid = true;
    let errorMessage = "";
    let parsedExcludeFields = [];
    if(includeExcludeFields.includeAllFields === true) { 
        if(includeExcludeFields.excludeFields !== undefined) {
            if(includeExcludeFields.excludeFields.value.kind === "ListValue") { // Must be a list of Strings
                for(let i = 0; i < includeExcludeFields.excludeFields.value.values.length; i++) {
                    if(includeExcludeFields.excludeFields.value.values[i].kind === "StringValue"){
                        parsedExcludeFields.push(includeExcludeFields.excludeFields.value.values[i].value);
                    } else {
                        errorMessage = `Each element in excludeFields must be a String, got ${includeExcludeFields.excludeFields.value.values[i].kind}.`;
                        valid = false;
                    }
                }
            } else {
                errorMessage = "The value of excludeFields must be a list.";
                valid = false;
            }
        }
    } else {
        if(includeExcludeFields.excludeFields !== undefined) {
            errorMessage = `excludeFields argument can only be used when includeAllFields argument is set to true.`;
            valid = false;
        }
    }
    // If the input is valid and the user wants to exclude some fields, save the parsed values instead of the AST values for easier processing later. 
    if(valid === true && parsedExcludeFields.length > 0) { 
        includeExcludeFields.excludeFields = parsedExcludeFields;
    }
    return {
        "valid": valid,
        "errorMessage": errorMessage
    }
}

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
    let currentParentType;
    let valid = true;
    let errorMessage = "";
    schema.definitions.forEach(ast => {
        visit(ast, {
            ObjectTypeDefinition(node) {
                if(node.directives.length > 0) {
                    if(node.directives[0].arguments === undefined) {
                        valid = false; // There needs to be atleast one argument
                        errorMessage = `No arguments found for type ${node.name.value}, atleast one argument is required!`;
                    } else {
                        let resolvers = parseResolvers(node.directives[0].arguments);
                        let includeExcludeFields = parseIncludeExclude(node.directives[0].arguments);
                        // If the user has indicated that they want to include all or exclude fields, then validate it
                        let validateInclude = validateIncludeExclude(includeExcludeFields);
                        if(validateInclude.valid === false) {
                            valid = false;
                            errorMessage = validateInclude.errorMessage;
                        }
                        let interfaces = parseInterfaces(node);
                        let validateInter = validateInterfaces(directivesUsed, interfaces);
                        if(validateInter.valid === false) {
                            valid = false;
                            errorMessage = validateInter.errorMessage;
                        }
                        currentParentType = "ObjectType";
                        let temp = {
                            "remoteObjectTypeName": node.directives[0].arguments[0].value.value,
                            "objectTypeName": node.name.value,
                            "directive": node.directives[0].name.value,
                            "argumentName": node.directives[0].arguments[0].name.value,
                            "argumentValues": node.directives[0].arguments[0].value.value,
                            "resolvers": resolvers,
                            "includeAllFields": includeExcludeFields.includeAllFields,
                            "excludeFields": includeExcludeFields.excludeFields,
                            "includeFields": {}, // These will be added later if includeAllFields is true,
                            "interfaces": interfaces
                        };
                        if(!directivesUsed.includes(temp)){
                            directivesUsed.push(temp); 
                            remoteObjectTypeName = ast.directives[0].arguments[0].value.value;
                        }


                    }
                }
            }
        });
        visit(ast, {
            InterfaceTypeDefinition(node) {
                if(node.directives.length > 0) {
                    if(node.directives[0].arguments === undefined) {
                        valid = false; // There needs to be atleast one argument
                        errorMessage = `No arguments found for interface ${node.name.value}, atleast one argument is required!`;
                    } else {
                        let resolvers = parseResolvers(node.directives[0].arguments);
                        let includeExcludeFields = parseIncludeExclude(node.directives[0].arguments);
                        // If the user has indicated that they want to include all or exclude fields, then validate it
                        let validateInclude = validateIncludeExclude(includeExcludeFields);
                        if(validateInclude.valid === false) {
                            valid = false;
                            errorMessage = validateInclude.errorMessage;
                        } 
                        let temp = {
                            "remoteInterfaceTypeName": node.directives[0].arguments[0].value.value,
                            "interfaceTypeName": node.name.value,
                            "directive": node.directives[0].name.value,
                            "argumentName": node.directives[0].arguments[0].name.value,
                            "argumentValues": node.directives[0].arguments[0].value.value,
                            "resolvers": resolvers,
                            "includeAllFields": includeExcludeFields.includeAllFields,
                            "excludeFields": includeExcludeFields.excludeFields,
                            "includeFields": {} // These will be added later if includeAllFields is true
                        };
                        currentParentType = "InterfaceType";
                        if(!directivesUsed.includes(temp)){
                            directivesUsed.push(temp); 
                            remoteInterfaceTypeName = ast.directives[0].arguments[0].value.value;
                        }
                    }
                }
            }
        });
        visit(ast, {
            FieldDefinition(node) {
                if(node.directives.length > 0) {
                    for(let i = 0; i < node.directives.length; i++){
                        const fieldValue = parseValue(node);
                        let argumentType = node.directives[i].arguments[0].value.kind;
                        let argumentValue;
                        // This switch-statement along with line 276 covers field+path validation step 1.
                        switch(argumentType) {
                            case "StringValue":
                                argumentValue = [node.directives[i].arguments[0].value.value];
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
                        
                        if(currentParentType === "ObjectType") {
                            remote = remoteObjectTypeName;
                        }
                        else if(currentParentType === "InterfaceType") {
                            remote = remoteInterfaceTypeName;
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
    });
    return {
        "directivesUsed": directivesUsed,
        "valid": valid,
        "errorMessage": errorMessage
    }
}

const traversePath = function(item, currNode, remoteSchema) {
    item.argumentValues.forEach(argument => {
        visit(currNode, {
            ListType(list) {
                visit(list, {
                    NamedType(named) {
                        if(named.name.value === argument.value) {
                            console.log(named);
                        }
                    }
                });
            }
        });
        visit(currNode, {
            NamedType(named) {
                if(named.name.value === argument.value) {
                    console.log(named);
                }
            }
        });
    });
}

const validateAgainstRemoteSchema = function(item, node, argument) {
    let valid = true;
    let errorMessage;
    let splitArgs;
    let foundResolver = false;
    let foundArg = false;
    switch(argument) {
        case "includeExclude":
            let foundFields = 0;
            let neededFields = 0;
            if(item.excludeFields !== undefined) {
                neededFields = item.excludeFields.length;
                for(let i = 0; i < item.excludeFields.length; i++) {
                    visit(node, {
                        FieldDefinition(field) {
                            if(field.name.value === item.excludeFields[i]) {
                                foundFields++;
                            }
                        }
                    });
                    if(foundFields !== (i + 1)) { // Make sure we found a new field in each iteration.
                        errorMessage = `Did not find field ${item.excludeFields[i]} in remote schema.`;
                        break;
                    }
                }
            }
            valid = (foundFields === neededFields);
            break;
            
            /*
                The field specified in the argument exists in the wrapped object or interface type in the remote schema.
                The value type of the field in the wrapper schema definitions matches the value type of the field in the remote schema (specified in the field argument). 
                    This is only valid for built-in scalar value types, since assumptions on wrapped types would need to be made otherwise.  
            */
        case "field":
            if(node.name.value === item.argumentValues[0]) { // The field exists in the wrapped object or interface type in the remote schema. 
                if(node.type.kind !== "ListType") {
                    if(node.type.kind === "NamedType") {
                        if(builtInScalars.includes(node.type.name.value)) {
                            if(node.type.name.value !== item.fieldValue) { // If the value types do not match 
                                valid = false;
                                errorMessage = `Value types for field definition '${item.fieldName}' in object '${item.objectTypeName}' did not match remote schema.\n`; 
                                errorMessage += `Value type in remote schema: '${node.type.name.value}'.\n`;
                            }
                        }
                    } else if(node.type.kind === "NonNullType") {
                        let type = node.type.type.name.value + "!";

                        if(type !== item.fieldValue) {
                            console.log(type, item.fieldName);
                            valid = false;
                            errorMessage = `Value type for field definition '${item.fieldName}' in object '${item.objectTypeName}' did not match remote schema.\n`; 
                            errorMessage += `Value type in remote schema: '${node.type.type.name.value}'.\n`;
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
                        }
                    } else {
                        valid = false;
                        errorMessage = `Value type for field definition '${item.fieldName}' in object '${item.objectTypeName}' did not match remote schema.\n`; 
                        errorMessage += `Value type in remote schema is ${node.type.kind}.\n`;
                    }
                }
            } else {
                valid = false;
                if(item.remoteInterfaceTypeName !== undefined) {
                    errorMessage = `Could not find field with name '${item.argumentValues[0]}' in interface type '${item.remoteInterfaceTypeName}' in remote schema.\n`;
                } else if(item.remoteObjectTypeName !== undefined) {
                    errorMessage = `Could not find field with name '${item.argumentValues[0]}' in object type '${item.remoteObjectTypeName}' in remote schema.\n`;
                }
            }
            break;

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
        default: 
            valid = false;
            errorMessage
            break;
    }

    return {
        "valid": valid,
        "errorMessage": errorMessage
    }
}

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

const validateWrap = function(item, remoteSchema) {
    let found = false;
    let validType = true;
    let errorMessage = "";
    let checkedFields = 0;
    if(item.argumentName === "type") { // Validation case 1   
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
                            }
                        } else if(item.includeAllFields === false || item.includeAllFields === undefined) { // Validation case 4
                            if(item.excludeFields !== undefined) {
                                validType = false;
                            }
                        }
                        if(item.resolvers.singleQuery !== undefined) { // Validation case 7
                            let checkResolver = validateAgainstRemoteSchema(item, remoteSchema, "singleQuery");
                            if(checkResolver.valid !== true) {
                                validType = false;
                                errorMessage = checkResolver.errorMessage;
                            }
                        }
                        if(item.resolvers.listQuery !== undefined) { // Validation case 7
                            let checkResolver = validateAgainstRemoteSchema(item, remoteSchema, "listQuery");
                            if(checkResolver.valid !== true) {
                                validType = false;
                                errorMessage = checkResolver.errorMessage;
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
    } else if(item.argumentName === "field" || item.argumentName === "path"){ 
        remoteSchema.definitions.forEach(ast => {
            if(ast.name.value === item.remoteObjectTypeName && found === false) {
                visit(ast, {
                    FieldDefinition(node) { // If it's a field definition
                        switch(item.argumentName) {
                            case "field": // The required argument "field" is used
                                validFieldDefinition = validateAgainstRemoteSchema(item, node, "field");
                                if(validFieldDefinition.valid === false) { // Count how many fields in the object/interface type that does not match
                                    checkedFields++;
                                }
                                break;
                            case "path": // The required argument "path" is used
                                traversePath(item, node, remoteSchema);
                                found = true;
                                break;
                        }
                    }
                });
                // If the number of non-matching fields is equal to the number of fields in the remote schema, then we did not find the field.

                if(checkedFields >= ast.fields.length && item.argumentName === "field") { 
                    console.log(item);
                    errorMessage = validFieldDefinition.errorMessage;
                } else if(item.argumentName === "field") {
                    found = true;
                }
            }
        });
    } else if(item.argumentName === "interface") {
        remoteSchema.definitions.forEach(ast => {
            visit(ast, {
                InterfaceTypeDefinition(node) {
                    if(item.remoteInterfaceTypeName === node.name.value) { // Does the interface exist? 
                        if(item.includeAllFields === true) { // If they want to include all fields, validate it against the remote schema.
                            let checkIncludeExclude = validateAgainstRemoteSchema(item, node, "includeExclude");
                            if(checkIncludeExclude.valid === true) {
                                appendFieldsToType(item, node); //If the arguments were correctly used, append the fields to the wrapper type defs
                            }
                        }
                        found = true;
                        WrappedTypes.push(item.objectTypeName);
                    }
                }
            });
        });   
    }
    return { 
        "valid": found,
        "errorMessage": errorMessage
    }
}

const validateConcatenate = function(item, remoteSchema) {
    let valid = true;
    let nonNullable = false;

    if(item.argumentName === "values" && WrappedTypes.includes(item.objectTypeName)){ // There is only 1 argument, called "values" (type conversion from ['values'] to 'values')
    //   The include check makes sure that the type is wrapped, all directives have to fulfill this requirement.
      // commonType = item.fieldValue

      // if a field does not have a wrap directive, the default behavior is that it corresponds to a field
      // directly copied from the remote schema. If the remote schema does not have the field, then the
      // validation algorithm should hallt.

      if(item.remoteObjectTypeName == undefined) 
        item.remoteObjectTypeName = item.objectTypeName;
      
      // console.log(typeof(item.fieldValue)); //  IF THIS IS OBJECT, IT IS A LIST, CHECK TYPE INSIDE IT AGAIN

      if(item.fieldValue.charAt(item.fieldValue.length-1) === "!")
        nonNullable = true;
      
      
      let found = false;
      remoteSchema.definitions.forEach(ast => {
        if(ast.name.value === item.remoteObjectTypeName && !found){
          item.argumentValues.forEach(arg =>{ //Here it was argumentvalues[0], don't remember why but it does not work now. 
            let CorrectargType = false;
            let argFound = false;
            ast.fields.forEach(field => {
              if(field.name.value == arg.value){
                argFound = false;
                
                CorrectargType = false;
                if(field.type.kind === "NamedType"){
                  if(field.type.name.value.toLowerCase() === typeof(item.fieldValue) && !nonNullable){
                    argFound = true;
                    CorrectargType = true;
                  }
                  else valid=false;
                }
                else if(field.type.kind === "ListType"){
                  if(field.type.type.name.value.toLowerCase() === typeof(item.fieldValue[0]) && !nonNullable){
                    argFound = true;
                    CorrectargType = true;
                  }
                  else valid = false;
                }
                else if(field.type.kind === "NonNullType"){
                    if(field.type.type.name.value.toLowerCase() === typeof(item.fieldValue[0]) && nonNullable){
                      argFound = true;
                      CorrectargType = true;
                    }
                    else valid = false;
                  }
              }
            });
            if(argFound){
              if(!CorrectargType) valid = false;
            }
            else{
              if(typeof(item.fieldValue) !== "string") valid = false;
            }
            
          });
          found = true;
        }
      });
    }
    else valid = false;
    return valid;
}

const validateSubstring = function(item, remoteSchema) {
    return true;
}

const validateDirective = function(item, remoteSchema) {
    switch(item.directive){
        case "wrap":
            return validateWrap(item, remoteSchema);
        case "concatenate":
            return validateConcatenate(item, remoteSchema);
        case "substring": 
            return validateSubstring(item, remoteSchema);
    }
    return false;
}

const validateDirectives = function(wsDef, remoteSchema) {
    let parsedDirectives = parseSchemaDirectives(wsDef.schema[0].document);
    let directivesAreValid = true;
    let errorMessage = "";
    if(parsedDirectives.valid === true) {
        directivesUsed.forEach(item => {
            if(remoteSchema.fromUrl) { // Schemas from url currently have a different structure than local schemas.
                errorMessage = "Remote schemas from url's are not currently supported.";
                directivesAreValid = false;
            } else {
                let validate = validateDirective(item, remoteSchema.schema[0].document);
                if(validate.valid === false) {
                    directivesAreValid = false;
                    errorMessage = validate.errorMessage;
                }
            }
        });
    } else {
        directivesAreValid = parsedDirectives.valid;
        errorMessage = parsedDirectives.errorMessage;
    }
    return {
        "directivesAreValid": directivesAreValid,
        "directivesUsed": parsedDirectives.directivesUsed,
        "errorMessage": errorMessage
    }
}

exports.validateDirectives = validateDirectives;