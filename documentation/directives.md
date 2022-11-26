# The custom GraphQL directives

The following GraphQL directives are currently supported in the wrapper schema definition file. These wrapper schema definitions are parsed by the tool and 
used to wrap the remote schema. The tool will then generate a wrapper schema and corresponding resolver functions that delegate queries to the remote schema. 

## Wrapping object types

directive @wrap(type: String!, includeAllFields: Boolean, excludeFields: \[String!\], listQuery: String, singleQuery: String)

* type: The name of the object type you want to wrap in the remote schema
* includeAllFields: Can be used as a short-hand if you want to include all field definitions that are found in the remote object type 
* excludeFields: Can only be used in conjunction with includeAllFields. Accepts the names of fields you want to exclude.
* listQuery: The name of a field in the remote Query type that returns a list of the remote object type
* singleQuery: The name of a field in the remote Query type that returns a single remote object type

## Wrapping interface types

directive @wrap(interface: String!, includeAllFields: Boolean, excludeFields: \[String!\], listQuery: String, singleQuery: String)

* interface: The name of the interface type you want to wrap in the remote schema
* includeAllFields: Can be used as a short-hand if you want to include all field definitions that are found in the remote interface type 
* excludeFields: Can only be used in conjunction with includeAllFields. Accepts the names of fields you want to exclude.
* listQuery: The name of a field in the remote Query type that returns a list of the remote interface type
* singleQuery: The name of a field in the remote Query type that returns a single remote interface type

## Wrapping field definitions

### Wrapping field directly

directive @wrap(field: String!)

* Accepts a string that corresponds to a field name in the remote schema. The given field name must exist in the remote object type. 

### Wrapping fields by traversing a path

directive @wrap(path: \[String!\]!)

* Accepts a list of strings that correspond to a path of field names. Consider the following remote schema: 

type MotherStar {
  id: ID!
  name: String
}
type Planet {
  id: ID!
  name: String
  motherStar: MotherStar
}

If you want to include the name of the MotherStar object directly in the Planet object in your wrapper schema, you can define the following 
wrapper schema definitions: 

type MyMotherStar @wrap(type: "MotherStar") {
  id: ID! @wrap(field: "id")
  name: String @wrap(field: "name")
}
type MyPlanet @wrap(type: "Planet") {
  id: ID! @wrap(field: "id")
  name: String @wrap(field: "name")
  nameOfMotherStar: String @wrap(path: \["motherStar", "name"\])
}

### Wrapping fields by concatenating field values and delimiters

directive @concatenate(values: \[String!\])
