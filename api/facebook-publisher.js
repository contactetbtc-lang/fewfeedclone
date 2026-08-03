module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = {};
    }
  }

  const { pageId, accessToken, message, link } = body || {};

  if (!pageId || !accessToken) {
    return res.status(400).json({ success: false, error: 'Missing Page ID or Access Token' });
  }

  try {
    const params = new URLSearchParams({
      access_token: accessToken,
      message: message || '',
    });

    if (link) {
      params.append('link', link);
    }

    const fbRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    const text = await fbRes.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return res.status(500).json({ success: false, error: 'Facebook returned non-JSON response: ' + text });
    }

    if (fbRes.ok && data.id) {
      return res.status(200).json({ success: true, postId: data.id });
    } else {
      return res.status(400).json({ success: false, error: data.error?.message || 'Facebook API error' });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};