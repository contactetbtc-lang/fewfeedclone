const multer = require('multer');
const fetch = require('node-fetch');

// Configure Multer for Vercel serverless memory handling
const upload = multer({ storage: multer.memoryStorage() });

// Helper function to run Multer middleware in Vercel Serverless
function runMiddleware(req, res, fn) {
    return new Promise((resolve, reject) => {
        fn(req, res, (result) => {
            if (result instanceof Error) {
                return reject(result);
            }
            return resolve(result);
        });
    });
}

// Vercel Serverless Default Handler
module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    // Set streaming headers
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    res.write('🔄 Server received publish request...\n');

    try {
        // Run multer to parse form-data body
        await runMiddleware(req, res, upload.single('imageFile'));

        const {
            pageId,
            accessToken,
            linkUrl,
            linkName,
            caption,         // Post Message / Text
            displayLink,     // Show display link (Basic +)
            description,     // Link Description
            callToActionType
        } = req.body || {};

        if (!pageId || !accessToken) {
            res.write('💥 Error: Missing required Page ID or Access Token.\n');
            return res.end();
        }

        // 1. Prepare base payload parameters for Facebook Graph API
        const params = new URLSearchParams();
        params.append('access_token', accessToken);

        if (linkUrl) params.append('link', linkUrl);
        if (caption) params.append('message', caption);
        if (linkName) params.append('name', linkName);
        if (displayLink) params.append('caption', displayLink); // 'Show display link' maps to FB 'caption'
        if (description) params.append('description', description);

        // 2. Safely attach Call-To-Action ONLY if selected and NOT "NO_BUTTON"
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

        // 3. Send Request to Facebook Graph API
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
};

// Disable Vercel's default bodyParser so Multer can parse multipart form-data
module.exports.config = {
    api: {
        bodyParser: false,
    },
};