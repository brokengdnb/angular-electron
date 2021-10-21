const platform = require('platform');

// Create and Save a new Note
exports.create = (req, res) => {
    // Validate request
    // Create a Note

    // Save Note in the database

};

// Retrieve and return all notes from the database.
exports.findAll = (req, res) => {

};

// Find a single note with a noteId
exports.findOne = (req, res) => {

};

// Update a note identified by the noteId in the request
exports.update = (req, res) => {
    // Validate Request
};

// Send info about device
exports.getDeviceInfo = (req, res) => {
    let info = platform.parse(req.headers['user-agent']);
    res.send(info);
};

exports.getServerInfo = (req, res) => {
  res.send(platform);
};

exports.delete = (req, res) => {
};
