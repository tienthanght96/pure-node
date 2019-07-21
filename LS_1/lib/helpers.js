/* Helpers for various tasks */

// Dependencies
const crypto = require('crypto');
const config = require('./config');
const https = require('https');
const querystring = require('querystring');

const helpers = {};

// Create a SHA256 hash
helpers.hash = function(string) {
  if(typeof string === 'string' && string.length > 0) {
   const hash = crypto.createHmac('sha256', config.hashingSecret).update(string).digest('hex');
   return hash;
  } else {
    return false;
  }
};
// Parse JSON string to an object in all case without throwing
helpers.parseJsonToObject = function(string) {
  try {
    const obj = JSON.parse(string);
    return obj;
  } catch (error) {
    return {};
  }
}
// Create random string with given length
helpers.createRandomString = function(stringLength) {
  stringLength = (typeof stringLength === 'number' && stringLength > 0)
    ? stringLength
    : false;
  if(stringLength) {
    // Define all possible characters
    const possibleCharacters = '0123456789qwertyuiopasdfghjklzxcvbnm';
    let result = '';
    for (let index = 1; index <= stringLength; index++) {
      const randomNumber = Math.floor(Math.random() * possibleCharacters.length);
      const randomCharacter = possibleCharacters.charAt(randomNumber);
      result += randomCharacter;
    }
    return result;
  } else {
    return false;
  }
}

// Send sms via Twlio
helpers.sendTwilioSms = function(phone, message, callback) {
  phone = (typeof phone === 'string' && phone.trim().length === 10)
    ?  phone.trim()
    : false;
  message = (typeof message === 'string' && message.trim().length > 0)
    ?  message.trim()
    : false;
  if(phone && message) {
    const payload = {
      From: config.twilio.fromPhone,
      To: '+1'+ phone,
      Body: message,
    };
    const stringPayload = querystring.stringify(payload);
    const requestDetails = {
      'protocol' : 'https:',
      'hostname' : 'api.twilio.com',
      'method' : 'POST',
      'path' : '/2010-04-01/Accounts/'+config.twilio.accountSid+'/Messages.json',
      'auth' : config.twilio.accountSid+':'+config.twilio.authToken,
      'headers' : {
        'Content-Type' : 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(stringPayload)
      }
    };
    // Instantiate the request object
    const req = https.request(requestDetails, function(res) {
      const status = res.statusCode;
      if(status === 200 || status === 201) {
        callback(false)
      } else {
        callback('Status code returned was' + status);
      }
    });
    
    req.on('error', function(error) {
      callback(error);
    });
    
    // Add payload
    req.write(stringPayload);
    
    req.end();
  } else {
    callback('Given parameters were missing or invalid');
  }
};


module.exports = helpers;