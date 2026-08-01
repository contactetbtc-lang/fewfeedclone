const express = require('express');
const path = require('path');
const publisherHandler = require('./api/facebook-publisher');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static frontend files from /public
app.use(express.static(path.join(__dirname, 'public')));

// Route publish requests
app.all('/publish', publisherHandler);
app.all('/api/publish', publisherHandler);

// Fallback route for static web app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;