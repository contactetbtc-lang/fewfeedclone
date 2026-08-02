// api/facebook-publisher.js
module.exports = async function facebookPublisher(req, res) {
  try {
    const body = req.body || {};
    const files = req.files || [];

    const userAccessToken = body.accessToken || body.access_token || body.token || body.accessTokenInput;
    const cookieData = body.cookieData || body.cookie_data || body.cookies;
    const pageId = body.pageId || body.page_id || body.selectedPage;
    const caption = body.caption || body.message || '';
    const websiteUrl = body.websiteUrl || body.website_url || body.link || '';

    if (!userAccessToken) {
      return res.status(400).json({ error: 'Missing Access Token.' });
    }

    if (!pageId || pageId === 'me') {
      return res.status(400).json({ 
        error: 'Facebook does not allow automated posting to Personal Timelines. Please select a Facebook Page from the dropdown.' 
      });
    }

    // Step 1: Obtain the specific Page Access Token
    let pageAccessToken = userAccessToken;
    try {
      const pageRes = await fetch(`https://graph.facebook.com/v18.0/${pageId}?fields=access_token&access_token=${userAccessToken}`);
      const pageData = await pageRes.json();
      if (pageData.access_token) {
        pageAccessToken = pageData.access_token;
      }
    } catch (e) {
      console.log('Using default token fallback');
    }

    // Step 2: Post Image or Link/Text using Page Access Token
    if (files && files.length > 0) {
      const imageFile = files[0];
      const formData = new FormData();
      
      const blob = new Blob([imageFile.buffer], { type: imageFile.mimetype });
      formData.append('source', blob, imageFile.originalname);
      formData.append('message', caption);
      formData.append('access_token', pageAccessToken);

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

    // Standard Link/Text Post
    const fbResponse = await fetch(`https://graph.facebook.com/v18.0/${pageId}/feed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookieData ? { 'Cookie': cookieData } : {})
      },
      body: JSON.stringify({
        message: caption,
        link: websiteUrl || undefined,
        access_token: pageAccessToken
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