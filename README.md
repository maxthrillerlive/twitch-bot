# Twitch Chat Bot

A simple Twitch chat bot built with Node.js that responds to chat commands.

## Features

- Responds to !dice command with a random number between 1 and 6
- Responds to !hello command with a greeting
- Easy to extend with new commands

## Setup

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a Twitch account for your bot if you haven't already
4. Get your OAuth token from https://twitchapps.com/tmi/
5. Copy the `.env` file and fill in your details:
   - BOT_USERNAME: Your bot's Twitch username
   - OAUTH_TOKEN: Your OAuth token (including the 'oauth:' prefix)
   - CHANNEL_NAME: The channel where the bot should be active

## Running the Bot

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## Adding New Commands

To add new commands, modify the `onMessageHandler` function in `src/index.js`. Add new conditions for your commands following the existing pattern.

## Security Notes

- Never commit your `.env` file
- Keep your OAuth token secret
- Follow Twitch's [bot best practices](https://dev.twitch.tv/docs/irc/guide) 