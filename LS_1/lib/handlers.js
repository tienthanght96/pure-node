/* 
  Request handler
*/
const _data = require('./data');
const helpers = require('./helpers');
const config = require('./config');
// Define handler
const handlers = {};

// Ping Handler
handlers.ping = function (data, callback) {
  // Callback a http status code and a payload object
  callback(200); 
};

/* --------- USERS --------- */
// Container for the users submethods
handlers._users = {};

// Users - post
// Require data: firstName, lastName, phone, password, tosArgeement
// Optional data: none
handlers._users.post = function(data = {}, callback) {
  // Check tha all required fields are filled out
  const { payload } = data;
  const firstName = (typeof payload.firstName === 'string' && payload.firstName.trim().length > 0)
    ? payload.firstName.trim()
    : false;
  const lastName = (typeof payload.lastName === 'string' && payload.lastName.trim().length > 0)
    ? payload.lastName.trim()
    : false;
  const phone = (typeof payload.phone === 'string' && payload.phone.trim().length === 10)
    ? payload.phone.trim()
    : false;
  const password = (typeof payload.password === 'string' && payload.password.trim().length > 0)
    ? payload.password.trim()
    : false;
  const tosArgeement = (typeof payload.tosArgeement === 'boolean')
    ? payload.tosArgeement
    : false;
  if(firstName && lastName && phone && password && tosArgeement) {
    // Make sure that the user doesn't exist
    _data.read('users', phone, function(error, data) {
      if(error) {
        const hashedPassword = helpers.hash(password);
        if(hashedPassword) {
          const userObject = {
            firstName,
            lastName,
            phone,
            hashedPassword,
            tosArgeement
          };
          _data.create('users', phone, userObject, function(error) {
            if(!error) {
              callback(200);
            } else {
              console.log('error', error);
              callback(500, { Error: 'Could not create the new user' });
            }
          });
        } else {
          callback(500, { Error: 'Could not hash the user\'s password' });
        }
      } else {
        callback(400, { Error: 'A user with phone number already exist' });
      }
    });
  } else {
    callback(400, { Error: 'Missing required fields' });
  }
};

// Users - get
// Require data: phone
// Optional data: none
// @TODO Only let an authenticated user access their object. Don't let them access anonymous
handlers._users.get = function(data, callback) {
  // Check that the phone number is vaild
  const { queryString, headers } = data;
  const phone = (typeof queryString.phone === 'string' && queryString.phone.trim().length === 10)
    ? queryString.phone.trim()
    : false;
  if(phone) {
    // Get token from header 
    const token = (typeof headers.token === 'string' && headers.token.trim().length === 20)
      ? headers.token.trim()
      : false;
    // Verify token
    handlers._tokens.verifyToken(token, phone, function(tokenIsVaild) {
      if(tokenIsVaild) {
        // Lookup the user
        _data.read("users", phone, function(error, data) {
          if(!error && data) {
            // Remove hashed password from the user object before returing it to the request 
            delete data.hashedPassword;
            callback(200, data);
          } else {
            callback(404);
          }
        });
      } else {
        callback(403, { Error: 'Missing token in header or token is invalid' });
      }
    });
  } else {
    callback(400, { Error: 'Missing require fields' });
  }
};

// Users - put
// Require data: phone
// Optional data: firstName, lastName, password (at least one must be specified)
// @TODO Only let an authenticated user update their own object. Don't let them access anonymous
handlers._users.put = function(data, callback) {
  // Check for the require field
  const { queryString, payload, headers } = data;
  const phone = (typeof queryString.phone === 'string' && queryString.phone.trim().length === 10)
    ? queryString.phone.trim()
    : false;
    const firstName = (typeof payload.firstName === 'string' && payload.firstName.trim().length > 0)
      ? payload.firstName.trim()
      : false;
    const lastName = (typeof payload.lastName === 'string' && payload.lastName.trim().length > 0)
      ? payload.lastName.trim()
      : false;
    const password = (typeof payload.password === 'string' && payload.password.trim().length > 0)
      ? payload.password.trim()
      : false;
      if(phone) {
        if(firstName || lastName || password) {
          // Get token from header 
          const token = (typeof headers.token === 'string' && headers.token.trim().length === 20)
            ? headers.token.trim()
            : false;
          // Verify token
          handlers._tokens.verifyToken(token, phone, function(tokenIsVaild) {
            if(tokenIsVaild) {
              // Lookup the user
              _data.read("users", phone, function(error, userData) {
                if(!error && userData) {
                  // Update the fields
                  if(firstName) {
                    userData.firstName = firstName;
                  }
                  if(lastName) {
                    userData.lastName = lastName;
                  }
                  if(password) {
                    userData.hashedPassword = helpers.hash(password);
                  }
                  _data.update('users', phone, userData, function(error) {
                    if(!error) {
                      callback(200)
                    } else {
                      console.log(error);
                      callback(500, { Error: 'Could not update the user' });
                    }
                  });
                } else {
                  callback(404, { Error: 'The specified user does not exist' });
                }
              });
            } else {
              callback(403, { Error: 'Missing token in header or token is invalid' });
            }
          });
        } else {
          callback(400, { Error: 'Missing fields to update' });
        }   
      } else {
        callback(400, { Error: 'Missing require fields' });
      }
};

// Users - delete
// Require data: phone
// Optional data: none
// @TODO Only let an authenticated user update their own object. Don't let them delete anonymous
handlers._users.delete = function(data, callback) {
  const { queryString, headers } = data;
  const phone = (typeof queryString.phone === 'string' && queryString.phone.trim().length === 10)
    ? queryString.phone.trim()
    : false;
  if(phone) {
    const token = (typeof headers.token === 'string' && headers.token.trim().length === 20)
      ? headers.token.trim()
      : false;
    // Verify token
    handlers._tokens.verifyToken(token, phone, function(tokenIsVaild) {
      if(tokenIsVaild) {
        // Lookup the user
        _data.read("users", phone, function(error, userData) {
          if(!error && userData) {
            // Remove hashed password from the user object before returing it to the request 
            _data.delete('users', phone, function(error) {
              if(!error) {
                // Delete each of the check accociated with this user
                const userChecks = (typeof userData.checks === 'object' && Array.isArray(userData.checks) && userData.checks.length > 0)
                  ? userData.checks
                  : [];
                const checksToDelete = userChecks.length;
                if(checksToDelete > 0) {
                  let checkDeleted = 0;
                  let deletionErrors = false;
                  // Loop through the checks
                  userChecks.forEach(function(checkId) {
                    _data.delete("checks", checkId, function(error) {
                      if(error) {
                        deletionErrors = true;
                      } else {
                        checkDeleted++;
                        if(checkDeleted === checksToDelete) {
                          if(!deletionErrors) {
                            callback(200);
                          } else {
                            callback(500, { Error: 'Errors when delete check accociated with this user' });
                          }
                        }
                      }
                    });
                  });
                } else {
                  callback(200);
                }
              } else {
                callback(400, { Error: 'Could not find the specified user' });
              }
            });
          } else {
            callback(400, { Error: 'Could not find the specified user' });
          }
        });
      } else {
        callback(403, { Error: 'Missing token in header or token is invalid' });
      }
    });
  } else {
    callback(400, { Error: 'Missing require fields' });
  }
};

// Users Handler
handlers.users = function (data, callback) {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if(acceptableMethods.includes(data.method) > -1) {
    handlers._users[data.method](data, callback);
  } else {
    callback(405);
  }
};
/* --------- END USERS --------- */


/* --------- TOKENS --------- */
// Container of all the tokens methods
handlers._tokens = {};

// Tokens - post
// Required data: phone, password
// Optional data: none
handlers._tokens.post = function(data, callback){
  const { payload } = data;
  const phone = (typeof payload.phone === 'string' && payload.phone.trim().length === 10)
    ? payload.phone.trim()
    : false;
  const password = (typeof payload.password === 'string' && payload.password.trim().length > 0)
    ? payload.password.trim()
    : false;

  if(phone && password) {
    // Lool the user who matches the phone
    _data.read('users', phone, function(error, userData) {
      if(!error && userData) {
        // Hash the sent password and compare
        const hashedPassword = helpers.hash(password);
        if(hashedPassword === userData.hashedPassword) {
          // If vaild create new token with random name
          // Set expriation data 1 hour
          const tokenId = helpers.createRandomString(20);
          const expires = Date.now() + 1000 * 60 * 60;
          const tokenObject = { phone, id: tokenId, expires };
          _data.create('tokens', tokenId, tokenObject, function(error) {
            if(!error) {
              callback(200, tokenObject);
            } else {
              callback(500, { Error: 'Could not create the new token' });
            }
          });
        } else {
          callback(400, { Error: 'Password did not match the specified the user password' });
        }
      } else {
        callback(400, { Error: 'Could not find the user' });
      }
    });
  } else {
    callback(400, { Error: 'Missing required fields' });
  }
};

// Tokens - get
// Required data: id
// Optional data: none
handlers._tokens.get = function(data, callback){
  const { queryString } = data;
  const id = (typeof queryString.id === 'string' && queryString.id.trim().length > 20)
    ? queryString.id.trim()
    : false;
  if(id) {
    // Lookup the token
    _data.read("tokens", id, function(error, tokenData) {
      if(!error && tokenData) {
        callback(200, tokenData);
      } else {
        callback(404);
      }
    });
  } else {
    callback(400, { Error: 'Missing require fields' });
  }
};

// Tokens - put
// Required data: id, extend
// Optional data: none
handlers._tokens.put = function(data, callback){
  const { payload } = data;
  const id = (typeof payload.id === 'string' && payload.id.trim().length === 20)
    ? payload.id.trim()
    : false;
  const extend = (typeof payload.extend === 'boolean')
    ? payload.extend
    : false;
  if(id && extend) {
    // Lookup the user
    _data.read("tokens", id, function(error, tokenData) {
      if(!error && tokenData) {
        // Check token to make sure it does not expired
        if(tokenData.expires > Date.now()) {
          tokenData.expires = Date.now() + 1000 * 60 * 60;
          // Store the new updates
          _data.update('tokens', id, tokenData, function(error) {
            if(!error) {
              callback(200);
            } else {
              callback(500, { Error: 'Could not update the token' });
            }
          });
        } else {
          callback(400, { Error: 'The token has already expired, and can not be extend' });
        }
      } else {
        callback(400, { Error: 'Could not find the specified token' });
      }
    });
  } else {
    callback(400, { Error: 'Missing require fields' });
  }
};

// Tokens - delete
// Required data: id
// Optional data: none
handlers._tokens.delete = function(data, callback){
  const { queryString } = data;
  const id = (typeof queryString.id === 'string' && queryString.id.trim().length === 20)
    ? queryString.id.trim()
    : false;
  if(id) {
    // Lookup the user
    _data.read("tokens", id, function(error, data) {
      if(!error && data) {
        // Remove hashed password from the user object before returing it to the request 
        _data.delete('tokens', id, function(error) {
          if(!error) {
            callback(200);
          } else {
            callback(500, { Error: 'Could not delete the specified token' });
          }
        });
      } else {
        callback(400, { Error: 'Could not find the specified token' });
      }
    });
  } else {
    callback(400, { Error: 'Missing require fields' });
  }
};

// Verify if a given token id is currently vaild for  a given user
handlers._tokens.verifyToken = function(id, phone, callback) {
  // Lookup the token
  _data.read('tokens', id, function(error, tokenData) {
    if(!error && tokenData) {
      // Check token expired
      if(tokenData.phone === phone && tokenData.expires > Date.now()) {
        callback(true);
      } else {
        callback(false);
      }
    } else {
      callback(false);
    }
  });
};
handlers.tokens = {};
// Tokens Handler
handlers.tokens = function (data, callback) {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if(acceptableMethods.includes(data.method) > -1) {
    handlers._tokens[data.method](data, callback);
  } else {
    callback(405);
  }
};
/* --------- END TOKEN --------- */


/* --------- CHECKS HANLDERS --------- */
handlers._checks = {};

// Checks - post
// Required data: protocol, url, method, successCodes, timeoutSeconds
// Optional data: none
handlers._checks.post = function(data, callback){
  // Validate inputs
  const { payload, headers } = data;
  const protocols = ['https', 'http'];
  const methods = ['get', 'post', 'delete', 'put'];
  const protocol = (typeof payload.protocol === 'string' && protocols.indexOf(payload.protocol) > -1)
    ? payload.protocol
    : false;
  const url = (typeof payload.url === 'string' && payload.url.trim().length > 0)
    ? payload.url.trim()
    : false;
  const method = (typeof payload.method === 'string' && methods.indexOf(payload.method) > -1)
    ? payload.method
    : false;
  const successCodes = (typeof payload.successCodes === 'object' && Array.isArray(payload.successCodes) && payload.successCodes.length > 0)
    ? payload.successCodes
    : false;
  const timeoutSeconds = (typeof payload.timeoutSeconds === 'number' && 1 <= payload.timeoutSeconds && payload.timeoutSeconds <= 5)
    ? payload.timeoutSeconds
    : false;
  if(protocol && url && method && successCodes && timeoutSeconds) {
    // Get token from header
    const token = (typeof headers.token === 'string' && headers.token.trim().length === 20)
      ? headers.token.trim()
      : false;
    // Read token
    _data.read('tokens', token, function(error, tokenData) {
      if(!error && tokenData) {
        const userPhone = tokenData.phone;
        // Get user data
        _data.read('users', userPhone, function(error, userData) {
          if(!error && userData) {
            const userChecks = (typeof userData.checks === 'object' && Array.isArray(userData.checks) && userData.checks.length > 0)
              ? userData.checks
              : [];
            // Verify that the user has less than the number of max-checks-per-user
            if(userChecks.length < config.maxChecks) {
              const checkId = helpers.createRandomString(20);
              // Create the check object and include the user's phone
              const checkObject = {
                id: checkId,
                userPhone: userPhone,
                protocol,
                url,
                method,
                successCodes,
                timeoutSeconds
              };
              // Save the object
              _data.create('checks', checkId, checkObject, function(error) {
                if(!error) {
                  // Add the check id to the user's object
                  userData.checks = userChecks;
                  userData.checks.push(checkId);
                  _data.update('users', userPhone, userData, function(error) {
                    if(!error) {
                      callback(200, checkObject);
                    } else {
                      callback(500, { Error: 'Could not update the user with the new check' });
                    }
                  });
                } else {
                  callback(500, { Error: 'Could not create new check' });
                }
              })
            } else {
              callback(400, { Error: `The user already has the maximun number of checks ${config.maxChecks}` });
            }
          } else {
            callback(403);
          }
        });
      } else {
        callback(403);
      }
    });
  } else {
    callback(400, { Error: 'Missing require inputs or inputs are invalid' });
  }
};

// Checks - get
// Required data: id
// Optional data: none
handlers._checks.get = function(data, callback){
  const { queryString, headers } = data;
  const id = (typeof queryString.id === 'string' && queryString.id.trim().length === 20)
    ? queryString.id.trim()
    : false;
  if(id) {
    // Lookup the check with id
    _data.read('checks', id, function(error, checkData) {
      if(!error && checkData) {
        // Get token from header 
        const token = (typeof headers.token === 'string' && headers.token.trim().length === 20)
          ? headers.token.trim()
          : false;
        // Verify token
        handlers._tokens.verifyToken(token, checkData.userPhone, function(tokenIsVaild) {
          if(tokenIsVaild) {
            callback(200, checkData);
          } else {
            callback(403, { Error: 'Missing token in header or token is invalid' });
          }
        });
      } else {
        callback(404);
      }
    });
  } else {
    callback(400, { Error: 'Missing require fields' });
  }
};

// Checks - put
// Required data: id
// Optional data: protocol, url, method, successCodes, timeoutSeconds (at least one must be specified)
handlers._checks.put = function(data, callback){
  const { payload, headers } = data;
  const protocols = ['https', 'http'];
  const methods = ['get', 'post', 'delete', 'put'];
  const id = (typeof payload.id === 'string' && payload.id.trim().length === 20)
    ? payload.id.trim()
    : false;
  const protocol = (typeof payload.protocol === 'string' && protocols.indexOf(payload.protocol) > -1)
    ? payload.protocol
    : false;
  const url = (typeof payload.url === 'string' && payload.url.trim().length > 0)
    ? payload.url.trim()
    : false;
  const method = (typeof payload.method === 'string' && methods.indexOf(payload.method) > -1)
    ? payload.method
    : false;
  const successCodes = (typeof payload.successCodes === 'object' && Array.isArray(payload.successCodes) && payload.successCodes.length > 0)
    ? payload.successCodes
    : false;
  const timeoutSeconds = (typeof payload.timeoutSeconds === 'number' && 1 <= payload.timeoutSeconds && payload.timeoutSeconds <= 5)
    ? payload.timeoutSeconds
    : false;
  // Get token from header
  const token = (typeof headers.token === 'string' && headers.token.trim().length === 20)
    ? headers.token.trim()
    : false;
  
  if(id) {
    if(protocol || url || method || successCodes || timeoutSeconds) {
      // Lookup the check with id
      _data.read('checks', id, function(error, checkData) {
        if(!error && checkData) {
          // Get token from header 
          const token = (typeof headers.token === 'string' && headers.token.trim().length === 20)
            ? headers.token.trim()
            : false;
          // Verify token
          handlers._tokens.verifyToken(token, checkData.userPhone, function(tokenIsVaild) {
            if(tokenIsVaild) {
              if(protocol) {
                checkData.protocol = protocol;
              }
              if(url) {
                checkData.url = url;
              }
              if(method) {
                checkData.method = method;
              }
              if(successCodes) {
                checkData.successCodes = successCodes;
              }
              if(timeoutSeconds) {
                checkData.timeoutSeconds = timeoutSeconds;
              }
              _data.update('checks', id, checkData, function(error) {
                if(!error) {
                  callback(200)
                } else {
                  console.log(error);
                  callback(500, { Error: 'Could not update the check' });
                }
              });
            } else {
              callback(403);
            }
          });
        } else {
          callback(400, { Error: 'The check with your id yout want to update does not exist' });
        }
      });
        
    } else {
      callback(400, { Error: 'Missing fields to update' });
    }
    
  } else {
    callback(400, { Error: 'Missing require fields' });
  }
};

// Checks - delete
// Require data: id
// Optional data: none
handlers._checks.delete = function(data, callback) {
  const { queryString, headers } = data;
  const id = (typeof queryString.id === 'string' && queryString.id.trim().length === 20)
    ? queryString.id.trim()
    : false;
  if(id) {
    const token = (typeof headers.token === 'string' && headers.token.trim().length === 20)
      ? headers.token.trim()
      : false;
    _data.read('checks', id, function(error, checkData) {
      if(!error && checkData) {
        // Verify token
        handlers._tokens.verifyToken(token, checkData.userPhone, function(tokenIsVaild) {
          if(tokenIsVaild) {
            //  Delete check
            _data.delete("checks", id, function(error) {
              if(!error) {
                // Lookup the user
                _data.read("users", checkData.userPhone, function(error, userData) {
                  if(!error && userData) {
                    const userChecks = (typeof userData.checks === 'object' && Array.isArray(userData.checks) && userData.checks.length > 0)
                      ? userData.checks
                      : [];
                    const checkPosition = userChecks.indexOf(id);
                    if(checkPosition > -1) {
                      userChecks.splice(checkPosition, 1);
                      _data.update('users', userData.phone, userData, function(error) {
                        if(!error) {
                          callback(200);
                        } else {
                          callback(400, { Error: 'Could not update the user checks' });
                        }
                      });
                    } else {
                      callback(500, { Error: 'Could not find the check in user checks array' });
                    }
                  } else {
                    callback(400, { Error: 'Could not find the specified user who create the check' });
                  }
                });
              } else {
                callback(500, { Error: 'Could not delete the check data' });
              }
            })
          } else {
            callback(403, { Error: 'Missing token in header or token is invalid' });
          }
        });
      } else {
        callback(400, { Error: 'Could not find the specified check' });
      }
    });
  } else {
    callback(400, { Error: 'Missing require fields' });
  }
};


// Checks Handler
handlers.checks = function (data, callback) {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if(acceptableMethods.includes(data.method) > -1) {
    handlers._checks[data.method](data, callback);
  } else {
    callback(405);
  }
};
/* --------- END CHECKS --------- */

// Not Found Handler
handlers.notFound = function (data, callback) {
  callback(404); 
};

module.exports = handlers;