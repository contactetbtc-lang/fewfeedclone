module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json");

  // Allow CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  try {
    let body = req.body;

    if (typeof body === "string") {
      body = JSON.parse(body);
    }

    const accessToken = body.accessToken;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: "Missing access token"
      });
    }

    // -----------------------
    // Get current Facebook user
    // -----------------------

    const userRes = await fetch(
      `https://graph.facebook.com/v19.0/me?fields=id,name,picture.width(200).height(200)&access_token=${accessToken}`
    );

    const user = await userRes.json();

    // -----------------------
    // Get Facebook Pages
    // -----------------------

    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,picture&limit=200&access_token=${accessToken}`
    );

    const pagesJson = await pagesRes.json();

    // -----------------------
    // Get Ad Accounts
    // -----------------------

    const adsRes = await fetch(
      `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,account_id,name&limit=200&access_token=${accessToken}`
    );

    const adsJson = await adsRes.json();

    return res.status(200).json({
      success: true,
      user: user,
      pages: pagesJson.data || [],
      adAccounts: adsJson.data || []
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};