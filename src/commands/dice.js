module.exports = {
    name: 'dice',
    description: 'Roll a twelve-sided die',
    enabled: true,
    trigger: '!dice',
    execute: async (client, target, context) => {
        const num = Math.floor(Math.random() * 12) + 1;
        await client.say(target, `@${context.username} rolled a ${num} (d12)`);
        return true;
    }
}; 