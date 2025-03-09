const { spawn } = require('child_process');
const path = require('path');

module.exports = {
    name: 'restart',
    description: 'Restart the bot (Moderators only)',
    enabled: true,
    trigger: '!restart',
    modOnly: true, // This flag indicates this is a mod-only command
    execute: async (client, target, context) => {
        if (!context.mod && context.username !== process.env.CHANNEL_NAME) {
            await client.say(target, `@${context.username} Sorry, only moderators can use this command.`);
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