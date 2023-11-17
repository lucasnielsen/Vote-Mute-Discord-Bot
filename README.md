# Vote Mute
A simple open-source Discord bot where users can vote to have a player muted.

## Commands:
- `setconfig [limit: amount of reactions to mute] [duration: time to mute] [timeoutrole: id of role to give during timeouts (optional)] [whitelistrole: id of role to ignore timeouts (optional)]` - Set up bot configurations
- `resetconfig` - Reset bot configurations to default configurations

## To do:
- Make it so players are still muted if they leave and rejoin
- Make bot owner commands for easier configurations

## Setup:
- Install **Node.js**
- Run `npm install discord.js`
- Run `node bot.js` in bot directory
- Create a [bot](https://discord.com/developers/applications)
- Insert bot token when prompted
- Create invite link and follow steps: https://discord.com/oauth2/authorize?client_id=INSERT_CLIENT_ID_HERE&scope=bot&permissions=1099511627775

If you still can't figure out how to set up a Discord bot, search it up
