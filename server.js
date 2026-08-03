const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/facebook-publisher', async (req, res) => {
  try {
    const { pageId, accessToken, message, link, ctaType, ctaTitle } = req.body;

    if (!pageId || !accessToken) {
      return res.status(400).json({ success: false, error: 'Missing Page ID or Access Token' });
    }

    let formattedLink = link ? link.trim() : '';
    if (formattedLink && !formattedLink.startsWith('http://') && !formattedLink.startsWith('https://')) {
      formattedLink = 'https://' + formattedLink;
    }

    // Step 1: Create an unpublished page post (Ad Creative style) with CTA and Link
    const endpoint = `https://graph.facebook.com/v19.0/${pageId}/feed`;
    
    const params = new URLSearchParams({
      access_token: accessToken,
      message: message || '',
    });

    if (formattedLink) {
      params.append('link', formattedLink);
    }

    // Add Call to Action parameters if selected
    if (ctaType && ctaType !== 'NO_BUTTON') {
      const callToActionData = {
        type: ctaType, // e.g., "SHOP_NOW", "LEARN_MORE"
        value: {
          link: formattedLink || 'https://www.facebook.com'
        }
      };
      if (ctaTitle) {
        callToActionData.value.link_caption = ctaTitle;
      }
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