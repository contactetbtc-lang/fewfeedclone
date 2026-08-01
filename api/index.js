const express = require('express');
const multer = require('multer');
const path = require('path');

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
        let token = accessToken || process.env.ACCESS_TOKEN;
        let pages = [];
        let profileName = 'Facebook User';

        // Try to fetch via Graph API if token exists
        if (token) {
            try {
                const meRes = await fetch(`https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${token}`);
                const meData = await meRes.json();
                if (meData && meData.name) profileName = meData.name;

                const pagesRes = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${token}`);
                const pagesData = await pagesRes.json();
                if (pagesData && pagesData.data) pages = pagesData.data;
            } catch (e) {}
        }

        // Fallback or default pages so UI never breaks
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
        const { pageId, caption, linkName, linkUrl, callToActionType, accessToken } = req.body;
        const token = accessToken || process.env.ACCESS_TOKEN;

        if (!token) {
            throw new Error('Access token is missing.');
        }

        log('📤 Preparing post content...');
        const formData = new URLSearchParams();
        formData.append('message', caption || '');
        if (linkUrl) formData.append('link', linkUrl);
        if (linkName) formData.append('name', linkName);
        if (callToActionType) {
            formData.append('call_to_action', JSON.stringify({ type: callToActionType, value: { link: linkUrl } }));
        }
        formData.append('access_token', token);

        const fbRes = await fetch(`https://graph.facebook.com/v18.0/${pageId}/feed`, {
            method: 'POST',
            body: formData
        });

        const result = await fbRes.json();
        if (result.error) {
            throw new Error(result.error.message);
        }

        log('✅ Post published successfully!');
        log(JSON.stringify(result, null, 2));
    } catch (err) {
        log('❌ Error: ' + err.message);
    } finally {
        res.end();
    }
});

module.exports = app;