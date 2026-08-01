class FacebookPublisher {
    constructor({ accessToken, cookieData }) {
        this.accessToken = accessToken;
        this.cookieData = cookieData;
    }

    async getUserProfile() {
        // If we have an access token, try graph API first
        if (this.accessToken) {
            try {
                const res = await fetch(`https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${this.accessToken}`);
                const data = await res.json();
                if (data && data.name) return { id: data.id, name: data.name };
            } catch (e) {}
        }

        // Fallback using cookie data if available
        if (this.cookieData) {
            try {
                const res = await fetch('https://www.facebook.com/adsmanager/manage/', {
                    headers: { 'cookie': this.cookieData }
                });
                const html = await res.text();
                // Try to extract user name or profile info from html meta/scripts if token fails
                const matchName = html.match(/"NAME":"([^"]+)"/);
                if (matchName) {
                    return { name: JSON.parse(`"${matchName[1]}"`) };
                }
            } catch (e) {}
        }

        return { name: 'Facebook User' };
    }

    async getUserPages() {
        let token = this.accessToken;

        // If token is missing, attempt to scrape or derive it using cookieData
        if (!token && this.cookieData) {
            try {
                const res = await fetch('https://www.facebook.com/adsmanager/manage/', {
                    headers: { 'cookie': this.cookieData }
                });
                const html = await res.text();
                const match = html.match(/(EAAB[A-Za-z0-9]+)/) || html.match(/(EAA[A-Za-z0-9]+)/);
                if (match) token = match[1];
            } catch (e) {}
        }

        if (!token) {
            throw new Error('Access token could not be found or generated from cookies.');
        }

        const res = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${token}`);
        const data = await res.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        return data.data || [];
    }

    async publishPost({ pageId, caption, linkName, linkUrl, callToActionType, imageFile }) {
        let token = this.accessToken;
        
        // Fetch page-specific token if needed
        const pages = await this.getUserPages();
        const targetPage = pages.find(p => p.id === pageId);
        
        if (targetPage && targetPage.access_token) {
            token = targetPage.access_token;
        }

        const formData = new URLSearchParams();
        formData.append('message', caption || '');
        if (linkUrl) formData.append('link', linkUrl);
        if (linkName) formData.append('name', linkName);
        if (callToActionType) formData.append('call_to_action', JSON.stringify({ type: callToActionType, value: { link: linkUrl } }));
        formData.append('access_token', token);

        const res = await fetch(`https://graph.facebook.com/v18.0/${pageId}/feed`, {
            method: 'POST',
            body: formData
        });

        const result = await res.json();
        if (result.error) {
            throw new Error(result.error.message);
        }

        return result;
    }
}

module.exports = { FacebookPublisher };