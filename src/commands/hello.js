module.exports = {
    name: 'hello',
    description: 'Greet the user',
    enabled: true,
    trigger: '!hello',
    execute: async (client, target, context) => {
        await client.say(target, `Hello @${context.username}!`);
        return true;
    }
}; 