require('dotenv').config();
const tmi = require('tmi.js');
const commandManager = require('./commandManager');

// Validate environment variables
if (!process.env.BOT_USERNAME) {
    console.error('Error: BOT_USERNAME is not set in .env file');
    process.exit(1);
}
if (!process.env.CLIENT_TOKEN || !process.env.CLIENT_TOKEN.startsWith('oauth:')) {
    console.error('Error: CLIENT_TOKEN must start with "oauth:" in .env file');
    process.exit(1);
}
if (!process.env.CHANNEL_NAME) {
    console.error('Error: CHANNEL_NAME is not set in .env file');
    process.exit(1);
}

// Define configuration options
const opts = {
    options: { 
        debug: true,
        clientId: process.env.CLIENT_ID
    },
    connection: {
        reconnect: true,
        secure: true
    },
    identity: {
        username: process.env.BOT_USERNAME,
        password: process.env.CLIENT_TOKEN
    },
    channels: [
        process.env.CHANNEL_NAME
    ]
};

// Create a client with our options
const client = new tmi.client(opts);

// Register our event handlers
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);
client.on('disconnected', (reason) => {
    console.error('Bot disconnected:', reason);
});

// Handle connection errors
client.on('connecting', (address, port) => {
    console.log(`Attempting to connect to ${address}:${port}`);
});

client.on('error', (error) => {
    console.error('Connection error:', error);
});

// Graceful shutdown handling
let isShuttingDown = false;  // Add flag to prevent multiple shutdown attempts

async function shutdown(signal) {
    if (isShuttingDown) return;  // If already shutting down, ignore additional signals
    isShuttingDown = true;

    console.log(`\nReceived ${signal}. Disconnecting bot...`);
    try {
        await client.disconnect();
        console.log('Bot disconnected successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
}

// Handle different shutdown signals
process.once('SIGINT', () => shutdown('SIGINT')); // Use once instead of on
process.once('SIGTERM', () => shutdown('SIGTERM')); // Use once instead of on

// Connect to Twitch
console.log('Connecting to Twitch...');
console.log('Bot username:', process.env.BOT_USERNAME);
console.log('Channel:', process.env.CHANNEL_NAME);
console.log('\nTo safely stop the bot, press Ctrl+C');

client.connect()
    .catch(err => {
        console.error('Connection failed:', err);
        if (err.message.includes('authentication failed')) {
            console.error('Please check your CLIENT_TOKEN in .env file and make sure it starts with "oauth:"');
            console.error('You can get a new token by running: npm run auth');
        }
    });

// Called every time a message comes in
async function onMessageHandler(target, context, msg, self) {
    if (self) { return; } // Ignore messages from the bot

    // Remove whitespace from chat message
    const commandText = msg.trim().toLowerCase();
    console.log(`Received command: ${commandText} from ${context.username}`);

    // Special commands for managing other commands
    if (context.mod || context.username === process.env.CHANNEL_NAME) {
        if (commandText.startsWith('!enable ')) {
            const commandName = commandText.split(' ')[1];
            if (commandManager.enableCommand(commandName)) {
                await client.say(target, `Enabled command: ${commandName}`);
            }
            return;
        }

        if (commandText.startsWith('!disable ')) {
            const commandName = commandText.split(' ')[1];
            if (commandManager.disableCommand(commandName)) {
                await client.say(target, `Disabled command: ${commandName}`);
            }
            return;
        }
    }

    // Handle regular commands
    try {
        await commandManager.handleCommand(client, target, context, commandText);
    } catch (error) {
        console.error('Error handling command:', error);
        await client.say(target, `@${context.username} Sorry, there was an error processing your command.`);
    }
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler(addr, port) {
    console.log(`* Connected to ${addr}:${port}`);
    console.log('Available commands:', commandManager.listCommands());
} 