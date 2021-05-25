require('dotenv').config()
const fetch = require('node-fetch')
const BlocknativeSdk = require('bnc-sdk');
const WebSocket = require('ws');
const Web3 = require('web3');

const INTERVAL = process.env.INTERVAL || 2000;
const networkId = process.env.NETWORK_ID || '1';
const explorerLink = process.env.EXPLORER_LINK || 'https://etherscan.io';
const TIMEOUT_ERC20_WATCH = process.env.TIMEOUT_ERC20_WATCH || 3000;

// ----- WATCH ERC20 TOKEN ----
const web3 = new Web3(new Web3.providers.HttpProvider('https://mainnet.infura.io/v3/d806e5e933d34d399b4b3e5f7208e633'));
const eth = web3.eth;
var tokenInterface = [{"type": "function","name": "name","constant": true,"inputs": [],"outputs": [{"name": "","type": "string"}]},{"type": "function","name": "decimals","constant": true,"inputs": [],"outputs": [{"name": "","type": "uint8"}]},{"type": "function","name": "balanceOf","constant": true,"inputs": [{"name": "","type": "address"}],"outputs": [{"name": "","type": "uint256"}]},{"type": "function","name": "symbol","constant": true,"inputs": [],"outputs": [{"name": "","type": "string"}]},{"type": "function","name": "transfer","constant": false,"inputs": [{"name": "_to","type": "address"},{"name": "_value","type": "uint256"}],"outputs": []},{"type": "constructor","inputs": [{"name": "_supply","type": "uint256"},{"name": "_name","type": "string"},{"name": "_decimals","type": "uint8"},{"name": "_symbol","type": "string"}]},{"name": "Transfer","type": "event","anonymous": false,"inputs": [{"indexed": true,"name": "from","type": "address"},{"indexed": true,"name": "to","type": "address"},{"indexed": false,"name": "value","type": "uint256"}]}];
const tokenContract = new eth.Contract(tokenInterface);

var checkErc20Status = false;
// ----- WATCH ERC20 TOKEN ----


var lowestBlock = undefined;

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


// ----- WATCH ERC20 TOKEN ---------
const checkErc20 = async (channel) => {

    console.log('checkErc20 start');

    if (!checkErc20Status)
        return;
    
    var highestBlock = (await eth.getBlock("latest")).number;

    if (!lowestBlock)
        lowestBlock = highestBlock;

    console.log(`lowest: ${lowestBlock}, highest: ${highestBlock}`);

    for (var x=lowestBlock; x < highestBlock + 1; x++) {

        var transactions = (await eth.getBlock(x)).transactions;
        console.log(transactions.length);

        for (var y=0; y < transactions.length; y++) {
            console.log('test', 'transaction ' + y);

            var contract = await eth.getTransactionReceipt(transactions[y]);
            if (contract == null) continue;

            var contractAddr = contract.contractAddress;
            if (contractAddr != null) {

                console.log('test', 'contract address ' + contractAddr);

                tokenContract.options.address = contractAddr;

                var symbol = "";
                var decimals = "";
                var name = "";
                try {
                    symbol = await tokenContract.methods.symbol().call();
                } catch(err) {
                }
                try {
                    decimals = await tokenContract.methods.decimals().call();
                } catch(err) {
                //don't do anything here, just catch the error so program doesn't die
                }
                try {
                    name = await tokenContract.methods.name().call();
                } catch(err) {
                    //don't do anything here, just catch the error so program doesn't die
                }
                if (symbol != null && symbol != "" && name != null && name != "") {
                    var log = "";
                    log += "-----------\n";
                    log += "Contract Address: " + contractAddr + '\n';
                    log += "Name: " + name + '\n';
                    log += "Symbol: " + symbol + '\n';
                    log += "Decimals: " + decimals + '\n';
                    log += "-----------";
                    console.log(log);

                    const embed = new Discord.MessageEmbed()
                    .setDescription(log);
                    channel.send(embed);
                }
            }
        }
    }

    lowestBlock = highestBlock + 1;


    if (checkErc20Status)
        setTimeout(checkErc20, TIMEOUT_ERC20_WATCH);
}
// ----- WATCH ERC20 TOKEN ---------


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
    
    emitter.on('all', transaction => {

        var tx = {
            name: label,
            status: transaction.status,
            hash: `[${transaction.hash}](${explorerLink}/tx/${transaction.hash})`,
            from: `[${transaction.from}](${explorerLink}/address/${transaction.from})`,
            to: `[${transaction.to}](${explorerLink}/address/${transaction.to})`,
            value: transaction.value,
            timeStamp: transaction.timeStamp,
            gasPriceGwei: transaction.gasPriceGwei,
            contractCall: transaction.contractCall
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
    });

    channel.send(`Started watch on address ${address}`)
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

    channel.send(`Stopped watch on address ${address}`)
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

    channel.send(`Stopped watch on address ${address}`)
}

const showWatchList = (channel) => {

    log = 'Watch List\n';
    for (var i = 0; i < addresses.length; i++) {
        log += addresses[i] + '\t ' + labels[i] + '\n';
    }

    const embed = new Discord.MessageEmbed()
    .setDescription(log);
    channel.send(embed);
}

const startWatchTokens = (channel) => {

    checkErc20Status = true;
    checkErc20(channel);

    channel.send(`Started watch ERC20 tokens.`);
}

const stopWatchTokens = (channel) => {

    checkErc20Status = false;

    channel.send(`Stopped watch ERC20 tokens.`);
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
    else if (msg.content.startsWith("!unwatch ")) { 
        
        console.log("!!! stop watch");
        
        parts = msg.content.split(' ');

        if (parts.length > 0) {
            if (parts[1].startsWith('0x'))
                stopWatchByAddress(parts[1], msg.channel);
            else
                stopWatchByLabel(parts[1], msg.channel);
        }
    }
    else if (msg.content == "!watch-list") { 
        
        console.log("!!! watch list");
        showWatchList(msg.channel);
    }
    else if (msg.content == "!watch-tokens") {

        console.log("!!! start watch tokens")
        startWatchTokens(msg.channel);
    }
    else if (msg.content == "!unwatch-tokens") {

        console.log("!!! stop watch tokens")
        stopWatchTokens(msg.channel);
    }
})

client.login(process.env.BOT_TOKEN)


// startWatch('0x05fF2B0DB69458A0750badebc4f9e13aDd608C7F') // z3
// startWatch('0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2') // etherscan
