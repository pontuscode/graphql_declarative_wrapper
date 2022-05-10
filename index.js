const { parse, visit, print } = require("graphql/language");
// const wsDef = require("./wrapper-schema-definition");
const { loadSchemaSync, loadTypedefsSync } = require("@graphql-tools/load");
const { GraphQLFileLoader } = require("@graphql-tools/graphql-file-loader");
const { correctASTNodes } = require("@graphql-tools/utils");

const parseObjectTypeFields = function(ast){
    fields = {};
    for(let i = 0; i < ast.length; i++){

    }
    return fields;
}

const BuiltInScalar = ["String", "Boolean", "Int", "Float", "ID"];
/**
 * 
 * @param {*} node: The node from which we want to extract the value
 * @returns the value type of the node. Returns a list of the type if it is a list. 
 */
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

const parseSchemaDirectives = function(schema) {
    directivesUsed = [];
    let remoteObjectTypeName;
    schema.definitions.forEach(ast => {
        visit(ast, {
            ObjectTypeDefinition(node) {
                if(node.directives.length) {
                    let temp = {
                        "remoteObjectTypeName": node.directives[0].arguments[0].value.value,
                        "objectTypeName": node.name.value,
                        "directive": node.directives[0].name.value,
                        "argumentName": node.directives[0].arguments[0].name.value,
                        "argumentValues": node.directives[0].arguments[0].value.value
                    };
                    if(!directivesUsed.includes(temp)){
                        directivesUsed.push(temp); 
                        remoteObjectTypeName = ast.directives[0].arguments[0].value.value;
                    }
                }
            }
        });
        visit(ast, {
            FieldDefinition(node) {
                if(node.directives.length > 0) {
                    for(let i = 0; i < node.directives.length; i++){
                        let fieldValue = parseValue(node);
                        if(node.directives[i].arguments.length > 1) continue; //Here it should break I guess?
                        

                        let temp = {
                            "remoteObjectTypeName": remoteObjectTypeName,
                            "objectTypeName": ast.name.value,
                            "fieldName": node.name.value,
                            "fieldValue": fieldValue,
                            "directive": node.directives[0].name.value,
                            "argumentName": node.directives[i].arguments[0].name.value,
                            "argumentValues": node.directives[i].arguments[0].value.values
                        };
                        directivesUsed.push(temp);
                    }
                }

            }
        });
    });
    return directivesUsed;
}

const traversePath = function(item, /*currNode,*/ remoteSchema) {
    // The first iteration we will look for fields in the wrapped parent type. 
    let lookingForType = item.remoteObjectTypeName;
    let types = {
        "containsList": false,
        "finalFieldType": null
    };
    for(let i = 0; i < item.argumentValues.length; i++){
        // Which field are we looking for? 
        let lookingForField = item.argumentValues[i].value;
        remoteSchema.definitions.forEach(ast => { // Visit each definition in the remote schema.
            visit(ast, {
                ObjectTypeDefinition(node) { 
                    if(lookingForType === node.name.value) { // If we found the correct type, then visit each field in this type.
                        for(let i = 0; i < node.fields.length; i++){
                            if(node.fields[i].name.value === lookingForField) { // If the field name is the one we're wrapping, then look into it.
                                if(node.fields[i].type.kind === "ListType") { // If it's a list type, we need to set the containsList to true and extract the value type
                                    types.containsList = true;
                                    // Extract the next type that we need to check by using parseValue. Since we know this will return a list, we index the first element.
                                    lookingForType = parseValue(node.fields[i])[0];
                                } else if(node.fields[i].type.kind === "NamedType") { // If it's a named type, we need to extract the value type
                                    if(i === item.argumentValues.length - 1) { // If we are at the last element in the arguments list, we parse the value and save it in the 'types' object
                                        types.finalFieldType = parseValue(node.fields[i]);
                                        // console.log("Found ", types.finalFieldType, " in type ", lookingForType, " when looking for field ", lookingForField);
                                    } else { // If we are not at the last element, keep traversing by saving the field's value type. 
                                        lookingForType = parseValue(node.fields[i]);
                                    }
                                }
                            }
                        }
                    }
                }
            });
        });
    }
    return types;
}

/**
 * 
 * @param {*} item: the directive definitions parsed from parseSchemaDirectives
 * @param {*} remoteSchema: the remote schema to validate against
 * 
 * The following cases will result in a failed validation: 
 *  1/ The wrapped type does not exist in the remote schema. 
 *  2/ The value type in the wrapper schema definition is not the same as the value type in the remote schema.
 *  3/ The value type in the wrapper schema definition is not defined as a list, but one or more of the types in the remote schema is a list.
 *  4/ One or more of the fields in the 'field' or 'path' argument does not exist in the remote schema. 
 */

const validateWrap = function(item, remoteSchema) {
    let valid = false;
    if(item.argumentName === "type") { // Validation case 1
        remoteSchema.definitions.forEach(ast => {
            visit(ast, {
                ObjectTypeDefinition(node) {
                    if(item.remoteObjectTypeName === node.name.value) {
                        valid = true;
                    }
                }
            });
        });
    } else {
        switch(item.argumentName) {
            case "field":
                valid = true;
                types = traversePath(item, remoteShcema);
                console.log(types);
                break;
            case "path":
                types = traversePath(item, remoteSchema);
                if(types.containsList) { // If the return type contains a list, we must also have a list as fieldValue
                    //console.log(Array.isArray(item.fieldValue));
                    if(Array.isArray(item.fieldValue)) { // Is our field value a list?
                        if(item.fieldValue[0] === types.finalFieldType) { // Is the field value type the same as the wrapped type?
                            valid = true;
                        }
                    }                    
                } else { // If it does not contain a list, then just check if the field value type is the same as the wrapped field type 
                    if(item.fieldValue[0] === types.finalFieldType) {// Is the field value type the same as the wrapped type?
                        valid = true;
                    }
                }
                break;
        }
        /*remoteSchema.definitions.forEach(ast => {
            if(ast.name.value === item.remoteObjectTypeName && !found) {
                //console.log("Ast:", ast.name.value);
                visit(ast, {
                    FieldDefinition(node) {
                        switch(item.argumentName) {
                            case "field":
                                found = true;
                                break;
                            case "path":
                                //console.log(node);
                                traversePath(item, node, remoteSchema);
                                found = true;
                                break;
                        }
                    }
                });
            }
        });*/
    }

    return valid;
}

const validateConcatenate = function(item, remoteSchema) {
    //console.log(item);
    let valid = true;

    if(item.argumentName == "values"){ // There is only 1 argument, called "values"
      
      // commonType = item.fieldValue

      // if a field does not have a wrap directive, the default behavior is that it corresponds to a field
      // directly copied from the remote schema. If the remote schema does not have the field, then the
      // validation algorithm should hallt.
      if(item.remoteObjectTypeName == undefined) 
        item.remoteObjectTypeName = item.objectTypeName;
      
      // console.log(typeof(item.fieldValue)); //  IF THIS IS OBJECT, IT IS A LIST, CHECK TYPE INSIDE IT AGAIN
      
      
      let found = false;
      remoteSchema.definitions.forEach(ast => {
        if(ast.name.value === item.remoteObjectTypeName && !found){
          //console.log(ast.name.value);
          // console.log(ast.fields);
          item.argumentValues.forEach(arg =>{
            //console.log(arg.value);

            let CorrectargType = false;
            let argFound = false;
            ast.fields.forEach(field => {
              // console.log(field.name.value);
              if(field.name.value == arg.value){
                // console.log(field);
                argFound = false;
                CorrectargType = false;
                if(field.type.kind === "NamedType"){
                  if(field.type.name.value.toLowerCase() === typeof(item.fieldValue)){
                    //console.log("Correct :)");
                    argFound = true;
                    CorrectargType = true;
                  }
                  else console.log("INCORRECT")//valid = false;
                }
                else if(field.type.kind === "ListType"){
                  if(field.type.type.name.value.toLowerCase() === typeof(item.fieldValue[0])){
                    //console.log("correct?");
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

const main = function() {
    const wsDef = loadTypedefsSync("wrapper-schema-definition.graphql", {
        loaders: [new GraphQLFileLoader()],
    });
    
    directivesUsed = parseSchemaDirectives(wsDef[0].document);

    const remoteSchema = loadTypedefsSync("remote-schema.graphql", {
        loaders: [new GraphQLFileLoader()],
    });

    let directivesAreValid = true;
    directivesUsed.forEach(item => {
        if(!validateDirective(item, remoteSchema[0].document)) {
            //console.log(item);
            directivesAreValid = false;
        }
    });

    if(directivesAreValid){
        console.log("Valid!");
    } else {
        console.log("Invalid!");
    }
}


main();

//console.log(schema._typeMap.Professor._fields.examinerOf.astNode.directives[0].arguments[0].value.values);
/*for(let i = 0; i < Object.keys(schema._typeMap).length; i++) {
    console.log(Object.keys(schema._typeMap)[i]);
}*/

