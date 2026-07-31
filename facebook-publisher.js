import fetch from 'node-fetch';

export class FacebookPublisher {
    constructor(config) {
        this.accessToken = config.accessToken;
        this.accessToken2 = config.accessToken2;
        this.cookieData = config.cookieData;
        this.adAccountId = config.adAccountId;
        this.pageId = config.pageId;
        this.baseUrl = 'https://graph.facebook.com/v21.0';
        this.headers = {
            'cookie': this.cookieData,
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36'
        };
    }

    // Fetch user profile name, ID, and picture
    async getUserProfile() {
        const url = `${this.baseUrl}/me?fields=id,name,picture.type(large)&access_token=${this.accessToken}`;
        const res = await fetch(url, { headers: this.headers });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        return {
            id: data.id,
            name: data.name,
            picture: data.picture?.data?.url || ''
        };
    }

    // Fetch all Facebook Pages the user manages
    async getUserPages() {
        const url = `${this.baseUrl}/me/accounts?fields=id,name,picture.type(square),access_token&limit=100&access_token=${this.accessToken}`;
        const res = await fetch(url, { headers: this.headers });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);

        return (data.data || []).map(page => ({
            id: page.id,
            name: page.name,
            picture: page.picture?.data?.url || '',
            accessToken: page.access_token
        }));
    }

    async publishToFacebook(imageUrl, linkUrl, linkName, caption, description, callToActionType = "LEARN_MORE") {
        console.log('STEP 1: Creating Ad Creative...');

        const linkData = {
            picture: imageUrl,
            description: description,
            link: linkUrl,
            name: linkName,
            multi_share_optimized: true,
            multi_share_end_card: false,
            caption: caption
        };

        if (callToActionType && callToActionType !== "NO_BUTTON") {
            linkData.call_to_action = { type: callToActionType };
        }

        const payload = {
            object_story_spec: {
                link_data: linkData,
                page_id: this.pageId
            }
        };

        const createUrl = `${this.baseUrl}/${this.adAccountId}/adcreatives?access_token=${this.accessToken}&fields=effective_object_story_id`;
        const createRes = await fetch(createUrl, {
            method: 'POST',
            headers: { ...this.headers, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const createData = await createRes.json();
        if (createData.error) throw new Error(`Create Ad Creative Failed: ${createData.error.message}`);
        
        const creativeId = createData.id;
        console.log(`SUCCESS: Creative created with ID: ${creativeId}`);

        console.log('STEP 2: Triggering post processing...');
        const triggerUrl = `${this.baseUrl}/${creativeId}?access_token=${this.accessToken}&fields=effective_object_story_id`;
        await fetch(triggerUrl, { headers: this.headers });

        console.log(`STEP 3: Fetching Page Access Token for Page ID ${this.pageId}...`);
        const tokenUrl = `${this.baseUrl}/${this.pageId}?access_token=${this.accessToken}&fields=access_token`;
        const tokenRes = await fetch(tokenUrl, { headers: this.headers });
        const tokenData = await tokenRes.json();
        if (tokenData.error) throw new Error(`Fetch Page Token Failed: ${tokenData.error.message}`);

        console.log('STEP 4: Polling for final Post ID...');
        let effectiveId = null;
        const maxAttempts = 10;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const pollRes = await fetch(triggerUrl, { headers: this.headers });
            const pollData = await pollRes.json();

            if (pollData.effective_object_story_id) {
                effectiveId = pollData.effective_object_story_id;
                console.log(`✅ SUCCESS: Got final Post ID: ${effectiveId}`);
                break;
            }

            console.log(`Attempt ${attempt}/${maxAttempts}: Post ID not ready yet, waiting 3 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
        }

        if (!effectiveId) throw new Error('Timed out waiting for Facebook to generate Post ID.');

        console.log('STEP 5: Publishing the post...');
        const publishUrl = `${this.baseUrl}/${effectiveId}?access_token=${this.accessToken2}`;
        const publishRes = await fetch(publishUrl, {
            method: 'POST',
            headers: { ...this.headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_published: true })
        });

        const publishData = await publishRes.json();
        if (publishData.error || !publishData.success) {
            throw new Error(`Publishing Failed: ${publishData.error ? publishData.error.message : 'Unknown error'}`);
        }

        const postUrl = `https://www.facebook.com/${effectiveId}`;
        console.log(`✅ Post published successfully: ${postUrl}`);
        return { success: true, url: postUrl, id: effectiveId };
    }
}