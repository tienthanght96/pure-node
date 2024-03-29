/* Create and export configuration varibales */

// Container for all the enviroments
const enviroments = {};

// Staging enviroments
enviroments.staging = {
  httpPort: 3000,
  httpsPort: 3001,
  envName: 'staging',
  hashingSecret: 'thisIsASecret',
  maxChecks: 5,
  twilio: {
    accountSid : 'ACb32d411ad7fe886aac54c665d25e5c5d',
    authToken : '9455e3eb3109edc12e3d8c92768f7a67',
    fromPhone : '+15005550006'
  }
};

// Production enviroments
enviroments.production = {
  httpPort: 5000,
  httpsPort: 5001,
  envName: 'production',
  hashingSecret: 'thisIsAlsoSecret',
  maxChecks: 5,
  twilio: {
    accountSid: '',
    authToken: '',
    fromPhone: '',
  }
};

// Determine which enviroment was passed as a comand-line argument
const currentEnviroment = (typeof process.env.NODE_ENV === 'string')
  ? process.env.NODE_ENV.toLocaleLowerCase()
  : '';

// Check that current enviroment is one of the enviroments above, if not defaul to staging
const enviromentToExport = (typeof enviroments[currentEnviroment] === 'object')
  ? enviroments[currentEnviroment]
  : enviroments.staging;

// Export the module
module.exports = enviromentToExport;