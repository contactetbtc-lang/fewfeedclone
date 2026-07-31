export class FacebookPublisher {
    constructor(config = {}) {
        this.accessToken = config.accessToken || '';
        this.accessToken2 = config.accessToken2 || '';
        this.cookieData = config.cookieData || '';
        this.adAccountId = config.adAccountId || '';
        this.pageId = config.pageId || '';
    }

    /**
     * Fetch user profile data from Graph API
     */
    async getUserProfile() {
        if (!this.accessToken) {
            throw new Error('Access token required for profile lookup.');
        }

        const url = `https://graph.facebook.com/v19.0/me?access_token=${this.accessToken}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        return data;
    }

    /**
     * Fetch pages managed by the user
     */
    async getUserPages() {
        if (!this.accessToken) {
            throw new Error('Access token required for pages lookup.');
        }

        const url = `https://graph.facebook.com/v19.0/me/accounts?access_token=${this.accessToken}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        return data.data || [];
    }

    /**
     * Publish a post with link and optional image/text payload
     */
    async publishToFacebook(imageBuffer, linkUrl, linkName, caption, description, callToActionType) {
        if (!this.accessToken || !this.pageId) {
            throw new Error('Access Token and Page ID are required to publish.');
        }

        // Endpoint for Page Posts
        const url = `https://graph.facebook.com/v19.0/${this.pageId}/feed`;

        const payload = {
            access_token: this.accessToken,
            link: linkUrl,
            message: caption || '',
            name: linkName || '',
            description: description || ''
        };

        if (callToActionType) {
            payload.call_to_action = JSON.stringify({
                type: callToActionType,
                value: { link: linkUrl }
            });
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        return {
            id: data.id,
            url: `https://facebook.com/${data.id}`
        };
    }
}