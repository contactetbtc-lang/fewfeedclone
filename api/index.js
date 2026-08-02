// api/index.js
const express = require('express');
const path = require('path');
const app = express();

// Body parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from /public
app.use(express.static(path.join(__dirname, '../public')));

// Safely import publisher
const publisherModule = require('./facebook-publisher');
const facebookPublisher = typeof publisherModule === 'function' ? publisherModule : publisherModule.default;

// Publish route
app.post('/publish', (req, res, next) => {
  if (typeof facebookPublisher === 'function') {
    return facebookPublisher(req, res, next);
  } else {
    return res.status(500).json({ error: 'Publisher handler function is not defined correctly.' });
  }
});

// Fallback to index.html for root route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

module.exports = app;