module.exports = {
    name: 'commands',
    description: 'Show list of available commands',
    enabled: true,
    trigger: '!commands',
    execute: async (client, target, context, commandManager) => {
        const commands = commandManager.listCommands();
        const regularCommands = commands
            .filter(cmd => !cmd.modOnly && cmd.enabled)
            .map(cmd => `${cmd.trigger}: ${cmd.description}`)
            .join(' | ');
            
        const modCommands = commands
            .filter(cmd => cmd.modOnly && cmd.enabled)
            .map(cmd => `${cmd.trigger}: ${cmd.description}`)
            .join(' | ');

        // Send regular commands
        await client.say(target, `Available commands: ${regularCommands}`);
        
        // Send mod commands only if user is mod or broadcaster
        if ((context.mod || context.username === process.env.CHANNEL_NAME) && modCommands) {
            await client.say(target, `Mod commands: ${modCommands}`);
        }
        return true;
    }
}; 