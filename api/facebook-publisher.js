// api/facebook-publisher.js
module.exports = async function facebookPublisher(req, res) {
  try {
    const { pageId, accessToken, cookieData, caption, cardTitle, websiteUrl } = req.body || {};

    // Basic Validation
    if (!accessToken) {
      return res.status(400).json({ error: 'Missing Access Token.' });
    }

    const targetId = (pageId && pageId !== 'me') ? pageId : 'me';

    // Post to Facebook Graph API
    const fbResponse = await fetch(`https://graph.facebook.com/v18.0/${targetId}/feed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookieData ? { 'Cookie': cookieData } : {})
      },
      body: JSON.stringify({
        message: caption || '',
        link: websiteUrl || undefined,
        access_token: accessToken
      })
    });

    const fbData = await fbResponse.json();

    if (fbData.error) {
      return res.status(400).json({ error: fbData.error.message || 'Facebook API Error' });
    }

    return res.status(200).json({ success: true, result: fbData });

  } catch (error) {
    console.error('Publishing Error:', error);
    return res.status(500).json({ error: error.message || 'Server execution failed' });
  }
};