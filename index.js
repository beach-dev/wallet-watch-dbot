require('dotenv').config()
const fetch = require('node-fetch')
const BlocknativeSdk = require('bnc-sdk');
const WebSocket = require('ws');

// blocknative initialize

var addresses = [];
var labels = [];

const options = {
    dappId: process.env.DAPP_ID,
    networkId: 56,
    system: 'ethereum', // optional, defaults to ethereum
    ws: WebSocket, // only neccessary in server environments
    name: 'Mempool Explorer' // optional, use when running multiple instances
};

const blocknative = new BlocknativeSdk(options)

var lastlog = '';
var lasttime = new Date().getTime();

const Discord = require('discord.js');
const client = new Discord.Client({
    partials: ['MESSAGE ']
});

const startWatch = (address, label, channel) => {

    if (label && label.length > 0 && labels.indexOf(label) >= 0) {
        channel.send('Duplicated label!');
        return;
    }

    if (addresses.indexOf(address) >= 0) {
        channel.send('Duplicated address!');
        return;
    }
    
    var index = addresses.push(address) - 1;
    labels[index] = label;

    const { emitter } = blocknative.account(address)
    
    emitter.on('all', transaction => {

        var log = `Transaction event: ${transaction.eventCode}`;
        console.log(log);

        lastlog += log + '\n';

        var currentTime = new Date().getTime();
        if (currentTime - lasttime > 2000) {
            channel.send(lastlog);
            lastlog = '';
            lasttime = currentTime;
        }
    })
}

const stopWatchByAddress = (address, channel) => {

    if (!address || address.length == 0) {
        channel.send('Address is not valid!');
        return;
    }
    var index = addresses.indexOf(address);

    if (index < 0) {
        channel.send('No registered address found!');
        return;
    }

    var address = addresses[index];
    
    blocknative.unsubscribe(address)
    labels.splice(index, 1);
    addresses.splice(index, 1);
}

const stopWatchByLabel = (label, channel) => {

    if (!label || label.length == 0) {
        channel.send('Label is not valid!');
        return;
    }
    var index = labels.indexOf(label);

    if (index < 0) {
        channel.send('No registered label found!');
        return;
    }

    var address = addresses[index];
    
    blocknative.unsubscribe(address)
    labels.splice(index, 1);
    addresses.splice(index, 1);
}

client.on("ready", () => {
    console.log("Watch Bot is ready")
})

client.on("message", msg => {
    if (msg.content === "!watch-test") {

        msg.reply("I'm here!");
    } 
    else if (msg.content.startsWith("!watch ")) { 

        console.log("!!! start watch");

        parts = msg.content.split(' ');
        startWatch(parts[1], parts[2], msg.channel);
    } 
    else if (msg.content.startsWith("!stopl ")) { 
        
        console.log("!!! stop watch by label");
        
        parts = msg.content.split(' ');
        stopWatchByLabel(parts[1], msg.channel);
    } 
    else if (msg.content.startsWith("!stopa ")) { 
        
        console.log("!!! stop watch by address");
        
        parts = msg.content.split(' ');
        stopWatchByAddress(parts[1], msg.channel);
    }
})

client.login(process.env.BOT_TOKEN)


// startWatch('0x05fF2B0DB69458A0750badebc4f9e13aDd608C7F') // z3
// startWatch('0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2') // etherscan
