// api/index.js
const express = require('express');
const app = express();

// Increase body payload size limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Safely import publisher module
const publisherModule = require('./facebook-publisher');
const facebookPublisher = typeof publisherModule === 'function' ? publisherModule : publisherModule.default;

// Handle Publish Route directly without breaking on missing middleware
app.post('/publish', (req, res, next) => {
  if (typeof facebookPublisher === 'function') {
    return facebookPublisher(req, res, next);
  } else {
    return res.status(500).json({ error: 'Publisher handler function is not defined correctly.' });
  }
});

// Fallback route
app.all('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

module.exports = app;