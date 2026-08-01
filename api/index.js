const express = require('express');
const publisherHandler = require('./facebook-publisher');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Handle publish routes
app.all('/publish', publisherHandler);
app.all('/api/publish', publisherHandler);

// Fallback status route
app.get('/', (req, res) => {
    res.status(200).send('API Server is Running');
});

module.exports = app;