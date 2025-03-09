const { spawn } = require('child_process');
const path = require('path');

module.exports = {
    name: 'restart',
    description: 'Restart the bot (Moderators only)',
    enabled: true,
    trigger: '!restart',
    modOnly: true,
    execute: async (client, target, context) => {
        // Check if user is broadcaster or mod
        const isBroadcaster = context.username.toLowerCase() === process.env.CHANNEL_NAME.toLowerCase();
        const isMod = context.mod || isBroadcaster || context.badges?.broadcaster === '1';

        if (!isMod) {
            await client.say(target, `@${context.username} Sorry, this command is for moderators only.`);
            return false;
        }

        await client.say(target, `@${context.username} Restarting the bot...`);
        
        // Start a new instance of the bot
        const scriptPath = path.join(__dirname, '..', 'index.js');
        const child = spawn('node', [scriptPath], {
            detached: true,
            stdio: 'inherit'
        });
        
        // Unref the child process so the parent can exit
        child.unref();

        // Gracefully shutdown the current instance
        console.log('Restarting bot...');
        await client.disconnect();
        process.exit(0);
    }
}; 