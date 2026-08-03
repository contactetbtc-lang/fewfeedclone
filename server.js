const express = require('express');
const path = require('path');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Helper to parse cookie string for c_user ID
function getCookieValue(cookieString, cookieName) {
  const match = cookieString.match(new RegExp('(^| )' + cookieName + '=([^;]+)'));
  return match ? match[2] : null;
}

// Dynamically fetch actual user profile, pages, and ad accounts based on the provided token & cookie
app.post('/api/facebook-accounts', async (req, res) => {
  try {
    const { accessToken, cookieData } = req.body;
    if (!accessToken) return res.status(400).json({ error: 'Missing access token' });

    // Extract real Facebook user ID from cookie data if available
    const cUserId = cookieData ? getCookieValue(cookieData, 'c_user') : null;

    let userData = { name: 'Connected User', id: cUserId || 'Active User' };

    // 1. Try fetching profile using c_user or standard /me endpoint
    const profileTarget = cUserId ? `https://graph.facebook.com/v19.0/${cUserId}?fields=id,name,picture&access_token=${accessToken}` : `https://graph.facebook.com/v19.0/me?fields=id,name,picture&access_token=${accessToken}`;
    
    const userRes = await fetch(profileTarget);
    const userJson = await userRes.json();
    
    if (!userJson.error) {
      userData = userJson;
    }

    // 2. Fetch pages owned/managed by this user/token
    const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${accessToken}`);
    const pagesData = await pagesRes.json();

    // 3. Fetch real ad accounts
    const adAccountsRes = await fetch(`https://graph.facebook.com/v19.0/me/adaccounts?fields=account_id,name&access_token=${accessToken}`);
    const adAccountsData = await adAccountsRes.json();

    res.json({
      success: true,
      user: userData,
      pages: pagesData.data || [],
      adAccounts: adAccountsData.data || []
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Robust Publishing Endpoint
app.post('/api/facebook-publisher', upload.single('imageFile'), async (req, res) => {
  try {
    const { pageId, accessToken, message, link, ctaType, cardTitle, displayLink, displayDescription } = req.body;
    const imageFile = req.file;

    if (!pageId || !accessToken) {
      return res.status(400).json({ success: false, error: 'Missing Page ID or Access Token' });
    }

    let formattedLink = link ? link.trim() : '';
    if (formattedLink && !formattedLink.startsWith('http://') && !formattedLink.startsWith('https://')) {
      formattedLink = 'https://' + formattedLink;
    }

    let endpoint = `https://graph.facebook.com/v19.0/${pageId}/feed`;
    const params = new URLSearchParams({
      access_token: accessToken,
      message: message || '',
    });

    if (formattedLink) {
      params.append('link', formattedLink);
    }

    if (ctaType && ctaType !== 'No Button' && ctaType !== 'NO_BUTTON') {
      const callToActionData = {
        type: ctaType.toUpperCase().replace(/ /g, '_'),
        value: {
          link: formattedLink || 'https://www.facebook.com',
          link_caption: cardTitle || '',
          link_description: displayDescription || '',
          name: displayLink || ''
        }
      };
      params.append('call_to_action', JSON.stringify(callToActionData));
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