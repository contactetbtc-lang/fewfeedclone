const express = require('express');
const router = express.Router();

router.post('/api/account-info', async (req, res) => {
    try {
        const { accessToken, cookieData } = req.body;
        const token = accessToken || process.env.ACCESS_TOKEN;

        let profileName = 'Connected User';
        let pages = [];

        if (token) {
            try {
                // Fetch actual user profile name using Graph API
                const meRes = await fetch(`https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${token}`);
                const meData = await meRes.json();
                if (meData && meData.name) {
                    profileName = meData.name;
                }

                // Fetch managed pages
                const pagesRes = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${token}`);
                const pagesData = await pagesRes.json();
                
                if (pagesData && pagesData.data) {
                    pages = pagesData.data.map(page => ({
                        id: page.id,
                        name: page.name,
                        access_token: page.access_token
                    }));
                }
            } catch (err) {
                console.error('API Fetch error:', err.message);
            }
        } else if (cookieData) {
            // If the extension is passing cookies instead of a token, fallback gracefully or parse name if possible
            profileName = 'Facebook Account (Session Active)';
        }

        // Combine default personal timeline with your fetched pages
        const finalPages = [
            { id: 'me', name: 'Personal Profile / Timeline' },
            ...pages
        ];

        res.json({ 
            profile: { name: profileName }, 
            pages: finalPages 
        });
    } catch (err) {
        res.status(500).json({ 
            profile: { name: 'Connected User' }, 
            pages: [{ id: 'me', name: 'Personal Profile / Timeline' }] 
        });
    }
});

module.exports = router;