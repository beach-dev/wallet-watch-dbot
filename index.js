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
    name: 'Wallet watcher' // optional, use when running multiple instances
};

const blocknative = new BlocknativeSdk(options)

var address = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';

const {
    emitter, // emitter object to listen for status updates
    details // initial account details which are useful for internal tracking: address
  } = blocknative.account(address);

console.log(details);

emitter.on('txPool', transaction => {
console.log(`Sending ${transaction.value} wei to ${transaction.to}`)
})

emitter.on('txConfirmed', transaction => {
console.log('Transaction is confirmed!')
})

// catch every other event that occurs and log it
emitter.on('all', transaction => {
console.log(`Transaction event: ${transaction.eventCode}`)
})

// var wallet = null;

// const Discord = require('discord.js');
// const client = new Discord.Client({
//     partials: ['MESSAGE ']
// });

// client.on("ready", () => {
//     console.log("Watch Bot is ready")
// })

// const startWatch = () => {

// }

// const stopWatch = () => {
    
// }

// client.on("message", msg => {
//     if (msg.content === "$$$test$$$") {

//         msg.reply("I'm here!");
//     } 
//     else if (msg.content.startsWith("$$$wallet")) { 

//         console.log("!!! start watch");

//         wallet = msg.content.substring(10);
//         startWatch();
//     } 
//     else if (msg.content === "$$$stop$$$") { 
        
//         console.log("!!! stop watch");
//         stopWatch();
//       }
// })

// client.login(process.env.BOT_TOKEN)