require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();
const port = 3000;

app.get('/', async (req, res) => {
    const { code } = req.query;

    if (!code) {
        // If no code, redirect to Twitch auth
        const scopes = 'chat:read chat:edit channel:moderate';
        const clientId = process.env.CLIENT_ID;
        const redirectUri = 'http://localhost:3000';
        const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scopes}`;
        res.redirect(authUrl);
        return;
    }

    try {
        // Exchange code for access token
        const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
            params: {
                client_id: process.env.CLIENT_ID,
                client_secret: process.env.CLIENT_SECRET,
                code,
                grant_type: 'authorization_code',
                redirect_uri: 'http://localhost:3000'
            }
        });

        const { access_token } = response.data;
        
        res.send(`
            <h1>Authentication Successful!</h1>
            <p>Your access token is: <code>oauth:${access_token}</code></p>
            <p>Please update your .env file with this token as CLIENT_TOKEN</p>
            <script>
                console.log("Access Token: oauth:" + "${access_token}");
            </script>
        `);
    } catch (error) {
        console.error('Error getting token:', error.response?.data || error.message);
        res.status(500).send('Error getting access token. Check console for details.');
    }
});

app.listen(port, () => {
    console.log(`
    Auth server running at http://localhost:${port}
    Please make sure you have set up your .env file with:
    - CLIENT_ID
    - CLIENT_SECRET
    from your Twitch Developer Console.
    
    Then visit http://localhost:${port} to start the auth process.
    `);
}); 