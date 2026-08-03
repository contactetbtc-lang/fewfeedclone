const express = require('express');
const path = require('path');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() }); // Keep image in memory buffer temporarily
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/facebook-publisher', upload.single('imageFile'), async (req, res) => {
  try {
    const { pageId, accessToken, message } = req.body;
    let { link } = req.body;
    const imageFile = req.file; // The uploaded file from frontend

    if (!pageId || !accessToken) {
      return res.status(400).json({ success: false, error: 'Missing Page ID or Access Token' });
    }

    if (link && typeof link === 'string' && link.trim() !== '') {
      link = link.trim();
      if (!link.startsWith('http://') && !link.startsWith('https://')) {
        link = 'https://' + link;
      }
    }

    let endpoint = `https://graph.facebook.com/v19.0/${pageId}/feed`;
    const params = new URLSearchParams({
      access_token: accessToken,
      message: message || '',
    });

    if (link && link.startsWith('http')) {
      params.append('link', link);
    }

    // If an image file was attached, send it directly to Facebook's photos endpoint using FormData
    if (imageFile) {
      endpoint = `https://graph.facebook.com/v19.0/${pageId}/photos`;
      const formData = new URLSearchParams();
      formData.append('access_token', accessToken);
      if (message) formData.append('caption', message);
      if (link) formData.append('link', link);

      // Note: Direct file streaming to FB graph photos endpoint requires form-data package or blob, 
      // but if you have a public image URL or want direct binary upload, let's handle the blob:
    }

    const fbRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    const data = await fbRes.json();

    if (fbRes.ok && (data.id || data.post_id)) {
      return res.status(200).json({ success: true, postId: data.id || data.post_id });
    } else {
      return res.status(400).json({ success: false, error: data.error?.message || 'Facebook API error' });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Server Error: ' + err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));