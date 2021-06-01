require('dotenv').config()
const BlocknativeSdk = require('bnc-sdk');
const WebSocket = require('ws');
const Web3 = require('web3');

const networkId = process.env.NETWORK_ID || '1';
const explorerLink = process.env.EXPLORER_LINK || 'https://etherscan.io';
const TIMEOUT_ERC20_WATCH = process.env.TIMEOUT_ERC20_WATCH || 3000;
const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017/watch';
const ETHPROVIDER = process.env.ETHPROVIDER || 'https://eth-mainnet.alchemyapi.io/v2/W8LiSkJzpKaK6MK0f0APBRxTiBClQf47';

const mongoose = require('mongoose');
mongoose.connect(MONGODB_URL, {useNewUrlParser: true, useUnifiedTopology: true});
const addressSchema = new mongoose.Schema({
    address: String,
    label: String
});
const settingSchema = new mongoose.Schema({
	name: String,
    value: String,
});
const Address = mongoose.model('address', addressSchema);
const Setting = mongoose.model('setting', settingSchema);

const db = mongoose.connection;

// ----- WATCH ERC20 TOKEN ----
const web3 = new Web3(new Web3.providers.HttpProvider(ETHPROVIDER));
const eth = web3.eth;
var tokenInterface = [{"type": "function","name": "name","constant": true,"inputs": [],"outputs": [{"name": "","type": "string"}]},{"type": "function","name": "decimals","constant": true,"inputs": [],"outputs": [{"name": "","type": "uint8"}]},{"type": "function","name": "balanceOf","constant": true,"inputs": [{"name": "","type": "address"}],"outputs": [{"name": "","type": "uint256"}]},{"type": "function","name": "symbol","constant": true,"inputs": [],"outputs": [{"name": "","type": "string"}]},{"type": "function","name": "transfer","constant": false,"inputs": [{"name": "_to","type": "address"},{"name": "_value","type": "uint256"}],"outputs": []},{"type": "constructor","inputs": [{"name": "_supply","type": "uint256"},{"name": "_name","type": "string"},{"name": "_decimals","type": "uint8"},{"name": "_symbol","type": "string"}]},{"name": "Transfer","type": "event","anonymous": false,"inputs": [{"indexed": true,"name": "from","type": "address"},{"indexed": true,"name": "to","type": "address"},{"indexed": false,"name": "value","type": "uint256"}]}];
const tokenContract = new eth.Contract(tokenInterface);

var checkErc20Status = false;
// ----- WATCH ERC20 TOKEN ----


var lowestBlock = undefined;

// blocknative initialize

const options = {
    dappId: process.env.DAPP_ID,
    networkId: parseInt(networkId),
    system: 'ethereum', // optional, defaults to ethereum
    ws: WebSocket, // only neccessary in server environments
    name: 'Mempool Explorer', // optional, use when running multiple instances
	onerror: function(error) { console.error(error); }
};

const blocknative = new BlocknativeSdk(options)

var isRestored = false;

const Discord = require('discord.js');
const client = new Discord.Client({
    partials: ['MESSAGE ']
});


// ----- WATCH ERC20 TOKEN ---------
const checkErc20 = async (channel) => {

    console.log('checkErc20 start');
	try {
		if (!checkErc20Status)
			return;
		
		var highestBlock = await eth.getBlock("latest");
		if(!highestBlock)
			return;

		highestBlock = highestBlock.number
		if (!lowestBlock)
			lowestBlock = highestBlock;

		for (var x=lowestBlock; x < highestBlock + 1; x++) {

			console.log(`lowest: ${lowestBlock}, highest: ${highestBlock}, current: ${x}`);

			var block = await eth.getBlock(x)
			if(block == null)   continue;
			
			var transactions = block.transactions;
			console.log('transaction length: ' + transactions.length);

			for (var y=0; y < transactions.length; y++) {
				console.log(`block: ${x}, transaction: ${y}`);

				if (!checkErc20Status) {
					return;
				}

				var contract = await eth.getTransactionReceipt(transactions[y]);
				if (contract == null) continue;

				var contractAddr = contract.contractAddress;
				if (contractAddr != null) {

					console.log('contract address ' + contractAddr);

					tokenContract.options.address = contractAddr;

					var symbol = "";
					var decimals = "";
					var name = "";
					try {
						symbol = await tokenContract.methods.symbol().call();
					} catch(err) {
						//don't do anything here, just catch the error so program doesn't die
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

						var tx = {
							'Name': name,
							'Symbol': symbol,
							'Decimals': decimals,
							'Contract Address': `[${contractAddr}](${explorerLink}/token/${contractAddr})`,
							'Deployer Address': `[${contract.from}](${explorerLink}/address/${contract.from})`
						};
						var log = JSON.stringify(tx, null, 4);
						console.log(log);

						const embed = new Discord.MessageEmbed()
						.setDescription(log);
						channel.send(embed);
					}
				}
			}
		}

		lowestBlock = highestBlock + 1;
	}
	catch (exception) { console.error(exception) }

    if (checkErc20Status)
        setTimeout(() => {checkErc20(channel)}, TIMEOUT_ERC20_WATCH);
}
// ----- WATCH ERC20 TOKEN ---------

const registerBlocknative = (address, label, channel) => {

	const { emitter } = blocknative.account(address)
	
	emitter.on('all', transaction => {
		console.log('emit 1');

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
		};
		var log = JSON.stringify(tx, null, 4);
		console.log(transaction);
		
		const embed = new Discord.MessageEmbed()
		.setDescription(log);
		channel.send(embed);
	});
	channel.send(`Started watch on address ${address}`)
}

const restoreWatch = async (channel) => {
	
	try {
		if (isRestored) {
			channel.send('You have already restored');
			return;
		}

		const addresses = await Address.find({});
		for (var i = 0; i < addresses.length; i++) {

			const addressEntry = addresses[i];
			const address = addressEntry.address;
			const label = addressEntry.label;
			
			registerBlocknative(address, label, channel);
		}
		
		isRestored = true;
	} catch (exception) { console.error(exception) }
}

const startWatch = async (address, label, channel) => {

	try {
		if (!isRestored) {
			channel.send('Please call restore first!');
			return;
		}
		
		if (label && label.length > 0) {
			const addressEntry = await Address.findOne({label: label});
			if (addressEntry) {
				channel.send('Duplicated label!');
				return;
			}
		}

		const addressEntry = await Address.findOne({address: address});
		if (addressEntry) {
			channel.send('Duplicated address!');
			return;
		}
		
		
		label = label ? label : '';
		const newAddress = new Address({address: address, label: label});
		newAddress.save();

		registerBlocknative(address, label, channel);
	} catch (exception) { console.error(exception) }
}

const stopWatchByAddress = async (address, channel) => {

	try {
		if (!isRestored) {
			channel.send('Please call restore first!');
			return;
		}
		
		if (!address || address.length == 0) {
			channel.send('Address is not valid!');
			return;
		}

		const addressEntry = await Address.findOne({address: address});

		if (!addressEntry) {
			channel.send('No registered address found!');
			return;
		}

		var address = addressEntry.address;
		
		try {
			blocknative.unsubscribe(address)
		} catch (e) {}
		addressEntry.delete();

		channel.send(`Stopped watch on address ${address}`)
	} catch (exception) { console.error(exception) }
}

const stopWatchByLabel = async (label, channel) => {
	
	try {
		if (!isRestored) {
			channel.send('Please call restore first!');
			return;
		}
		
		if (!label || label.length == 0) {
			channel.send('Label is not valid!');
			return;
		}
		const addressEntry = await Address.findOne({label: label});

		if (!addressEntry) {
			channel.send('No registered label found!');
			return;
		}

		var address = addressEntry.address;
		
		try {
			blocknative.unsubscribe(address)
		} catch (e) {}
		addressEntry.delete();

		channel.send(`Stopped watch on address ${address}`)
	} catch (exception) { console.error(exception) }
}

const showWatchList = async (channel) => {

	try {
		if (!isRestored) {
			channel.send('Please call restore first!');
			return;
		}

		const addresses = await Address.find({});

		log = 'Watch List\n';
		for (var i = 0; i < addresses.length; i++) {
			log += addresses[i].address + '\t ' + addresses[i].label + '\n';
		}

		const embed = new Discord.MessageEmbed()
		.setDescription(log);
		channel.send(embed);
	} catch (exception) { console.error(exception) }
}

const startWatchTokens = (channel) => {

	try {
		
		if (checkErc20Status) {
			channel.send('Already watching erc20 tokens!');
			return;
		}
	
		lowestBlock = undefined;
		checkErc20Status = true;
		checkErc20(channel);

		channel.send(`Started watch ERC20 tokens.`);
	} catch (exception) { console.error(exception) }
}

const stopWatchTokens = (channel) => {

	try {
		checkErc20Status = false;

		channel.send(`Stopped watch ERC20 tokens.`);
	} catch (exception) { console.error(exception) }
}


const setWeb3Provider = async (url, channel) => {

	var bStatus = web3.setProvider(new Web3.providers.HttpProvider(url));

	if (bStatus == true) {

		const settingEntry = await Setting.findOne({name: 'providerUrl'});
		settingEntry.value = url;
		settingEntry.save();

		channel.send('Provider is updated!');
	}
	else {
		channel.send('Error occured in provide update');
	}
}

const getWeb3Provider = async (channel) => {
	
	const settingEntry = await Setting.findOne({name: 'providerUrl'});
	if (settingEntry) {
		channel.send('Provider: ' + settingEntry.value);
	}
	else {
		channel.send('No provider information is saved on db.')
	}
}

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', async function() {

    console.log('db is connected!')
	const settingEntry = await Setting.findOne({name: 'providerUrl'});

	if (settingEntry) {
		web3.setProvider(new Web3.providers.HttpProvider(settingEntry.value));
		console.log('loaded db provider and set');
	}
	else {		
		const newSetting = new Setting({name: 'providerUrl', value: ETHPROVIDER});
		newSetting.save();
		console.log('added provider entry in Settings collection');
	}
});

client.on("ready", () => {
    console.log("Watch Bot is ready")
})

client.on("message", msg => {
	try {
		if (msg.content === "!watch-test") {

			msg.reply("I'm here!");
		}
		else if (msg.content.startsWith("!watch ")) { 

			console.log("!!! start watch");

			parts = msg.content.split(' ');
			
			if(parts.length > 1 && parts[1].startsWith('0x')) {
				startWatch(parts[1], parts[2], msg.channel);
			}
			else {
				msg.channel.send('Invalid command');
			}
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
		else if (msg.content == "!restore-watch") { 
			
			console.log("!!! restore watch");
			restoreWatch(msg.channel);
		}
		else if (msg.content == "!watch-tokens") {

			console.log("!!! start watch tokens")
			startWatchTokens(msg.channel);
		}
		else if (msg.content == "!unwatch-tokens") {

			console.log("!!! stop watch tokens")
			stopWatchTokens(msg.channel);
		}
		else if (msg.content.startsWith("!set-provider ")) { 

			console.log("!!! set provider");

			parts = msg.content.split(' ');
			
			if(parts.length > 1 && parts[1].startsWith('https://')) {
				setWeb3Provider(parts[1], msg.channel);
			}
			else {
				msg.channel.send('Invalid command');
			}
		}
		else if (msg.content == "!get-provider") {

			console.log("!!! get provider")
			getWeb3Provider(msg.channel);
		}
	} catch (exception) { console.error(exception) }
})

client.login(process.env.BOT_TOKEN)