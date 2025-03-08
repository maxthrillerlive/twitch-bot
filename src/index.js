require('dotenv').config();
const tmi = require('tmi.js');

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
        password: process.env.CLIENT_TOKEN // This will be your OAuth token
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

// Connect to Twitch
console.log('Connecting to Twitch...');
console.log('Bot username:', process.env.BOT_USERNAME);
console.log('Channel:', process.env.CHANNEL_NAME);

client.connect()
    .catch(err => {
        console.error('Connection failed:', err);
        if (err.message.includes('authentication failed')) {
            console.error('Please check your CLIENT_TOKEN in .env file and make sure it starts with "oauth:"');
            console.error('You can get a new token by running: npm run auth');
        }
    });

// Called every time a message comes in
async function onMessageHandler (target, context, msg, self) {
    console.log(`Received message: ${msg} from ${context.username} in ${target}`);
    
    if (self) { 
        console.log('Ignoring message from self');
        return; 
    }

    // Remove whitespace from chat message
    const commandName = msg.trim().toLowerCase();
    console.log(`Processing command: ${commandName}`);

    try {
        // If the command is known, let's execute it
        if (commandName === '!dice') {
            const num = rollDice();
            console.log(`Rolled dice: ${num}`);
            await client.say(target, `@${context.username} rolled a ${num}`);
            console.log(`Sent dice roll response to ${target}`);
        } else if (commandName === '!hello') {
            await client.say(target, `Hello @${context.username}!`);
            console.log(`Sent hello response to ${target}`);
        }
    } catch (error) {
        console.error('Error handling command:', error);
        try {
            await client.say(target, `@${context.username} Sorry, there was an error processing your command.`);
        } catch (e) {
            console.error('Error sending error message:', e);
        }
    }
}

// Function called when the "dice" command is issued
function rollDice () {
    const sides = 6;
    return Math.floor(Math.random() * sides) + 1;
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler (addr, port) {
    console.log(`* Connected to ${addr}:${port}`);
} 