// Lib for storing and edit data
const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');

const lib = {};
// Base directory of the data folder
lib.baseDir = path.join(__dirname, '/../.data/');

// Write data to a file
lib.create = function(dir, file, data, callback) {
  // Open the file for writing
  const filePath = `${lib.baseDir}${dir}/${file}.json`;
  fs.open(filePath, 'wx', function(error, file){
    if(!error && file) {
      // Convert data to string
      const stringData = JSON.stringify(data);
      // Write to file and close it
      fs.writeFile(file, stringData, function(error){
        if(!error) {
          fs.close(file, function(error) {
            if(!error) {
              callback(false);
            } else {
              callback('Error closing new file');
            }
          });
        } else {
          callback('Error writing to new file');
        }
      });
    } else {
      callback('Could not create new file, it may already exist');
    }
  });
};

// Read data from a file
lib.read = function(dir, file, callback) {
  const filePath = `${lib.baseDir}${dir}/${file}.json`;
  fs.readFile(filePath, 'utf8', function(error, data){
    if(!error && data) {
      const parsedData = helpers.parseJsonToObject(data);
      callback(false, parsedData);
    } else {
      callback(error, data);
    }
  });
}

// Update data inside a file
lib.update = function(dir, file, data, callback) {
  const filePath = `${lib.baseDir}${dir}/${file}.json`;
  fs.open(filePath, 'r+', function(error, fileDescriptor){
    if(!error && fileDescriptor) {
      // Convert data to string
      const stringData = JSON.stringify(data);
      // Truncate the file
      fs.ftruncate(fileDescriptor, function(error){
        if(!error) {
          fs.writeFile(fileDescriptor,stringData, function(error) {
            if(!error) {
              fs.close(fileDescriptor, function(error) {
                if(!error) {
                  callback(false);
                } else {
                  callback('Error closing the existing file');
                }
              });
            } else {
              callback('Error writing to existing file');
            }
          });
        } else {
          callback('Error truncate the file');
        }
      });
    } else {
      callback('Could not open the file for update, it may not exist yet');
    }
  });
}

// Delete a file
lib.delete = function(dir, file, callback) {
  // Unlink the file
  const filePath = `${lib.baseDir}${dir}/${file}.json`;
  fs.unlink(filePath, function(error) {
    if(!error) {
      callback(false);
    } else {
      callback('Error delete the file');
    }
  });
};

// List all the item in a directory
lib.list = function(dir, callback) {
  const pathDirectory = lib.baseDir + dir + '/';
  fs.readdir(pathDirectory, function(error, data) {
    if(!error && data && data.length > 0) {
      const trimmedFileNames = data.map(function(fileName) {
        return fileName.replace('.json', '');
      });
      callback(false, trimmedFileNames); 
    } else {
      callback(error, data);
    }
  });
};

module.exports = lib;