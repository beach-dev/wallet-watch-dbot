require('dotenv').config()
const fetch = require('node-fetch')
const BlocknativeSdk = require('bnc-sdk');
const WebSocket = require('ws');

const INTERVAL = process.env.INTERVAL || 2000;
const networkId = process.env.NETWORK_ID || '1';
const explorerLink = process.env.EXPLORER_LINK || 'https://etherscan.io';

// blocknative initialize

var addresses = [];
var labels = [];

const options = {
    dappId: process.env.DAPP_ID,
    networkId: parseInt(networkId),
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
    label = label ? label : '';
    labels[index] = label;

    const { emitter } = blocknative.account(address)
    
    emitter.on('txConfirmed', transaction => {

        var tx = {
            name: label,
            hash: `[${transaction.hash}](${explorerLink}/tx/${transaction.hash})`,
            from: `[${transaction.from}](${explorerLink}/address/${transaction.from})`,
            to: `[${transaction.to}](${explorerLink}/address/${transaction.to})`,
            value: transaction.value,
            // input: transaction.input
        };
        var log = JSON.stringify(tx, null, 4);
        console.log(transaction);

        // lastlog += log + '\n';

        // var currentTime = new Date().getTime();
        // if (currentTime - lasttime > INTERVAL) {
            
        //     const embed = new Discord.MessageEmbed()
        //     .setDescription(lastlog);
        //     channel.send(embed);
        //     lastlog = '';
        //     lasttime = currentTime;
        // }
        
        const embed = new Discord.MessageEmbed()
        .setDescription(log);
        channel.send(embed);
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

const showWatchList = (channel) => {

    log = 'Watch List';
    for (var i = 0; i < addresses.length; i++) {
        log += addresses[i] + '\t ' + labels[i] + '\n';
    }
    
    const embed = new Discord.MessageEmbed()
    .setDescription(log);
    channel.send(embed);
}

client.on("ready", () => {
    console.log("Watch Bot is ready")
})

client.on("message", msg => {
    if (msg.content === "!watch-test") {

        msg.reply("I'm here!");
        const embed = new Discord.MessageEmbed()
        .setDescription('[Link text](http://example.com)');
        msg.channel.send(embed)
        // msg.channel.send('[Link text](http://example.com)')
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
    else if (msg.content.startsWith("!watch-list ")) { 
        
        console.log("!!! watch list");
        showWatchList(msg.channel);
    }
})

client.login(process.env.BOT_TOKEN)


// startWatch('0x05fF2B0DB69458A0750badebc4f9e13aDd608C7F') // z3
// startWatch('0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2') // etherscan
