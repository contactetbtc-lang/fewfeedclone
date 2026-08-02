// api/facebook-publisher.js
module.exports = async function facebookPublisher(req, res) {
  try {
    const body = req.body || {};

    // Extract access token regardless of parameter casing
    const accessToken = body.accessToken || body.access_token || body.token || body.accessTokenInput;
    const cookieData = body.cookieData || body.cookie_data || body.cookies;
    const pageId = body.pageId || body.page_id || body.selectedPage;
    const caption = body.caption || body.message || '';
    const websiteUrl = body.websiteUrl || body.website_url || body.link || '';

    // Log received keys for debugging
    console.log("Received Body Keys:", Object.keys(body));

    if (!accessToken) {
      return res.status(400).json({ 
        error: 'Missing Access Token.',
        receivedKeys: Object.keys(body)
      });
    }

    const targetId = (pageId && pageId !== 'me') ? pageId : 'me';

    // Request to Facebook Graph API
    const fbResponse = await fetch(`https://graph.facebook.com/v18.0/${targetId}/feed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookieData ? { 'Cookie': cookieData } : {})
      },
      body: JSON.stringify({
        message: caption,
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