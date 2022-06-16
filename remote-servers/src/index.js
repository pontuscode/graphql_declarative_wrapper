const { ApolloServer } = require('apollo-server');
const responseCachePlugin = require('apollo-server-plugin-response-cache').default;
const typeDefs = require('./schema');
const resolvers = require('./resolvers');
const TrackAPI = require('./datasources/track-api');
require("dotenv").config();

async function startApolloServer(typeDefs, resolvers) {
  
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [responseCachePlugin({
      shouldReadFromCache: false,
      shouldWriteToCache: false
    })],
    dataSources: () => {
      return {
        trackAPI: new TrackAPI(),
      };
    }
  });

  const { url, port } = await server.listen({port: process.env.PORT || 4000});
  console.log(`
      🚀  Server is running
      🔉  Listening on port ${port}
      📭  Query at ${url}
    `);
}

startApolloServer(typeDefs, resolvers);
