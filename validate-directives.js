const { parse, visit, print } = require("graphql/language");
// const wsDef = require("./wrapper-schema-definition");
const { loadSchemaSync, loadTypedefsSync } = require("@graphql-tools/load");
const { GraphQLFileLoader } = require("@graphql-tools/graphql-file-loader");
const { correctASTNodes } = require("@graphql-tools/utils");
const { generateWrapperSchema } = require("./generate-schema");

let WrappedTypes = [];

const parseObjectTypeFields = function(ast){
    fields = {};
    for(let i = 0; i < ast.length; i++){

    }
    return fields;
}

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
                    if(!set){
                        returnValue = [named.name.value];
                    }
                    
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

const parseSchemaDirectives = function(schema) {
    directivesUsed = [];
    let remoteObjectTypeName;
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
                        let temp = {
                            "remoteObjectTypeName": node.directives[0].arguments[0].value.value,
                            "objectTypeName": node.name.value,
                            "directive": node.directives[0].name.value,
                            "argumentName": node.directives[0].arguments[0].name.value,
                            "argumentValues": node.directives[0].arguments[0].value.value,
                            "resolvers": resolvers,
                            "includeAllFields": includeExcludeFields.includeAllFields,
                            "excludeFields": includeExcludeFields.excludeFields
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
            FieldDefinition(node) {
                if(node.directives.length > 0) {
                    for(let i = 0; i < node.directives.length; i++){
                        let fieldValue = parseValue(node);
                        // if(node.directives[i].arguments.length > 1) continue; //Here it should break I guess?
                        let argumentType = node.directives[i].arguments[0].value.kind;
                        let argumentValue;
                        switch(argumentType) {
                            case "StringValue":
                                argumentValue = node.directives[i].arguments[0].value.value;
                                break;
                            case "ListValue":
                                argumentValue = node.directives[i].arguments[0].value.values;
                                break;
                            default:
                                console.log("invalid");
                        }
                        let temp = {
                            "remoteObjectTypeName": remoteObjectTypeName,
                            "objectTypeName": ast.name.value,
                            "fieldName": node.name.value,
                            "fieldValue": fieldValue,
                            "directive": node.directives[0].name.value,
                            "argumentName": [node.directives[i].arguments[0].name.value],
                            "argumentValues": argumentValue
                        };
                        for (var j = 1; j < node.directives[i].arguments.length; j++) {
                            temp["argumentName"].push(node.directives[i].arguments[j].name.value);
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

    if(item.argumentName === "type") { // Validation case 1 
        
        remoteSchema.definitions.forEach(ast => {
            visit(ast, {
                ObjectTypeDefinition(node) {
                    if(item.remoteObjectTypeName === node.name.value) {
                        found = true;
                        WrappedTypes.push(item.objectTypeName);
                    }
                }
            });
        });
    } else if(item.argumentName == "field" || item.argumentName == "path"){ // Validation case 2, 3, 4
        remoteSchema.definitions.forEach(ast => {
            if(ast.name.value === item.remoteObjectTypeName && !found) {
                visit(ast, {
                    FieldDefinition(node) {
                        switch(item.argumentName[0]) {
                            case "field":
                                found = true;
                                break;
                            case "path":
                                traversePath(item, node, remoteSchema);
                                found = true;
                                break;
                        }
                    }
                });
            }
        });
    }
    return found;
}

const validateConcatenate = function(item, remoteSchema) {
    let valid = true;
    let nonNullable = false;
    if(item.argumentName.length > 1){
        console.log("error here");
        console.log(item.argumentName);
        console.log(item.argumentName.length);
        return false;
    }
    if(item.argumentName == "values" && WrappedTypes.includes(item.objectTypeName)){ // There is only 1 argument, called "values" (type conversion from ['values'] to 'values')
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
                  else valid=false;//console.log("INCORRECT")//valid = false;
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
                console.log("Remote schemas from url's are not currently supported");
                directivesAreValid = false;
            } else {
                if(!validateDirective(item, remoteSchema.schema[0].document)) {
                    directivesAreValid = false;
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