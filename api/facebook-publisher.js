const multer = require('multer');

// Configure Multer in memory for form parsing
const upload = multer({ storage: multer.memoryStorage() });

module.exports = async function handler(req, res) {
    // Enable CORS and streaming text response
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    res.write('🔄 Server received publish request...\n');

    upload.single('imageFile')(req, res, async (err) => {
        if (err) {
            res.write(`💥 Form Parsing Error: ${err.message}\n`);
            return res.end();
        }

        try {
            const {
                pageId,
                accessToken,
                accessToken2,    // Optional fallback token from credentials panel
                linkUrl,
                linkName,
                caption,         // Post Message / Text
                displayLink,     // Show display link (Basic +)
                description,     // Link Description
                callToActionType
            } = req.body || {};

            let primaryToken = accessToken || accessToken2;

            if (!pageId || !primaryToken) {
                res.write('💥 Error: Missing required Page ID or Access Token.\n');
                return res.end();
            }

            let activeToken = primaryToken;

            // 1. Attempt to resolve specific Page Access Token if a User Token was provided
            res.write(`🔍 Resolving Page Access Token for Page ID: ${pageId}...\n`);
            try {
                const accountsRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${primaryToken}`);
                const accountsData = await accountsRes.json();

                if (accountsData.error) {
                    res.write(`⚠️ Token Check Failed: ${accountsData.error.message}\n`);
                    res.write(`👉 Your token is expired or invalid. Please extract a fresh token.\n`);
                } else if (accountsData.data && Array.isArray(accountsData.data)) {
                    const matchedPage = accountsData.data.find(p => p.id === pageId);
                    if (matchedPage && matchedPage.access_token) {
                        activeToken = matchedPage.access_token;
                        res.write(`🔑 Successfully retrieved Page Access Token!\n`);
                    } else {
                        res.write(`⚠️ Page ID not found under user accounts. Attempting direct request with primary token...\n`);
                    }
                }
            } catch (tokenErr) {
                res.write(`⚠️ Token resolution fallback used: ${tokenErr.message}\n`);
            }

            // 2. Construct Facebook API Parameters
            const params = new URLSearchParams();
            params.append('access_token', activeToken);

            if (linkUrl) params.append('link', linkUrl);
            if (caption) params.append('message', caption);
            if (linkName) params.append('name', linkName);
            if (displayLink) params.append('caption', displayLink); // Maps 'Show display link' to FB 'caption'
            if (description) params.append('description', description);

            // 3. Attach Call-To-Action ONLY if selected and NOT "NO_BUTTON"
            if (callToActionType && callToActionType !== 'NO_BUTTON') {
                const ctaObject = {
                    type: callToActionType,
                    value: {
                        link: linkUrl
                    }
                };
                params.append('call_to_action', JSON.stringify(ctaObject));
            }

            res.write(`📡 Connecting to Facebook Page ID: ${pageId}...\n`);

            // 4. Send payload to Facebook
            const fbResponse = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
                method: 'POST',
                body: params
            });

            const fbData = await fbResponse.json();

            if (fbData.error) {
                res.write(`💥 Facebook API Error: ${fbData.error.message}\n`);
            } else if (fbData.id) {
                res.write(`✅ Post successfully published! ID: ${fbData.id}\n`);
            } else {
                res.write(`⚠️ Unexpected response: ${JSON.stringify(fbData)}\n`);
            }

        } catch (error) {
            res.write(`💥 Publishing failed: ${error.message}\n`);
        } finally {
            res.end();
        }
    });
};