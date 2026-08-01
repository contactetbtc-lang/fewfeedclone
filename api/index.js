import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { FacebookPublisher } from './facebook-publisher.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets from public directory
app.use(express.static(path.join(process.cwd(), 'public')));

// Configure memory storage for Multer (compatible with Vercel)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Serve frontend UI
app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Default values endpoint
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

// Main Facebook publishing endpoint
app.post('/publish', upload.single('imageFile'), async (req, res) => {
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
            res.write('❌ Missing required input fields (Page ID, Access Token, Cookie Data, Link URL, or Title)\n');
            return res.end();
        }

        const publisher = new FacebookPublisher({
            accessToken,
            accessToken2,
            cookieData,
            adAccountId,
            pageId
        });

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
        res.end();
    }
});

export default app;