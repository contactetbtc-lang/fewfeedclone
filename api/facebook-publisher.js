module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Safely parse request body across different environments
    let body = req.body;
    
    if (!body) {
      return res.status(400).json({ success: false, error: 'Request body is empty' });
    }

    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        body = {};
      }
    }

    const { pageId, accessToken, message, link, imageUrl } = body;

    if (!pageId || !accessToken) {
      return res.status(400).json({ success: false, error: 'Missing Page ID or Access Token' });
    }

    let endpoint = `https://graph.facebook.com/v19.0/${pageId}/feed`;
    const params = new URLSearchParams({
      access_token: accessToken,
      message: message || '',
    });

    if (link && typeof link === 'string' && link.startsWith('http')) {
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

    const text = await fbRes.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return res.status(500).json({ success: false, error: 'Facebook API non-JSON response: ' + text });
    }

    if (fbRes.ok && (data.id || data.post_id)) {
      return res.status(200).json({ success: true, postId: data.id || data.post_id });
    } else {
      return res.status(400).json({ success: false, error: data.error?.message || 'Facebook API error' });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Internal Function Error: ' + err.message });
  }
};