require('dotenv').config();
const tmi = require('tmi.js');
const https = require('https');

// Define configuration options
const opts = {
  options: { debug: true },
  identity: {
    username: process.env.BOT_USERNAME,
    password: process.env.CLIENT_TOKEN // This will be your OAuth token with client credentials
  },
  channels: [
    process.env.CHANNEL_NAME
  ]
};

// Create a client with our options
const client = new tmi.client(opts);

// Register our event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);
client.on('disconnected', (reason) => {
  console.log(`Bot disconnected: ${reason}`);
});

// Connect to Twitch
client.connect().catch(console.error);

// Called every time a message comes in
function onMessageHandler (target, context, msg, self) {
  if (self) { return; } // Ignore messages from the bot

  // Remove whitespace from chat message
  const commandName = msg.trim().toLowerCase();

  // If the command is known, let's execute it
  if (commandName === '!dice') {
    const num = rollDice();
    client.say(target, `You rolled a ${num}`);
    console.log(`* Executed ${commandName} command`);
  } else if (commandName === '!hello') {
    client.say(target, `Hello @${context.username}!`);
    console.log(`* Executed ${commandName} command`);
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