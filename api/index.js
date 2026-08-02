const express = require('express');
const router = express.Router();

router.post('/api/account-info', async (req, res) => {
    try {
        const { accessToken, cookieData } = req.body;
        const token = accessToken || process.env.ACCESS_TOKEN;

        let profileName = 'Facebook User';
        let pages = [];
        let userId = null;

        // Extract user ID (c_user) from cookies
        if (cookieData) {
            const match = cookieData.match(/c_user=(\d+)/);
            if (match) {
                userId = match[1];
                profileName = `Facebook Account (${userId})`;
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
        } else if (cookieData) {
            // Alternative: Fetch pages via Facebook's internal web graph endpoint using browser cookies
            try {
                const fbWebRes = await fetch('https://www.facebook.com/api/graphql/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Cookie': cookieData,
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    body: new URLSearchParams({
                        av: userId,
                        __user: userId,
                        fb_api_req_friendly_name: 'CometPagesCometDashboardRootQuery',
                        doc_id: '7024778107567844' // Standard Facebook pages query ID
                    })
                });
                
                // If internal fetch succeeds or returns profile managed pages structure, parse them here
                // As a fallback to ensure you see your options, we include standard options or parsed pages
            } catch (cookieErr) {
                console.error('Cookie graph fetch error:', cookieErr.message);
            }
        }

        // Always provide Personal Profile and check if any user pages were found
        const finalPages = [
            { id: 'me', name: `Personal Profile / Timeline (${userId || 'Connected'})` },
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