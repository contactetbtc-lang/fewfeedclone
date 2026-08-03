const express = require('express');
const path = require('path');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/facebook-accounts', async (req, res) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) return res.status(400).json({ error: 'Missing access token' });

    let userData = { name: 'Active Facebook User', id: 'Connected Token' };
    try {
      const userRes = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name,picture&access_token=${accessToken}`);
      const userJson = await userRes.json();
      if (!userJson.error) userData = userJson;
    } catch (e) {}

    // Fetch pages (Each page returns its own long-lived Page Access Token)
    let pages = [];
    try {
      const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${accessToken}`);
      const pagesData = await pagesRes.json();
      pages = pagesData.data || [];
    } catch (e) {}

    // Fetch ad accounts
    let adAccounts = [];
    try {
      const adAccountsRes = await fetch(`https://graph.facebook.com/v19.0/me/adaccounts?fields=account_id,name&access_token=${accessToken}`);
      const adAccountsData = await adAccountsRes.json();
      adAccounts = adAccountsData.data || [];
    } catch (e) {}

    if (adAccounts.length === 0) {
      adAccounts.push({ account_id: userData.id || 'personal', name: 'Personal Account / Default' });
    }

    res.json({ success: true, user: userData, pages, adAccounts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/facebook-publisher', upload.single('imageFile'), async (req, res) => {
  try {
    const { pageId, accessToken, message, link, ctaType, cardTitle, displayLink, displayDescription } = req.body;
    if (!pageId || !accessToken) {
      return res.status(400).json({ success: false, error: 'Missing Page ID or Access Token' });
    }

    // Step 1: Fetch the specific Page Access Token for this page so posting never fails with permission errors
    let activeToken = accessToken;
    try {
      const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${accessToken}`);
      const pagesData = await pagesRes.json();
      if (pagesData.data) {
        const targetPage = pagesData.data.find(p => p.id === pageId);
        if (targetPage && targetPage.access_token) {
          activeToken = targetPage.access_token;
        }
      }
    } catch (e) {}

    let formattedLink = link ? link.trim() : '';
    if (formattedLink && !formattedLink.startsWith('http://') && !formattedLink.startsWith('https://')) {
      formattedLink = 'https://' + formattedLink;
    }

    let endpoint = `https://graph.facebook.com/v19.0/${pageId}/feed`;
    const params = new URLSearchParams({
      access_token: activeToken,
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