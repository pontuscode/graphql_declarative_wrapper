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

let consoleColors = {
    red: '\x1b[31m%s\x1b[0m',
    green: '\x1b[32m%s\x1b[0m',
    yellow: '\x1b[33m%s\x1b[0m',
    blue: '\x1b[34m%s\x1b[0m',
    magenta: '\x1b[35m%s\x1b[0m',
    cyan: '\x1b[36m%s\x1b[0m'
}

/**
 * @param {*} input is either a url or a file path
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
 * @param {*} path is the file path to the schema
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
 * @param {*} url: the url of the server that hosts the remote schema
 */
const readUrl = async function(url) {
    const fileContent = loadTypedefsSync(url, {
        assumeValid: true,
        assumeValidSDL: true,
        skipGraphQLImport: true,
        loaders: [new UrlLoader()]
    });
    return fileContent;
}

/**
 * Helper function that prints out valid command line arguments in the event that the user has made a mistake.
 */
const printValidArguments = function() {
    console.log("Valid command line arguments are the following:")
    console.log("--definitions <path to wrapper schema definitions file> [required]");
    console.log("--remoteSchema <url or path to remote schema> [required]");
    console.log("--remoteServer <url to the remote server> [required]");
    console.log("--wrapperName <name of the generated schema file> [optional]");
}

/**
 * The main function takes 3 required command line arguments (--definitions, remoteSchema, and --remoteServer) and 1 optional command line argument (--wrapperName). 
 * --definitions is the file path or url to the wrapper schema definitions
 * --remoteSchema is the file path or url to the remote schema
 * --remoteServerUrl is the url to the remote server that resolves queries to the remote schema
 * --wrapperName is the desired name of the generated wrapper schema
 */
const main = async function() {
    if(process.argv.length > 6){ // We expect a maximum of 6 arguments (node wrap-main.js wrapperSchemaDef remoteSchema remoteServer wrapperName)
        console.log(consoleColors.red, "Too many command line arguments!");
        printValidArguments();
    } else if(process.argv.length === 6) { // If the user included the wrapperName argument, we need to pass it to the schema generation algorithm
        const wsDef = await read(process.argv[2]);
        const remoteSchema = await read(process.argv[3]);
        const remoteServerUrl = process.argv[4];
        const wrapperSchemaName = process.argv[5];
        let validationResult = validateDirectives(wsDef, remoteSchema);
        if(validationResult.directivesAreValid) {
            console.log(consoleColors.green, "Wrapper schema definitions are valid!");
            console.log(`Generating wrapper schema with name ${wrapperSchemaName}...`);
            let generationResult = await generateSchema(wsDef, directivesUsed, remoteSchema, remoteServerUrl, wrapperSchemaName);
            if(generationResult.success) {
                console.log(consoleColors.green, `Successfully generated schema ${wrapperSchemaName}!`);
            } else {
                console.log(consoleColors.red, "Failed to generate wrapper schema.");
                console.log(consoleColors.cyan, `Error: ${generationResult.error}`);
            }
        } else {
            console.log(consoleColors.red, "Schema validation failed.")
            console.log(consoleColors.cyan, `Error: ${validationResult.error}`);
        }
    } else if(process.argv.length === 5) { // If the user did not include wrapperName, we simply assign it the name wrapper-schema.graphql (CHECK IF THIS ALREADY EXISTS FIRST!!!)
        const wsDef = await read(process.argv[2]);
        const remoteSchema = await read(process.argv[3]);
    } else {
        console.log(consoleColors.red, "Too few command line arguments!");
        printValidArguments();
    }
    console.log("Exiting.")
}

main();