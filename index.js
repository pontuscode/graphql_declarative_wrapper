const { parse, visit, print } = require("graphql/language");
const typeDefs = require("./wrapper-schema-definition");
const checkConcArgs = require("./concatenate-check");

// console.log(parse(typeDefs));
let ret = readTypeDefs(typeDefs);
console.log(ret);


function readTypeDefs(def){
  
  parse(def).definitions.forEach(ast => {
    console.log("\n");

    visit(ast, {
      FieldDefinition(node) {
        
        if(node.directives.length > 0) {
          if(node.directives.length > 1){
            console.log("Can only use 1 directive on a FieldDefinition");
            return;
          }
          let directive = node.directives[0];
          if(node.directives[0].name.value == "concatenate"){
            
            let r = checkConcArgs(node,ast.fields);
            let correct = r.first; 
            if(correct == false){
              console.log(r.description);  
            }
          }
        }  
      }
    });
  });  

  return "Read through typeDefs";
}
