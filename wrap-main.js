const { validateDirectives } = require("./validate-directives");
const { generateSchema } = require("./generate-schema");
const process  = require("process");
const { loadTypedefsSync, loadSchemaSync } = require("@graphql-tools/load");
const { join } = require("path");
const { GraphQLFileLoader } = require("@graphql-tools/graphql-file-loader");
const { fetch } = require("cross-fetch");
const { introspectSchema } = require("@graphql-tools/wrap");
const { print } = require("graphql");
const { addResolversToSchema } = require("@graphql-tools/schema");


const read = async function(input) {
    let returnValue;
    let fromUrl = false;
    if(input.includes("http")) { // based on this we assume that it is a schema hosted on a remote server
        fromUrl = true;
        returnValue = await readUrl(input);
    } else {
        returnValue = readFile(input);
    }
    return {
        "schema": returnValue,
        "fromUrl": fromUrl
    }
}

const readFile = function(path) {
    /*const fileContent = loadTypedefsSync(path, {
        loaders: [new GraphQLFileLoader()]
    });*/
    const fileContent = addResolversToSchema({
        schema: loadSchemaSync(join(__dirname, path) /*"./remote-servers/src/schema.graphql")*/, {
          loaders: [new GraphQLFileLoader()],
        }),
        resolvers: {},
    });
    return fileContent;
}

const executor = async ({ document, variables }) => {
    const query = print(document);
    let url = process.argv[3];
    const fetchResult = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });
    return fetchResult.json();
};

const readUrl = async function(url) {
    const schema = await introspectSchema(executor);
    return schema;
    //return schema;
        
        /*return wrapSchema({
          schema,
          executor,
          transforms: [
            new RenameObjectFields((_typeName, fieldName) => fieldName.replace(/^title/, "emailAddress"))
          ]
        });*/
}

const printValidArguments = function() {
    console.log("--definitions <path to wrapper schema definitions file>");
    console.log("--remote <url or path to remote schema>");
    console.log("--wrapperName <name of the generated schema file> [optional]");
}

const main = async function() {
    if(process.argv.length > 5){
        console.log("Too many command line arguments! Valid command line arguments are the following: ");
        printValidArguments();
    } else if(process.argv.length === 5) {
        const wsDef = await read(process.argv[2]);
        console.log(wsDef);
        const remoteSchema = await read(process.argv[3]);
        console.log(remoteSchema);
        const wrapperSchemaName = process.argv[4];
        let validationResult = validateDirectives(wsDef, remoteSchema);
        if(validationResult.directivesAreValid) {
            console.log(validationResult);
        } else {

        }
    } else if(process.argv.length === 4) {
        const wsDef = await read(process.argv[2]);
        const remoteSchema = await read(process.argv[3]);
    } else {
        console.log("Too few arguments! Valid command line arguments are the following: ");
        printValidArguments();
    }
}

main();