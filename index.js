const { parse, visit, print } = require("graphql/language");
// const wsDef = require("./wrapper-schema-definition");
const { loadSchemaSync, loadTypedefsSync } = require("@graphql-tools/load");
const { GraphQLFileLoader } = require("@graphql-tools/graphql-file-loader");

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

const traversePath = function(item, currNode, remoteSchema) {
    //console.log(item);
    
    item.argumentValues.forEach(argument => {
        visit(currNode, {
            ListType(list) {
                visit(list, {
                    NamedType(named) {
                        console.log(argument);
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
                    }
                }
            });
        });
    } else {
        remoteSchema.definitions.forEach(ast => {
            if(ast.name.value === item.remoteObjectTypeName && !found) {
                visit(ast, {
                    FieldDefinition(node) {
                        switch(item.argumentName) {
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
    return true;
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

