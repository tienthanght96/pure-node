const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./lib/config');
const handlers = require('./lib/handlers');
const helpers = require('./lib/helpers');

// Create instance http server
const httpServer = http.createServer(function(req, res){
  inifiedServer(req, res);
});
// Start listening http server
httpServer.listen(config.httpPort, function(){
  console.log(`The server is listening on port ${config.httpPort}`);
});

// Create instance https server
const httpsServerOptions = {
  key: fs.readFileSync('./https/key.pem'),
  cert: fs.readFileSync('./https/cert.pem')
};
const httpsServer = https.createServer(httpsServerOptions,function(req, res){
  inifiedServer(req, res);
});
// Start listening https server
httpsServer.listen(config.httpsPort, function(){
  console.log(`The server is listening on port ${config.httpsPort}`);
});

// All the server logic for both http and https server
const inifiedServer = function(req, res) {
  // Get URL and parse it
  const pathUrl = url.parse(req.url, true);
  
  // Get path
  const path = pathUrl.pathname;
  const trimPath = path.replace(/^\/+|\/+$/g, '');
  
  //  Get Query Strong
  const queryString = pathUrl.query;

  // Get HTTP method
  const method = req.method.toLowerCase();

  // Get headers as object
  const headers = req.headers;

  // Get the payload if any
  const decoder = new StringDecoder('utf-8');
  let buffer = '';
  req.on('data', function(data) {
      buffer += decoder.write(data);
  });

  req.on('end', function (){
    buffer += decoder.end();
    
    // Choose handler this request should go to or handle to 404
    const chosenHandler = typeof router[trimPath] !== 'undefined'
      ? router[trimPath]
      : handlers.notFound;
    // Construct the data object to send to the handler
    const data = {
      trimPath,
      queryString,
      method,
      headers,
      payload: helpers.parseJsonToObject(buffer)
    };
    // Route the request to handler specified in router
    chosenHandler(data, function ( statusCode, payload){
      // Use the status code called back by handler or default 200
      statusCode = typeof statusCode ===  'number'
        ? statusCode
        : 200;
      
        // Use payload called back by the hand;er. pr default to empty object
      payload = typeof payload === 'object' ? payload : {};
      
      // Convert the payload to a string
      const payloadString = JSON.stringify(payload);

      // Return the response
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(statusCode);
      res.end(payloadString);
      // Log the request path
      console.log('Returning this response: ', statusCode, payloadString);
      // console.log('1....Query String Parameters: ', queryString);
      // console.log('2....Request path: ' + trimPath + '- with method: ' + method);
      // console.log('3....Request with headers: ', headers);
      // console.log('4....Request with payload: ', buffer);
    });
  });
}

// Define request router
const router = {
  ping: handlers.ping,
  users: handlers.users,
  tokens: handlers.tokens,
  checks: handlers.checks
};