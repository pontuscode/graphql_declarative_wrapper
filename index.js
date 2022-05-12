const { parse, visit, print } = require("graphql/language");
// const wsDef = require("./wrapper-schema-definition");
const { loadSchemaSync, loadTypedefsSync } = require("@graphql-tools/load");
const { GraphQLFileLoader } = require("@graphql-tools/graphql-file-loader");
const { correctASTNodes } = require("@graphql-tools/utils");

let WrappedTypes = [];

const parseObjectTypeFields = function(ast){
    fields = {};
    for(let i = 0; i < ast.length; i++){

    }
    return fields;
}

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
                // console.log(node);

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
                        // console.log(node.directives);
                        // console.log(node.directives[i].name.value);
                        
                        // if(node.directives[i].arguments.length > 1) continue; //Here it should break I guess?
                        

                        let temp = {
                            "remoteObjectTypeName": remoteObjectTypeName,
                            "objectTypeName": ast.name.value,
                            "fieldName": node.name.value,
                            "fieldValue": fieldValue,
                            "directive": node.directives[0].name.value,
                            "argumentName": [node.directives[i].arguments[0].name.value],
                            "argumentValues": [node.directives[i].arguments[0].value.values]
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
    return directivesUsed;
}

const traversePath = function(item, currNode, remoteSchema) {
    //console.log(item);
    
    item.argumentValues.forEach(argument => {
        visit(currNode, {
            ListType(list) {
                visit(list, {
                    NamedType(named) {
                        // console.log(argument);
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
        //console.log(argument.value);
    });
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
    } else if(item.argumentName == "field" || item.argumentName == "path"){
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
    console.log("validConc");
    console.log(item);
    let valid = true;
    if(item.argumentName.length > 1){
        console.log("error here");
        console.log(item.argumentName);
        console.log(item.argumentName.length);
        return false;
    }
    console.log(WrappedTypes);
    if(item.argumentName == "values" && WrappedTypes.includes(item.objectTypeName)){ // There is only 1 argument, called "values" (type conversion from ['values'] to 'values')
    //   The include check makes sure that the type is wrapped, all directives have to fulfill this requirement.
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
          console.log(ast.name.value);
          // console.log(ast.fields);
          item.argumentValues.forEach(arg =>{
            console.log(arg.value);

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
                    console.log("Correct :)");
                    argFound = true;
                    CorrectargType = true;
                  }
                  else console.log("INCORRECT")//valid = false;
                }
                else if(field.type.kind === "ListType"){
                  if(field.type.type.name.value.toLowerCase() === typeof(item.fieldValue[0])){
                    console.log("correct?");
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

