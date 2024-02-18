const fs = require('fs');

// Helper function to read data from the JSON file asynchronously
const readJSON = (filePath, callback) => {
    fs.readFile(filePath, (error, data) => {
        if (error) {
            console.error('Error reading data from file:', error);
            callback([]);
        } else {
            callback(JSON.parse(data));
        }
    });
};

// Helper function to write data to the JSON file asynchronously
const writeJSON = (filePath, data, callback) => {
    fs.writeFile(filePath, JSON.stringify(data, null, 4), (error) => {
        if (error) {
            console.error('Error writing data to file:', error);
        }
        callback();
    });
};

module.exports = { readJSON, writeJSON };
