const multer = require('multer');

// Configure Multer for memory-only storage in serverless environments
const upload = multer({ storage: multer.memoryStorage() });

// Helper to run middleware in serverless environment
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

module.exports = async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method Not Allowed' });
        return;
    }

    // Set chunked streaming headers for live log console
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    res.write('🔄 Server received publish request...\n');

    try {
        // Parse multipart/form-data
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

        // 1. Construct Facebook API Parameters
        const params = new URLSearchParams();
        params.append('access_token', accessToken);

        if (linkUrl) params.append('link', linkUrl);
        if (caption) params.append('message', caption);
        if (linkName) params.append('name', linkName);
        if (displayLink) params.append('caption', displayLink); // 'Show display link' maps to FB 'caption'
        if (description) params.append('description', description);

        // 2. Attach Call-To-Action ONLY if not "NO_BUTTON"
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

        // 3. Send payload to Facebook using native global fetch
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

// Disable standard bodyParser to let Multer handle file uploads
module.exports.config = {
    api: {
        bodyParser: false,
    },
};