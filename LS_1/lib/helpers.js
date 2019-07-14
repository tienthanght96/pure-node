/* Helpers for various tasks */

// Dependencies
const crypto = require('crypto');
const config = require('./config');

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
module.exports = helpers;