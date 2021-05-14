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

const startWatch = (address) => {

    const { emitter } = blocknative.account(address)
    
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
        msg.channel.send(wallet);
        startWatch();
    } 
    else if (msg.content === "$$$stop$$$") { 
        
        console.log("!!! stop watch");
        stopWatch();
      }
})

client.login(process.env.BOT_TOKEN)


// startWatch('0x05fF2B0DB69458A0750badebc4f9e13aDd608C7F') // z3
// startWatch('0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2') // etherscan
