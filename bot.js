const { Client, GatewayIntentBits, Partials, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Define intents
const intents = [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers
];

const client = new Client({ intents, partials: [Partials.Message, Partials.Channel, Partials.Reaction] });

const defaultConfig = {
    reactionLimit: 5,
    timeoutDuration: 30 * 60 * 1000, // 30 mins
    timeoutRoleName: null,
    whitelistRoleName: null
};

let configs = {};

function loadConfigs() {
    if (fs.existsSync('configs.json')) {
        configs = JSON.parse(fs.readFileSync('configs.json', 'utf8'));
    }
}

function saveConfigs() {
    fs.writeFileSync('configs.json', JSON.stringify(configs), 'utf8');
}

function getConfig(guildId) {
    if (!configs[guildId]) {
        configs[guildId] = {...defaultConfig};
        saveConfigs();
    }
    return configs[guildId];
}

loadConfigs();

async function logErrorToDiscord(guildId, errorMessage, errorStack) {
    try {
        const guild = await client.guilds.fetch('1172431958974935063');
        if (!guild) return;

        const channel = await guild.channels.fetch('1175110532961927249');
        if (!channel) return;

        const detailedMessage = `Guild ID: ${guildId}\nError: ${errorMessage}\nStack Trace:\n\`\`\`${errorStack}\`\`\``;
        await channel.send(detailedMessage);
    } catch (logError) {
        console.error('Error logging to Discord:', logError);
    }
}

rl.question('Enter your bot token: ', (token) => {
    client.login(token).catch(console.error);
    rl.close();
});

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    const data = [
        new SlashCommandBuilder()
            .setName('setconfig')
            .setDescription('Change the reaction limit, timeout duration, and roles')
            .addIntegerOption(option => option.setName('limit').setDescription('The number of reactions needed').setRequired(true))
            .addIntegerOption(option => option.setName('duration').setDescription('The timeout duration in minutes').setRequired(true))
            .addStringOption(option => option.setName('timeoutrole').setDescription('The role to assign during timeout').setRequired(false))
            .addStringOption(option => option.setName('whitelistrole').setDescription('The role immune to timeout').setRequired(false))
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
        new SlashCommandBuilder()
            .setName('resetconfig')
            .setDescription('Reset all configuration settings to default')
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    ];

    client.application.commands.set(data);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    const guildConfig = getConfig(interaction.guildId);

    if (interaction.commandName === 'setconfig') {
        guildConfig.reactionLimit = interaction.options.getInteger('limit');
        guildConfig.timeoutDuration = interaction.options.getInteger('duration') * 60 * 1000; 
        guildConfig.timeoutRoleName = interaction.options.getString('timeoutrole') || null;
        guildConfig.whitelistRoleName = interaction.options.getString('whitelistrole') || null;
        saveConfigs();

        await interaction.reply(`Configuration updated.`);
    } else if (interaction.commandName === 'resetconfig') {
        configs[interaction.guildId] = {...defaultConfig};
        saveConfigs();

        await interaction.reply('Configuration settings have been reset to default values.');
    }
});

client.on('messageReactionAdd', async (reaction, user) => {
    try {
        if (reaction.partial) {
            await reaction.fetch();
        }

        const guildConfig = getConfig(reaction.message.guildId);
        if (reaction.emoji.name === '⚠️' && reaction.count >= guildConfig.reactionLimit) {
            const message = reaction.message;
            let member = message.guild.members.cache.get(message.author.id);

            // Fetch member if not cached
            if (!member) {
                try {
                    member = await message.guild.members.fetch(message.author.id);
                } catch (fetchError) {
                    console.error('Failed to fetch member:', fetchError);
                    return;
                }
            }
          
            if (!member || member.user.bot) {
                return;
            }

            if (guildConfig.whitelistRoleName && member.roles.cache.has(guildConfig.whitelistRoleName)) {
                return;
            }

            if (guildConfig.timeoutRoleName) {
                let originalRoles = member.roles.cache.map(role => role.id);
                await member.roles.set([guildConfig.timeoutRoleName]);

                setTimeout(async () => {
                    await member.roles.set(originalRoles);
                }, guildConfig.timeoutDuration);
            }

            await member.timeout(guildConfig.timeoutDuration);
        }
    } catch (error) {
        console.error('Error handling messageReactionAdd:', error);
        await logErrorToDiscord(reaction.message.guildId, error.message, error.stack);
    }
});

process.on('unhandledRejection', async error => {
    console.error('Unhandled promise rejection:', error);
    await logErrorToDiscord('Unknown', error.message, error.stack);
});

rl.on('close', () => {
    console.log('Bot is running...');
});
