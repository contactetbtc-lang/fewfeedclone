// api/facebook-publisher.js
module.exports = async function facebookPublisher(req, res) {
  try {
    const body = req.body || {};
    const files = req.files || [];

    const accessToken = body.accessToken || body.access_token || body.token || body.accessTokenInput;
    const cookieData = body.cookieData || body.cookie_data || body.cookies;
    const pageId = body.pageId || body.page_id || body.selectedPage;
    const caption = body.caption || body.message || '';
    const websiteUrl = body.websiteUrl || body.website_url || body.link || '';

    if (!accessToken) {
      return res.status(400).json({ error: 'Missing Access Token.' });
    }

    if (!pageId || pageId === 'me') {
      return res.status(400).json({ 
        error: 'Please select a specific Facebook Page from the dropdown list.' 
      });
    }

    // Direct Image Upload (Using extracted token directly)
    if (files && files.length > 0) {
      const imageFile = files[0];
      const formData = new FormData();
      
      const blob = new Blob([imageFile.buffer], { type: imageFile.mimetype });
      formData.append('source', blob, imageFile.originalname);
      formData.append('message', caption);
      formData.append('access_token', accessToken);

      const fbResponse = await fetch(`https://graph.facebook.com/v18.0/${pageId}/photos`, {
        method: 'POST',
        headers: cookieData ? { 'Cookie': cookieData } : {},
        body: formData
      });

      const fbData = await fbResponse.json();

      if (fbData.error) {
        return res.status(400).json({ error: fbData.error.message || 'Facebook Photo Upload Error' });
      }

      return res.status(200).json({ success: true, result: fbData });
    }

    // Direct Text / Link Post (Using extracted token directly)
    const fbResponse = await fetch(`https://graph.facebook.com/v18.0/${pageId}/feed`, {
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