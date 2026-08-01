import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { FacebookPublisher } from './facebook-publisher.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(process.cwd(), 'public')));

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

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

app.post('/api/account-info', async (req, res) => {
    try {
        const { accessToken, cookieData } = req.body;
        const token = accessToken || process.env.ACCESS_TOKEN;
        const cookie = cookieData || process.env.COOKIE_DATA;

        if (!token) {
            return res.status(400).json({ error: 'Access token is required' });
        }

        const publisher = new FacebookPublisher({ accessToken: token, cookieData: cookie });
        const [profile, pages] = await Promise.all([
            publisher.getUserProfile().catch(() => null),
            publisher.getUserPages().catch(() => [])
        ]);

        res.json({ profile, pages });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/publish', upload.single('imageFile'), async (req, res) => {
    try {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');

        res.write('🔄 Server received publish request...\n');

        const accessToken = req.body.accessToken || process.env.ACCESS_TOKEN;
        const cookieData = req.body.cookieData || process.env.COOKIE_DATA;
        const pageId = req.body.pageId || process.env.PAGE_ID;

        const {
            accessToken2,
            linkUrl,
            linkName,
            adAccountId,
            caption,
            description,
            callToActionType
        } = req.body;

        if (!accessToken || !cookieData || !linkUrl || !linkName || !pageId) {
            res.write('❌ Missing required fields (Page ID, Access Token, or Link details)\n');
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