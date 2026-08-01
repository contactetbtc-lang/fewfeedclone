const express = require('express');
const router = express.Router();
const { FacebookPublisher } = require('./facebook-publisher');

router.post('/api/account-info', async (req, res) => {
    try {
        const { accessToken, cookieData } = req.body;
        const token = accessToken || process.env.ACCESS_TOKEN;
        const cookie = cookieData || process.env.COOKIE_DATA;

        let pages = [];
        let profileName = 'Facebook User';

        if (token) {
            try {
                // Fetch user profile
                const meRes = await fetch(`https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${token}`);
                const meData = await meRes.json();
                if (meData && meData.name) profileName = meData.name;

                // Fetch managed pages with page access tokens
                const pagesRes = await fetch(`https://graph.facebook.0/v18.0/me/accounts?access_token=${token}`);
                const pagesData = await pagesRes.json();
                
                if (pagesData && pagesData.data) {
                    pages = pagesData.data.map(p => ({
                        id: p.id,
                        name: p.name,
                        access_token: p.access_token
                    }));
                }
            } catch (e) {
                console.error('Graph API fetch error:', e.message);
            }
        }

        // Always ensure Personal Profile is an option, but include real pages if found
        const finalPages = [
            { id: 'me', name: 'Personal Profile / Timeline' },
            ...pages
        ];

        res.json({ 
            profile: { name: profileName }, 
            pages: finalPages 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;