const express = require('express');
const multer = require('multer');
const path = require('path');
const { FacebookPublisher } = require('./facebook-publisher');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});

// Account info endpoint to fetch profile and pages automatically
app.post('/api/account-info', async (req, res) => {
    try {
        const { accessToken, cookieData } = req.body;
        const token = accessToken || process.env.ACCESS_TOKEN;
        const cookie = cookieData || process.env.COOKIE_DATA;

        if (!token) {
            return res.status(400).json({ error: 'Access token is required' });
        }

        const publisher = new FacebookPublisher({ accessToken: token, cookieData: cookie });
        const [profile, pages] = await Promise.all([
            publisher.getUserProfile().catch(() => ({ name: 'Facebook User' })),
            publisher.getUserPages().catch(() => [])
        ]);

        res.json({ profile, pages });
    } catch (err) {
        console.error('Account info error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Publish endpoint with streaming logs
app.post('/publish', upload.single('imageFile'), async (req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    const log = (msg) => res.write(msg + '\n');

    try {
        log('🚀 Initializing Facebook Publisher...');
        const { pageId, caption, linkName, linkUrl, callToActionType, accessToken, cookieData } = req.body;

        const publisher = new FacebookPublisher({
            accessToken: accessToken || process.env.ACCESS_TOKEN,
            cookieData: cookieData || process.env.COOKIE_DATA
        });

        log('📤 Preparing post content...');
        const result = await publisher.publishPost({
            pageId,
            caption,
            linkName,
            linkUrl,
            callToActionType: callToActionType || 'LEARN_MORE',
            imageFile: req.file
        });

        log('✅ Post published successfully!');
        log(JSON.stringify(result, null, 2));
    } catch (err) {
        log('❌ Error: ' + err.message);
    } finally {
        res.end();
    }
});

module.exports = app;