const express = require('express');
const app = express();

const publisherHandler = require('./facebook-publisher');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Forward publish requests safely
app.post('/publish', publisherHandler);
app.post('/api/publish', publisherHandler);

module.exports = app;