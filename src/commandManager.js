const fs = require('fs');
const path = require('path');

class CommandManager {
    constructor() {
        this.commands = new Map();
        this.loadCommands();
    }

    loadCommands() {
        const commandsPath = path.join(__dirname, 'commands');
        
        // Create commands directory if it doesn't exist
        if (!fs.existsSync(commandsPath)) {
            fs.mkdirSync(commandsPath);
        }

        // Read all command files
        const commandFiles = fs.readdirSync(commandsPath)
            .filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            try {
                const command = require(path.join(commandsPath, file));
                if (command.name && command.trigger && command.execute) {
                    this.commands.set(command.trigger, command);
                    console.log(`Loaded command: ${command.name}${command.modOnly ? ' (Mod Only)' : ''}`);
                }
            } catch (error) {
                console.error(`Error loading command from ${file}:`, error);
            }
        }
    }

    enableCommand(commandName) {
        for (const [trigger, command] of this.commands) {
            if (command.name === commandName) {
                command.enabled = true;
                console.log(`Enabled command: ${commandName}`);
                return true;
            }
        }
        return false;
    }

    disableCommand(commandName) {
        for (const [trigger, command] of this.commands) {
            if (command.name === commandName) {
                command.enabled = false;
                console.log(`Disabled command: ${commandName}`);
                return true;
            }
        }
        return false;
    }

    async handleCommand(client, target, context, commandText) {
        const command = this.commands.get(commandText);
        
        if (!command) {
            return false;
        }

        if (!command.enabled) {
            console.log(`Command "${command.name}" is disabled`);
            return false;
        }

        // Check for mod-only commands
        if (command.modOnly && !context.mod && context.username !== process.env.CHANNEL_NAME) {
            await client.say(target, `@${context.username} Sorry, this command is for moderators only.`);
            return false;
        }

        try {
            await command.execute(client, target, context, this);
            return true;
        } catch (error) {
            console.error(`Error executing command ${command.name}:`, error);
            return false;
        }
    }

    listCommands() {
        return Array.from(this.commands.values()).map(cmd => ({
            name: cmd.name,
            description: cmd.description,
            enabled: cmd.enabled,
            trigger: cmd.trigger,
            modOnly: cmd.modOnly || false
        }));
    }
}

module.exports = new CommandManager(); 