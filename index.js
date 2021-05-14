require('dotenv').config()
const fetch = require('node-fetch')
const BlocknativeSdk = require('bnc-sdk');
const WebSocket = require('ws');

// blocknative initialize

const options = {
    dappId: process.env.DAPP_ID,
    networkId: 56,
    system: 'ethereum', // optional, defaults to ethereum
    transactionHandlers: [event => console.log(event.transaction)],
    ws: WebSocket, // only neccessary in server environments
    name: 'Mempool Explorer' // optional, use when running multiple instances
};

const blocknative = new BlocknativeSdk(options)


const Discord = require('discord.js');
const client = new Discord.Client({
    partials: ['MESSAGE ']
});

const startWatch = async (address) => {

    var config = {
        scope: address,
        watchAddress: true
      };
    
    const {
        emitter, // emitter object to listen for status updates
        details // initial account details which are useful for internal tracking: address
      } = await blocknative.configuration(config);
    
    
    // catch every other event that occurs and log it
    emitter.on('all', transaction => {
        console.log(`Transaction event: ${transaction.eventCode}`)
    })
}

const stopWatch = () => {
    
}


client.on("ready", () => {
    console.log("Watch Bot is ready")
})

client.on("message", msg => {
    if (msg.content === "$$$test$$$") {

        msg.reply("I'm here!");
    } 
    else if (msg.content.startsWith("$$$wallet")) { 

        console.log("!!! start watch");

        wallet = msg.content.substring(10);
        startWatch();
    } 
    else if (msg.content === "$$$stop$$$") { 
        
        console.log("!!! stop watch");
        stopWatch();
      }
})

client.login(process.env.BOT_TOKEN)


// startWatch('0x05fF2B0DB69458A0750badebc4f9e13aDd608C7F')