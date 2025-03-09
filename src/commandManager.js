const fs = require('fs');
const path = require('path');

let instance = null;

class CommandManager {
    constructor() {
        if (instance) {
            return instance;
        }
        this.commands = new Map();
        this.stateFile = path.join(__dirname, 'commandStates.json');
        this.loadCommands();
        this.loadState();
        instance = this;
    }

    loadState() {
        try {
            if (fs.existsSync(this.stateFile)) {
                const states = JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
                // Apply saved states to commands
                for (const [name, enabled] of Object.entries(states)) {
                    for (const command of this.commands.values()) {
                        if (command.name === name) {
                            command.enabled = enabled;
                            break;
                        }
                    }
                }
                console.log('Loaded command states:', states);
            }
        } catch (error) {
            console.error('Error loading command states:', error);
        }
    }

    saveState() {
        try {
            const states = {};
            for (const command of this.commands.values()) {
                states[command.name] = command.enabled;
            }
            fs.writeFileSync(this.stateFile, JSON.stringify(states, null, 2));
            console.log('Saved command states:', states);
        } catch (error) {
            console.error('Error saving command states:', error);
        }
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
                this.saveState();
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
                this.saveState();
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

        // Check for mod-only commands with consistent permission checking
        if (command.modOnly) {
            const isBroadcaster = context.username.toLowerCase() === process.env.CHANNEL_NAME.toLowerCase();
            const isMod = context.mod || isBroadcaster || context.badges?.broadcaster === '1';
            
            if (!isMod) {
                await client.say(target, `@${context.username} Sorry, this command is for moderators only.`);
                return false;
            }
        }

        try {
            // Execute command in a controlled context
            const executionPromise = command.execute(client, target, context, this);
            const result = await Promise.race([
                executionPromise,
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Command execution timeout')), 5000)
                )
            ]);
            return result === true;
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