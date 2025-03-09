const inquirer = require('inquirer');
const commandManager = require('./commandManager');

class BotMenu {
    constructor(client) {
        this.client = client;
        this.isShuttingDown = false;
    }

    async showMainMenu() {
        while (!this.isShuttingDown) {
            const { choice } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'choice',
                    message: 'Bot Control Panel',
                    choices: [
                        'View Commands',
                        'Enable Command',
                        'Disable Command',
                        'View Bot Status',
                        'View Connected Channels',
                        'Clear Console',
                        'Restart Bot',
                        'Exit Bot'
                    ]
                }
            ]);

            await this.handleMenuChoice(choice);
        }
    }

    async handleMenuChoice(choice) {
        switch (choice) {
            case 'View Commands':
                await this.viewCommands();
                break;
            case 'Enable Command':
                await this.enableCommand();
                break;
            case 'Disable Command':
                await this.disableCommand();
                break;
            case 'View Bot Status':
                this.viewBotStatus();
                break;
            case 'View Connected Channels':
                this.viewConnectedChannels();
                break;
            case 'Clear Console':
                console.clear();
                break;
            case 'Restart Bot':
                await this.confirmRestart();
                break;
            case 'Exit Bot':
                await this.confirmExit();
                break;
        }
    }

    async viewCommands() {
        const commands = commandManager.listCommands();
        console.log('\nAvailable Commands:');
        commands.forEach(cmd => {
            const status = cmd.enabled ? 'Enabled' : 'Disabled';
            const modOnly = cmd.modOnly ? ' (Mod Only)' : '';
            console.log(`${cmd.trigger}: ${cmd.description} - ${status}${modOnly}`);
        });
        await this.pressEnterToContinue();
    }

    async enableCommand() {
        const commands = commandManager.listCommands();
        const disabledCommands = commands.filter(cmd => !cmd.enabled);
        
        if (disabledCommands.length === 0) {
            console.log('\nNo disabled commands found.');
            await this.pressEnterToContinue();
            return;
        }

        const { command } = await inquirer.prompt([
            {
                type: 'list',
                name: 'command',
                message: 'Select command to enable:',
                choices: disabledCommands.map(cmd => ({
                    name: `${cmd.trigger}: ${cmd.description}`,
                    value: cmd.name
                }))
            }
        ]);

        if (commandManager.enableCommand(command)) {
            console.log(`\nEnabled command: ${command}`);
        }
        await this.pressEnterToContinue();
    }

    async disableCommand() {
        const commands = commandManager.listCommands();
        const enabledCommands = commands.filter(cmd => cmd.enabled);
        
        if (enabledCommands.length === 0) {
            console.log('\nNo enabled commands found.');
            await this.pressEnterToContinue();
            return;
        }

        const { command } = await inquirer.prompt([
            {
                type: 'list',
                name: 'command',
                message: 'Select command to disable:',
                choices: enabledCommands.map(cmd => ({
                    name: `${cmd.trigger}: ${cmd.description}`,
                    value: cmd.name
                }))
            }
        ]);

        if (commandManager.disableCommand(command)) {
            console.log(`\nDisabled command: ${command}`);
        }
        await this.pressEnterToContinue();
    }

    viewBotStatus() {
        const status = this.client.readyState();
        const connectionState = status === 'OPEN' ? 'Connected' : 'Disconnected';
        console.log('\nBot Status:');
        console.log(`Connection State: ${connectionState}`);
        console.log(`Username: ${process.env.BOT_USERNAME}`);
        console.log(`Process ID: ${process.pid}`);
        this.pressEnterToContinue();
    }

    viewConnectedChannels() {
        const channels = this.client.getChannels();
        console.log('\nConnected Channels:');
        channels.forEach(channel => console.log(channel));
        this.pressEnterToContinue();
    }

    async confirmRestart() {
        const { confirm } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: 'Are you sure you want to restart the bot?',
                default: false
            }
        ]);

        if (confirm) {
            this.isShuttingDown = true;
            await this.client.say(process.env.CHANNEL_NAME, 'Bot is restarting...');
            process.kill(process.pid, 'SIGTERM');
        }
    }

    async confirmExit() {
        const { confirm } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: 'Are you sure you want to exit?',
                default: false
            }
        ]);

        if (confirm) {
            this.isShuttingDown = true;
            await this.client.say(process.env.CHANNEL_NAME, 'Bot is shutting down...');
            process.kill(process.pid, 'SIGTERM');
        }
    }

    async pressEnterToContinue() {
        await inquirer.prompt([
            {
                type: 'input',
                name: 'continue',
                message: 'Press Enter to continue...'
            }
        ]);
    }
}

module.exports = BotMenu; 