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
        
        let pages = [];
        let profileName = 'Facebook User';

        try {
            const publisher = new FacebookPublisher({ 
                accessToken: accessToken || process.env.ACCESS_TOKEN, 
                cookieData: cookieData || process.env.COOKIE_DATA 
            });
            
            const profile = await publisher.getUserProfile();
            if (profile && profile.name) profileName = profile.name;

            const fetchedPages = await publisher.getUserPages();
            if (fetchedPages && fetchedPages.length > 0) pages = fetchedPages;
        } catch (innerErr) {
            console.log('Skipping strict fetch, using defaults:', innerErr.message);
        }

        if (!pages || pages.length === 0) {
            pages = [{ id: 'me', name: 'Personal Profile / Timeline' }];
        }

        res.json({ 
            profile: { name: profileName }, 
            pages: pages 
        });
    } catch (err) {
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