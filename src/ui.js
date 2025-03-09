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
            title: 'Twitch Bot Control Panel',
            dockBorders: true,
            fullUnicode: true
        });

        // Create the menu panel (left side)
        this.menuList = blessed.list({
            parent: this.screen,
            width: '30%',
            height: '100%',
            left: 0,
            top: 0,
            border: {
                type: 'line',
                fg: 'blue'
            },
            style: {
                border: {
                    fg: 'blue'
                },
                selected: {
                    bg: 'blue',
                    fg: 'white',
                    bold: true
                },
                item: {
                    hover: {
                        bg: 'blue',
                        fg: 'white'
                    }
                }
            },
            label: {
                text: ' Menu ',
                side: 'center'
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
                type: 'line',
                fg: 'blue'
            },
            style: {
                border: {
                    fg: 'blue'
                }
            },
            label: {
                text: ' Results ',
                side: 'center'
            },
            content: 'Select an option from the menu',
            scrollable: true,
            alwaysScroll: true,
            scrollbar: {
                ch: '║',
                track: {
                    bg: 'blue'
                },
                style: {
                    inverse: true
                }
            },
            padding: 1
        });

        // Create the console panel (bottom right)
        this.consoleBox = blessed.log({
            parent: this.screen,
            width: '70%',
            height: '40%',
            right: 0,
            bottom: 0,
            border: {
                type: 'line',
                fg: 'blue'
            },
            style: {
                border: {
                    fg: 'blue'
                }
            },
            label: {
                text: ' Console ',
                side: 'center'
            },
            scrollable: true,
            alwaysScroll: true,
            scrollbar: {
                ch: '║',
                track: {
                    bg: 'blue'
                },
                style: {
                    inverse: true
                }
            },
            padding: 1,
            tags: true
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

        // Override console.log and related functions to write to our console box
        const originalConsoleLog = console.log;
        const originalConsoleError = console.error;
        const originalConsoleInfo = console.info;
        const originalConsoleWarn = console.warn;
        
        console.log = (...args) => {
            this.logToConsole('white', ...args);
            originalConsoleLog.apply(console, args);
        };
        
        console.error = (...args) => {
            this.logToConsole('red', ...args);
            originalConsoleError.apply(console, args);
        };

        console.info = (...args) => {
            this.logToConsole('green', ...args);
            originalConsoleInfo.apply(console, args);
        };

        console.warn = (...args) => {
            this.logToConsole('yellow', ...args);
            originalConsoleWarn.apply(console, args);
        };

        // Draw box characters for borders
        this.screen.on('resize', () => {
            this.screen.render();
        });

        // Initial render
        this.screen.render();
    }

    logToConsole(color, ...args) {
        const timestamp = new Date().toLocaleTimeString();
        const formattedArgs = args.map(arg => {
            if (Array.isArray(arg)) {
                return arg.map(item => {
                    if (typeof item === 'object' && item !== null) {
                        // For command objects, show the trigger
                        return item.trigger || JSON.stringify(item);
                    }
                    return String(item);
                }).join(', ');
            } else if (typeof arg === 'object' && arg !== null) {
                // For command objects, show the trigger
                return arg.trigger || JSON.stringify(arg);
            }
            return String(arg);
        });
        const message = formattedArgs.join(' ');
        this.consoleBox.log(`{${color}-fg}[${timestamp}] ${message}{/${color}-fg}`);
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

        const promptBox = this.createPromptBox({
            items: disabledCommands.map(cmd => `${cmd.trigger}: ${cmd.description}`),
            label: ' Select Command to Enable (Esc to cancel) '
        });

        // Add escape key handler
        promptBox.key(['escape'], () => {
            promptBox.destroy();
            this.menuList.focus();
            this.screen.render();
        });

        promptBox.focus();
        this.screen.render();

        return new Promise((resolve) => {
            promptBox.once('select', (item) => {
                const commandName = item.content.split(':')[0].replace('!', '');
                if (commandManager.enableCommand(commandName)) {
                    this.showResult(`Enabled command: ${commandName}`);
                }
                promptBox.destroy();
                this.menuList.focus();
                this.screen.render();
                resolve();
            });
        });
    }

    async disableCommand() {
        const commands = commandManager.listCommands();
        const enabledCommands = commands.filter(cmd => cmd.enabled);
        
        if (enabledCommands.length === 0) {
            this.showResult('No enabled commands found.');
            return;
        }

        const promptBox = this.createPromptBox({
            items: enabledCommands.map(cmd => `${cmd.trigger}: ${cmd.description}`),
            label: ' Select Command to Disable (Esc to cancel) '
        });

        // Add escape key handler
        promptBox.key(['escape'], () => {
            promptBox.destroy();
            this.menuList.focus();
            this.screen.render();
        });

        promptBox.focus();
        this.screen.render();

        return new Promise((resolve) => {
            promptBox.once('select', (item) => {
                const commandName = item.content.split(':')[0].replace('!', '');
                if (commandManager.disableCommand(commandName)) {
                    this.showResult(`Disabled command: ${commandName}`);
                }
                promptBox.destroy();
                this.menuList.focus();
                this.screen.render();
                resolve();
            });
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

    createPromptBox(options) {
        return blessed.list({
            parent: this.screen,
            width: '50%',
            height: '50%',
            top: 'center',
            left: 'center',
            border: {
                type: 'line',
                fg: 'blue'
            },
            style: {
                border: {
                    fg: 'blue'
                },
                selected: {
                    bg: 'blue',
                    fg: 'white',
                    bold: true
                },
                item: {
                    hover: {
                        bg: 'blue',
                        fg: 'white'
                    }
                }
            },
            label: {
                text: options.label,
                side: 'center'
            },
            keys: true,
            vi: true,
            mouse: true,
            scrollbar: {
                ch: '║',
                track: {
                    bg: 'blue'
                },
                style: {
                    inverse: true
                }
            },
            padding: 1,
            ...options
        });
    }

    showConfirmDialog(message) {
        return new Promise((resolve) => {
            const dialog = blessed.question({
                parent: this.screen,
                border: {
                    type: 'line',
                    fg: 'blue'
                },
                height: 'shrink',
                width: '50%',
                top: 'center',
                left: 'center',
                label: {
                    text: ' Confirm (Esc to cancel) ',
                    side: 'center'
                },
                style: {
                    border: {
                        fg: 'blue'
                    }
                },
                padding: 1,
                tags: true,
                keys: true,
                vi: true,
                mouse: true,
                content: message
            });

            dialog.key(['escape'], () => {
                dialog.destroy();
                this.menuList.focus();
                this.screen.render();
                resolve(false);
            });

            dialog.once('submit', (value) => {
                dialog.destroy();
                this.menuList.focus();
                this.screen.render();
                resolve(value);
            });

            this.screen.render();
        });
    }
}

module.exports = BotUI; 