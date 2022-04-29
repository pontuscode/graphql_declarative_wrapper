const { parse, visit, print } = require("graphql/language");
const typeDefs = require("./wrapper-schema-definition");

parse(typeDefs).definitions.forEach(ast => {
  console.log("\n");
  console.log(ast.name.value);
  visit(ast, {
    FieldDefinition(node) {
        console.log(node.directives);
        if(node.directives.length > 0) {
            console.log("asd");
        }
        console.log(print(node));
    }
  });
});