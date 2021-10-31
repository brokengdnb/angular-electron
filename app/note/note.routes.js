module.exports = (app) => {
    const notes = require('./note.controller.js');
    const cors = require('cors');
    const uploadController = require('../upload');

    app.post('/upload', uploadController);

    app.use(cors());

    // Create a new Note
    app.post('/api/notes', notes.create);

    // Retrieve all Notes
    app.get('/api/notes', notes.findAll);

    app.get('/device', notes.getDeviceInfo);

    app.get('/server', notes.getServerInfo);

    // Retrieve a single Note with noteId
    app.get('/api/notes/:noteId', notes.findOne);

    // Update a Note with noteId
    app.post('/api/notes/:noteId', notes.update);

    // Delete a Note with noteId
    app.delete('/api/notes/:noteId', notes.delete);
}
