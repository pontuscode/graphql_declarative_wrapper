function checkConcArgs(field, fields){
    // get arguments from the FieldDefinition where @concatenate is used.
    // There should only be one argument, "values". Break if there are more than one argument.
    
    let args = field.directives[0].arguments;
    let returnBool = true;
    let desc = "⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠿⠛⠋⠉⣉⣉⠙⠿⠋⣠⢴⣊⣙⢿⣿⣿\n⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠟⠋⠁⠀⢀⠔⡩⠔⠒⠛⠧⣾⠊⢁⣀⣀⣀⡙⣿\n⣿⣿⣿⣿⣿⣿⣿⠟⠛⠁⠀⠀⠀⠀⠀⡡⠊⠀⠀⣀⣠⣤⣌⣾⣿⠏⠀⡈⢿⡜\n⣿⣿⣿⠿⠛⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠡⣤⣶⠏⢁⠈⢻⡏⠙⠛⠀⣀⣁⣤⢢\n⣿⠋⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠰⣄⡀⠣⣌⡙⠀⣘⡁⠜⠈⠑⢮⡭⠴⠚⠉⠀\n⠁⠀⢀⠔⠁⣀⣤⣤⣤⣤⣤⣄⣀⠀⠉⠉⠉⠉⠉⠁⠀⠀⠀⠀⠀⠁⠀⢀⣠⢠\n⡀⠀⢸⠀⢼⣿⣿⣶⣭⣭⣭⣟⣛⣛⡿⠷⠶⠶⢶⣶⣤⣤⣤⣶⣶⣾⡿⠿⣫⣾\n⠇⠀⠀⠀⠈⠉⠉⠉⠉⠉⠙⠛⠛⠻⠿⠿⠿⠷⣶⣶⣶⣶⣶⣶⣶⣶⡾⢗⣿⣿\n⣦⣄⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣠⣴⣿⣶⣾⣿⣿⣿\n⣿⣿⣿⣷⣶⣤⣄⣀⣀⣀⡀⠀⠀⠀⠀⠀⠀⢀⣀⣤⣝⡻⣿⣿⣿⣿⣿⣿⣿⣿\n⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣦⡹⣿⣿⣿⣿⣿⣿";
    if(args.length > 1){
      desc = "Too many arguments in @concatenate, should only contain 'values'";
      returnBool = false;
    }
    if(args[0].name.value != "values"){
      desc = "Incorrect argument for @concatenate, should be 'values'.";
      returnBool = false;
    }

    let namedType = false;
    let commonType = "String"; //namedType and commonType are just set to placeholder values.
    if(field.type.kind == "NamedType"){
        namedType = true;
        commonType = field.type.name.value;
    }
    else{ //ListType
        commonType = field.type.type.name.value;
    }

    if(namedType){
        console.log("Common type is " + commonType);
    }
    else{
        console.log("Common type is a list of " + commonType);
    }    
    
    let values = args[0].value.values;
    // console.log(values);

    fields.forEach(fieldDefinition => {
        values.forEach(v => {
            if(fieldDefinition.name.value == v.value){
                // Here we have to check whether the concatenated types are the same.
                if(namedType && fieldDefinition.type.kind == "NamedType"){
                    if(fieldDefinition.type.name.value == commonType){
                        console.log("type is correct");
                    }
                }
                else if(!namedType && fieldDefinition.type.kind == "ListType"){ 
                    if(fieldDefinition.type.type.name.value == commonType){
                        console.log("type is correct");
                    }
                }
                else{
                    returnBool = false;
                    desc = "Types are not common";
                    return;
                }
            }
        })
    });
  
    return{
      first: returnBool,
      description: desc,
      second: field.directives[0].arguments, // Don't know if this is needed (prob not for algo1)
    };
  }

  module.exports = checkConcArgs;