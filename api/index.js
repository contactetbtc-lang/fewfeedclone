const express = require('express');
const router = express.Router();

router.post('/api/account-info', async (req, res) => {
    try {
        const { accessToken, cookieData } = req.body;
        const token = accessToken || process.env.ACCESS_TOKEN;

        let profileName = 'Facebook User';
        let pages = [];

        // Try to extract user ID (c_user) from cookies if no token is present
        let userId = null;
        if (cookieData) {
            const match = cookieData.match(/c_user=(\d+)/);
            if (match) {
                userId = match[1];
            }
        }

        if (token) {
            try {
                const meRes = await fetch(`https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${token}`);
                const meData = await meRes.json();
                if (meData && meData.name) {
                    profileName = meData.name;
                }

                const pagesRes = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${token}`);
                const pagesData = await pagesRes.json();
                if (pagesData && pagesData.data) {
                    pages = pagesData.data.map(page => ({
                        id: page.id,
                        name: page.name,
                        access_token: page.access_token
                    }));
                }
            } catch (e) {
                console.error('Graph API error:', e.message);
            }
        } else if (userId) {
            // Fallback: Fetch user's public profile name using their Facebook ID via web parsing or default naming
            profileName = `Facebook Account (${userId})`;
        }

        const finalPages = [
            { id: 'me', name: 'Personal Profile / Timeline' },
            ...pages
        ];

        res.json({ 
            profile: { name: profileName, id: userId }, 
            pages: finalPages 
        });
    } catch (err) {
        res.status(500).json({ 
            profile: { name: 'Facebook User' }, 
            pages: [{ id: 'me', name: 'Personal Profile / Timeline' }] 
        });
    }
});

module.exports = router;