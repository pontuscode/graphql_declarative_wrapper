const { parse, visit, print } = require("graphql/language");
// const wsDef = require("./wrapper-schema-definition");
const { loadSchemaSync, loadTypedefsSync } = require("@graphql-tools/load");
const { GraphQLFileLoader } = require("@graphql-tools/graphql-file-loader");

const parseSchemaDirectives = function(schema) {
    schema.definitions.forEach(ast => {
        visit(ast, {
            FieldDefinition(node) {
                if(node.directives.length > 0) {
                    console.log(
                        "In the type ", 
                        ast.name.value.toUpperCase(), 
                        " we want to use directive ", 
                        node.directives[0].name.value.toUpperCase(), 
                        " with arguments ", 
                        node.directives[0].arguments[0].name.value.toUpperCase(), 
                        ": ", 
                        node.directives[0].arguments[0].value.values, 
                        " on field ", 
                        node.name.value.toUpperCase()
                    );
                    //console.log("HEHEHHEHEHE", node.directives[0].name.value);
                    //console.log(ast.name.value);
                    //console.log(ast.fields);
                }

            }
        })
    })
}

const main = function() {
    const wsDef = loadTypedefsSync("wrapper-schema-definition.graphql", {
        loaders: [new GraphQLFileLoader()],
    });
    
    //console.log(wsDef[0].document);
    parseSchemaDirectives(wsDef[0].document);

    const remoteSchema = loadSchemaSync("remote-schema.graphql", {
        loaders: [new GraphQLFileLoader()],
    });
}


main();

//console.log(schema._typeMap.Professor._fields.examinerOf.astNode.directives[0].arguments[0].value.values);
/*for(let i = 0; i < Object.keys(schema._typeMap).length; i++) {
    console.log(Object.keys(schema._typeMap)[i]);
}*/

