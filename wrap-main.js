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


/**
 * @param {*} input: either a url or a file path
 * @returns a dictionary with the schema and a bool that tells the following functions if it came from a url or not (important because they currently differ in structure).
 */
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

/**
 * 
 * @param {*} path: the file path to the schema
 * @returns the type definitions of the schema found at the file path
 */
const readFile = function(path) {
    const fileContent = loadTypedefsSync(path, {
        cwd: __dirname,
        assumeValid: true,
        assumeValidSDL: true,
        skipGraphQLImport: true,
        loaders: [new GraphQLFileLoader()]
    });
    return fileContent;
}

/**
 * Currently semi-functional, I don't know where to put the url parameter in the function declaration :/
 * @param {*} param0 
 * @returns a jsonified version of the schema hosted at the given url
 */
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

/**
 * This function is defined but cannot be used currently since we're missing the required packages (url-loader or something similar).
 * We probably need to tweak it so it can load typedefs instead of schema. They are very different in resulting schema structure. 
 */
const readUrl = async function(url) {
    const fileContent = loadTypedefsSync(url, {
        assumeValid: true,
        assumeValidSDL: true,
        skipGraphQLImport: true,
        loaders: [new UrlLoader()]
    });
    //console.log(fileContent);
    return fileContent;
}

/**
 * Helper function that prints out valid command line arguments in the event that the user has made a mistake.
 */
const printValidArguments = function() {
    console.log("--definitions <path to wrapper schema definitions file> [required]");
    console.log("--remoteSchema <url or path to remote schema> [required]");
    console.log("--remoteServer <url to the remote server> [required]");
    console.log("--wrapperName <name of the generated schema file> [optional]");
}

/**
 * The main function takes 2 required command line arguments (--definitions and --remote) and 1 optional command line argument (--wrapperName). 
 * --definitions is the file path or url to the 
 */
const main = async function() {
    if(process.argv.length > 6){ // We expect a maximum of 6 arguments (node wrap-main.js wrapperSchemaDef remoteSchema remoteServer wrapperName)
        console.log("Too many command line arguments! Valid command line arguments are the following: ");
        printValidArguments();
    } else if(process.argv.length === 6) { // If the user included the wrapperName argument, we need to pass it to the schema generation algorithm
        const wsDef = await read(process.argv[2]);
        const remoteSchema = await read(process.argv[3]);
        const remoteServerUrl = process.argv[4];
        const wrapperSchemaName = process.argv[5];
        let validationResult = validateDirectives(wsDef, remoteSchema);
        if(validationResult.directivesAreValid) {
            console.log("Wow!");
        } else {
            console.log("Wow-invers!")
        }
    } else if(process.argv.length === 5) { // If the user did not include wrapperName, we simply assign it the name wrapper-schema.graphql (CHECK IF THIS ALREADY EXISTS FIRST!!!)
        const wsDef = await read(process.argv[2]);
        const remoteSchema = await read(process.argv[3]);
    } else {
        console.log("Too few arguments! Valid command line arguments are the following: ");
        printValidArguments();
    }
}

main();