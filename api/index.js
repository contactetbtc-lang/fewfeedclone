const express = require('express');
const router = express.Router();

router.post('/api/account-info', async (req, res) => {
    try {
        const { accessToken, cookieData } = req.body;
        const token = accessToken || process.env.ACCESS_TOKEN;

        let pages = [];
        let profileName = 'Facebook User';

        if (token) {
            try {
                // Fetch the user's main profile name
                const meRes = await fetch(`https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${token}`);
                const meData = await meRes.json();
                if (meData && meData.name) {
                    profileName = meData.name;
                }

                // Fetch the pages managed by this user account
                const pagesRes = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${token}`);
                const pagesData = await pagesRes.json();
                
                if (pagesData && pagesData.data) {
                    pages = pagesData.data.map(page => ({
                        id: page.id,
                        name: page.name,
                        access_token: page.access_token
                    }));
                }
            } catch (apiErr) {
                console.error('Error querying Facebook Graph API:', apiErr.message);
            }
        }

        // Combine Personal Profile option with any fetched managed pages
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
            profile: { name: 'Facebook User' }, 
            pages: [{ id: 'me', name: 'Personal Profile / Timeline' }] 
        });
    }
});

module.exports = router;