// Dependencies
const server = require('./lib/server');
const workers = require('./lib/workers');

// Declare app
const app = {};

// Init app

app.init = function() {

  // Start server
  server.init();

  // Start workers
  workers.init();
};

app.init();

module.exports = app;