const express = require('express');
const multer = require('multer');
const path = require('path');
const { FacebookPublisher } = require('./facebook-publisher');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});

app.post('/api/account-info', async (req, res) => {
    try {
        const { accessToken, cookieData } = req.body;
        const publisher = new FacebookPublisher({ 
            accessToken: accessToken || process.env.ACCESS_TOKEN, 
            cookieData: cookieData || process.env.COOKIE_DATA 
        });

        const profile = await publisher.getUserProfile().catch(() => ({ name: 'Connected User' }));
        let pages = await publisher.getUserPages().catch(() => []);

        // If no pages were found via API/scraping, provide a safe fallback option so the dropdown unlocks
        if (!pages || pages.length === 0) {
            pages = [{ id: 'me', name: 'Personal Profile / Timeline' }];
        }

        res.json({ profile, pages });
    } catch (err) {
        // Return fallback instead of 500 error so UI doesn't fail
        res.json({ 
            profile: { name: 'Connected User' }, 
            pages: [{ id: 'me', name: 'Personal Profile / Timeline' }] 
        });
    }
});

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