import { deprecatedDirective } from './fake-deprecated'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { ApolloServer } from 'apollo-server'
import typeDefs from "./wrapper-definition-schema.js"
import {printSchema} from "graphql"

const { deprecatedDirectiveTypeDefs, deprecatedDirectiveTransformer } = deprecatedDirective('deprecated')

let schema = makeExecutableSchema({
  typeDefs: [
    deprecatedDirectiveTypeDefs,
      `
      type ExampleType {
        newField: String
        oldField: String @deprecated(reason: "Use \`newField\`.")
      }

      type Query {
        rootField: ExampleType
      }
    `
  ]
})
schema = deprecatedDirectiveTransformer(schema)

const server = new ApolloServer({ schema: schema })

console.log(printSchema(schema))

server.listen(4000);