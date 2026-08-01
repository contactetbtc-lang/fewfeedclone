const publisherHandler = require('./facebook-publisher');

module.exports = async function handler(req, res) {
    if (req.url === '/publish' || req.url === '/api/publish' || req.method === 'POST') {
        return publisherHandler(req, res);
    }
    
    res.status(200).send('API Server is Running');
};