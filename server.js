const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Endpoint for Facebook Publisher
app.post('/api/facebook-publisher', async (req, res) => {
  try {
    const { pageId, accessToken, message, imageUrl } = req.body || {};
    let { link } = req.body || {};

    if (!pageId || !accessToken) {
      return res.status(400).json({ success: false, error: 'Missing Page ID or Access Token' });
    }

    // Automatically fix URL formatting if missing http/https
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

    if (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('http')) {
      endpoint = `https://graph.facebook.com/v19.0/${pageId}/photos`;
      params.append('url', imageUrl);
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