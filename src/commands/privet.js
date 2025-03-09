module.exports = {
    name: 'privet',
    description: 'Say hello in Russian',
    trigger: '!привет',
    enabled: true,
    modOnly: false,
    execute: async (client, channel, userstate, message) => {
        await client.say(channel, `Привет, @${userstate.username}! (Hello, @${userstate.username}!)`);
    }
}; 