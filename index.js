require('dotenv').config()
const fetch = require('node-fetch')

var intervalId = null;

const Discord = require('discord.js');
const client = new Discord.Client({
    partials: ['MESSAGE ']
});
const interval = process.env.INTERVAL || 60;

client.on("ready", () => {
    console.log("Bot is ready")
})

const checkRoles = () => {
    
    console.log('!!! check role');
    client.guilds.fetch(process.env.GUILDID, true, true).then(
        list =>
            list.members.fetch()
            .then( members => 
                members.each(member => {
                    
                    fetch(`http://3.142.255.213/api/articles/${member.id}`)
                    .then(res => res.json())
                    .then(data => {
                        if(data.punkbodies > 0) {
                            member.roles.add(process.env.PUNKBODIES_ROLE_ID);
                        } else {
                            member.roles.remove(process.env.PUNKBODIES_ROLE_ID)
                        }
                        if(data.punkster > 0) {
                            member.roles.add(process.env.PUNKSTER_ROLE_ID);
                        } else {
                            member.roles.remove(process.env.PUNKSTER_ROLE_ID)
                        }
                    })
                    .catch(console.error)
                })
            )
    );
}

client.on("message", msg => {
    if (msg.content === "$$$test$$$") {

        // msg.delete();
        checkRoles();
    } 
    else if (msg.content === "$$$start$$$") { 

        // msg.delete();
        if (!intervalId) {
            intervalId = setInterval (checkRoles, interval * 1000); 
        }
    } 
    else if (msg.content === "$$$stop$$$") { 
        
        // msg.delete();
        if (intervalId)
            clearInterval(intervalId);
            intervalId = null;
      }
})

client.login(process.env.BOT_TOKEN)