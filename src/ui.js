const blessed = require('blessed');
const commandManager = require('./commandManager');

class BotUI {
    constructor(client) {
        this.client = client;
        this.isShuttingDown = false;
        this.setupScreen();
    }

    setupScreen() {
        // Create a screen object
        this.screen = blessed.screen({
            smartCSR: true,
            title: 'Twitch Bot Control Panel'
        });

        // Create the menu panel (left side)
        this.menuList = blessed.list({
            parent: this.screen,
            width: '30%',
            height: '100%',
            left: 0,
            top: 0,
            border: {
                type: 'line'
            },
            style: {
                selected: {
                    bg: 'blue',
                    fg: 'white'
                }
            },
            keys: true,
            vi: true,
            mouse: true,
            items: [
                'View Commands',
                'Enable Command',
                'Disable Command',
                'View Bot Status',
                'View Connected Channels',
                'Clear Console',
                'Restart Bot',
                'Exit Bot'
            ]
        });

        // Create the results panel (top right)
        this.resultsBox = blessed.box({
            parent: this.screen,
            width: '70%',
            height: '60%',
            right: 0,
            top: 0,
            border: {
                type: 'line'
            },
            label: ' Results ',
            content: 'Select an option from the menu',
            scrollable: true,
            alwaysScroll: true,
            scrollbar: {
                ch: ' ',
                track: {
                    bg: 'cyan'
                },
                style: {
                    inverse: true
                }
            }
        });

        // Create the console panel (bottom right)
        this.consoleBox = blessed.log({
            parent: this.screen,
            width: '70%',
            height: '40%',
            right: 0,
            bottom: 0,
            border: {
                type: 'line'
            },
            label: ' Console ',
            scrollable: true,
            alwaysScroll: true,
            scrollbar: {
                ch: ' ',
                track: {
                    bg: 'cyan'
                },
                style: {
                    inverse: true
                }
            }
        });

        // Handle menu selection
        this.menuList.on('select', async (item) => {
            const selected = item.content;
            await this.handleMenuChoice(selected);
        });

        // Quit on Escape, q, or Control-C
        this.screen.key(['escape', 'q', 'C-c'], () => {
            this.confirmExit();
        });

        // Focus on the menu
        this.menuList.focus();

        // Override console.log to write to our console box
        const originalConsoleLog = console.log;
        const originalConsoleError = console.error;
        
        console.log = (...args) => {
            this.consoleBox.log(args.join(' '));
            originalConsoleLog.apply(console, args);
        };
        
        console.error = (...args) => {
            this.consoleBox.log('{red-fg}' + args.join(' ') + '{/red-fg}');
            originalConsoleError.apply(console, args);
        };

        // Initial render
        this.screen.render();
    }

    showResult(content) {
        this.resultsBox.setContent(content);
        this.screen.render();
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
                this.consoleBox.setContent('');
                this.screen.render();
                break;
            case 'Restart Bot':
                await this.confirmRestart();
                break;
            case 'Exit Bot':
                await this.confirmExit();
                break;
        }
    }

    viewCommands() {
        const commands = commandManager.listCommands();
        let content = 'Available Commands:\n\n';
        commands.forEach(cmd => {
            const status = cmd.enabled ? 'Enabled' : 'Disabled';
            const modOnly = cmd.modOnly ? ' (Mod Only)' : '';
            content += `${cmd.trigger}: ${cmd.description}\n`;
            content += `Status: ${status}${modOnly}\n\n`;
        });
        this.showResult(content);
    }

    async enableCommand() {
        const commands = commandManager.listCommands();
        const disabledCommands = commands.filter(cmd => !cmd.enabled);
        
        if (disabledCommands.length === 0) {
            this.showResult('No disabled commands found.');
            return;
        }

        const promptBox = blessed.list({
            parent: this.screen,
            width: '50%',
            height: '50%',
            top: 'center',
            left: 'center',
            border: {
                type: 'line'
            },
            label: ' Select Command to Enable ',
            items: disabledCommands.map(cmd => `${cmd.trigger}: ${cmd.description}`),
            keys: true,
            vi: true,
            mouse: true,
            style: {
                selected: {
                    bg: 'blue',
                    fg: 'white'
                }
            }
        });

        promptBox.focus();
        this.screen.render();

        promptBox.once('select', (item) => {
            const commandName = item.content.split(':')[0].replace('!', '');
            if (commandManager.enableCommand(commandName)) {
                this.showResult(`Enabled command: ${commandName}`);
            }
            promptBox.destroy();
            this.menuList.focus();
            this.screen.render();
        });
    }

    async disableCommand() {
        const commands = commandManager.listCommands();
        const enabledCommands = commands.filter(cmd => cmd.enabled);
        
        if (enabledCommands.length === 0) {
            this.showResult('No enabled commands found.');
            return;
        }

        const promptBox = blessed.list({
            parent: this.screen,
            width: '50%',
            height: '50%',
            top: 'center',
            left: 'center',
            border: {
                type: 'line'
            },
            label: ' Select Command to Disable ',
            items: enabledCommands.map(cmd => `${cmd.trigger}: ${cmd.description}`),
            keys: true,
            vi: true,
            mouse: true,
            style: {
                selected: {
                    bg: 'blue',
                    fg: 'white'
                }
            }
        });

        promptBox.focus();
        this.screen.render();

        promptBox.once('select', (item) => {
            const commandName = item.content.split(':')[0].replace('!', '');
            if (commandManager.disableCommand(commandName)) {
                this.showResult(`Disabled command: ${commandName}`);
            }
            promptBox.destroy();
            this.menuList.focus();
            this.screen.render();
        });
    }

    viewBotStatus() {
        const status = this.client.readyState();
        const connectionState = status === 'OPEN' ? 'Connected' : 'Disconnected';
        let content = 'Bot Status:\n\n';
        content += `Connection State: ${connectionState}\n`;
        content += `Username: ${process.env.BOT_USERNAME}\n`;
        content += `Process ID: ${process.pid}`;
        this.showResult(content);
    }

    viewConnectedChannels() {
        const channels = this.client.getChannels();
        let content = 'Connected Channels:\n\n';
        channels.forEach(channel => {
            content += `${channel}\n`;
        });
        this.showResult(content);
    }

    async confirmRestart() {
        const confirm = await this.showConfirmDialog('Are you sure you want to restart the bot?');
        if (confirm) {
            this.isShuttingDown = true;
            await this.client.say(process.env.CHANNEL_NAME, 'Bot is restarting...');
            process.kill(process.pid, 'SIGTERM');
        }
    }

    async confirmExit() {
        const confirm = await this.showConfirmDialog('Are you sure you want to exit?');
        if (confirm) {
            this.isShuttingDown = true;
            await this.client.say(process.env.CHANNEL_NAME, 'Bot is shutting down...');
            process.kill(process.pid, 'SIGTERM');
        }
    }

    showConfirmDialog(message) {
        return new Promise((resolve) => {
            const dialog = blessed.question({
                parent: this.screen,
                border: 'line',
                height: 'shrink',
                width: '50%',
                top: 'center',
                left: 'center',
                label: ' Confirm ',
                tags: true,
                keys: true,
                vi: true,
                mouse: true,
                content: message
            });

            dialog.once('submit', (value) => {
                dialog.destroy();
                this.screen.render();
                resolve(value);
            });

            this.screen.render();
        });
    }
}

module.exports = BotUI; 