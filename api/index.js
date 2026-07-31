import express from 'express';
import cors from 'cors';
import multer from 'multer';


const app = express();
import { FacebookPublisher } from './facebook-publisher.js';
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serverless environments require Memory Storage for Multer
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Endpoint to provide default values
app.get('/api/defaults', (req, res) => {
    res.json({
        accessToken: process.env.ACCESS_TOKEN || '',
        accessToken2: process.env.ACCESS_TOKEN2 || '',
        cookieData: process.env.COOKIE_DATA || '',
        adAccountId: process.env.AD_ACCOUNT_ID || '',
        pageId: process.env.PAGE_ID || '',
        caption: process.env.CAPTION || '',
        description: process.env.DESCRIPTION || '',
        linkUrl: process.env.LINK_URL || '',
        linkName: process.env.LINK_NAME || '',
        callToActionType: process.env.CTA_BUTTON || 'LEARN_MORE'
    });
});

// Sync tokens endpoint
app.post('/api/update-tokens', (req, res) => {
    try {
        const { accessToken, cookieData } = req.body;
        if (!accessToken || !cookieData) {
            return res.status(400).json({ error: 'Missing required accessToken or cookieData' });
        }

        process.env.ACCESS_TOKEN = accessToken;
        process.env.ACCESS_TOKEN2 = accessToken;
        process.env.COOKIE_DATA = cookieData;

        res.json({ success: true, message: 'Tokens updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Account info endpoint
app.post('/api/account-info', async (req, res) => {
    try {
        const { accessToken, cookieData } = req.body;
        if (!accessToken) {
            return res.status(400).json({ error: 'Access token is required' });
        }

        const publisher = new FacebookPublisher({ accessToken, cookieData });
        const [profile, pages] = await Promise.all([
            publisher.getUserProfile().catch(() => null),
            publisher.getUserPages().catch(() => [])
        ]);

        res.json({ profile, pages });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Publishing Endpoint
app.post('/publish', upload.single('imageFile'), async (req, res) => {
    const originalLog = console.log;
    const originalError = console.error;

    try {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');

        res.write('🔄 Server received publish request...\n');

        const {
            accessToken,
            accessToken2,
            cookieData,
            linkUrl,
            linkName,
            adAccountId,
            pageId,
            caption,
            description,
            callToActionType
        } = req.body;

        if (!accessToken || !cookieData || !linkUrl || !linkName || !pageId) {
            res.write('❌ Missing required text fields\n');
            return res.end();
        }

        console.log = (...args) => {
            res.write(args.join(' ') + '\n');
            originalLog(...args);
        };
        console.error = (...args) => {
            res.write('❌ ' + args.join(' ') + '\n');
            originalError(...args);
        };

        const publisher = new FacebookPublisher({
            accessToken,
            accessToken2,
            cookieData,
            adAccountId,
            pageId
        });

        // Pass file buffer directly if available
        const imageBuffer = req.file ? req.file.buffer : null;

        const result = await publisher.publishToFacebook(
            imageBuffer,
            linkUrl,
            linkName,
            caption,
            description,
            callToActionType
        );

        res.write(`\n🎉 Success! Post published: ${result.url || 'Done'}\n`);
    } catch (error) {
        res.write(`\n💥 Publishing failed: ${error.message}\n`);
    } finally {
        console.log = originalLog;
        console.error = originalError;
        res.end();
    }
});

// Export default Express handler for Vercel
export default app;