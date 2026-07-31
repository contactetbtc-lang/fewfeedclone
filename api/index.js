import express from 'express';
import cors from 'cors';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { FacebookPublisher } from '../facebook-publisher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

// Set up temporary upload directory for Vercel
const uploadDir = '/tmp/uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({ dest: uploadDir });

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
        res.setHeader('Connection', 'keep-alive');

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

        if (!req.file) {
            res.write('❌ No image file was uploaded\n');
            return res.end();
        }

        if (!accessToken || !cookieData || !linkUrl || !linkName || !pageId) {
            res.write('❌ Missing required fields\n');
            return res.end();
        }

        const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        res.write(`✅ Image prepared: ${imageUrl}\n`);

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

        const result = await publisher.publishToFacebook(
            imageUrl,
            linkUrl,
            linkName,
            caption,
            description,
            callToActionType
        );

        res.write(`\n🎉 Success! Post published: ${result.url}\n`);
    } catch (error) {
        res.write(`\n💥 Publishing failed: ${error.message}\n`);
    } finally {
        console.log = originalLog;
        console.error = originalError;

        if (req.file && fs.existsSync(req.file.path)) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (err) {}
        }
        res.end();
    }
});

export default app;