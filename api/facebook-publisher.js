// api/facebook-publisher.js
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const { 
      pageId, 
      accessToken, 
      message, 
      link, 
      title, 
      callToAction, 
      imageUrl 
    } = req.body;

    // 1. Validation Checks
    if (!accessToken) {
      return res.status(400).json({ error: 'Missing Access Token. Please sync with the extension.' });
    }

    if (!pageId) {
      return res.status(400).json({ error: 'Please select a Facebook Page from the dropdown.' });
    }

    // 2. Block Personal Profile IDs
    if (pageId === 'me' || pageId.startsWith('615905')) { 
      return res.status(400).json({ 
        error: 'Personal Profile posting is deprecated by Facebook. You must select a Facebook Page ID to publish.' 
      });
    }

    // 3. Dynamically target the selected Facebook Page Endpoint
    const GRAPH_API_URL = `https://graph.facebook.com/v18.0/${pageId}/feed`;

    // 4. Construct Payload
    const payload = {
      message: message || '',
      access_token: accessToken,
    };

    if (link) {
      payload.link = link;
    }

    if (title) {
      payload.name = title;
    }

    if (imageUrl) {
      payload.picture = imageUrl;
    }

    if (callToAction && link) {
      payload.call_to_action = {
        type: callToAction.toUpperCase(),
        value: { link: link }
      };
    }

    // 5. Send POST request to Meta Graph API
    const fbResponse = await fetch(GRAPH_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await fbResponse.json();

    if (data.error) {
      console.error('Meta API Error:', data.error);
      return res.status(400).json({ 
        error: data.error.message || 'Failed to publish to Facebook Page.',
        fb_error_code: data.error.code 
      });
    }

    return res.status(200).json({
      success: true,
      id: data.id,
      message: 'Post successfully published to Facebook Page!'
    });

  } catch (error) {
    console.error('Server Publishing Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}