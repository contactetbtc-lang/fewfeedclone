class FacebookPublisher {
    constructor({ accessToken, cookieData }) {
        this.accessToken = accessToken;
        this.cookieData = cookieData;
    }

    async getUserProfile() {
        if (this.accessToken) {
            try {
                const res = await fetch(`https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${this.accessToken}`);
                const data = await res.json();
                if (data && data.name) return { id: data.id, name: data.name };
            } catch (e) {}
        }

        if (this.cookieData) {
            try {
                const res = await fetch('https://www.facebook.com/adsmanager/manage/', {
                    headers: { 'cookie': this.cookieData }
                });
                const html = await res.text();
                const matchName = html.match(/"NAME":"([^"]+)"/);
                if (matchName) {
                    return { name: JSON.parse(`"${matchName[1]}"`) };
                }
            } catch (e) {}
        }

        return { name: 'Connected Facebook User' };
    }

    async getUserPages() {
        let token = this.accessToken;

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
            // Return an empty array instead of throwing so the app doesn't crash
            return [];
        }

        try {
            const res = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${token}`);
            const data = await res.json();
            if (data.data) return data.data;
        } catch (e) {}

        return [];
    }

    async publishPost({ pageId, caption, linkName, linkUrl, callToActionType, imageFile }) {
        let token = this.accessToken;
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
        formData.append('access_token', token || this.accessToken);

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