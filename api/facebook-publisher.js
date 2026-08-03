module.exports = async (req, res) => {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { pageId, accessToken, message, link } = req.body;

    if (!pageId || !accessToken) {
        return res.status(400).json({ error: 'Missing pageId or accessToken' });
    }

    try {
        // 1. Exchange User Access Token (EAAB...) for the Page-Specific Token
        const accountsRes = await fetch(
            `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`
        );
        const accountsData = await accountsRes.json();

        let pageAccessToken = accessToken;
        if (accountsData?.data) {
            const matchedPage = accountsData.data.find(p => p.id === pageId);
            if (matchedPage?.access_token) {
                pageAccessToken = matchedPage.access_token;
            }
        }

        // 2. Prepare payload to publish to the Facebook Page feed
        const postParams = new URLSearchParams({
            access_token: pageAccessToken,
            message: message || ''
        });

        if (link && link.trim() !== '') {
            postParams.append('link', link);
        }

        // 3. Post to Facebook Graph API
        const fbResponse = await fetch(`https://graph.facebook.com/v18.0/${pageId}/feed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: postParams
        });

        const fbData = await fbResponse.json();

        if (fbData.error) {
            return res.status(400).json({ 
                error: fbData.error.message || "Invalid request.", 
                fb_error_code: fbData.error.code || 1 
            });
        }

        return res.status(200).json({ success: true, postId: fbData.id });

    } catch (err) {
        return res.status(500).json({ error: err.message, fb_error_code: 1 });
    }
};