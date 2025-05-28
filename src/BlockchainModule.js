// src/BlockchainModule.js
import Web3 from 'web3';
import ChatApp from './abis/ChatApp.json';

class BlockchainModule {
    constructor() {
        this.web3 = null;
        this.state = {
            accounts: [],
            account: '',
            chatContract: null
        };
    }

    async initialize() {
        await this.loadWeb3();
        await this.loadBlockchainData();
    }

    async loadWeb3() {
        if (window.ethereum) {
            console.log('Using MetaMask');
            this.web3 = new Web3(window.ethereum);
            await window.ethereum.request({ method: 'eth_requestAccounts' });
        } else {
            console.log('Using Ganache');
            this.web3 = new Web3('ws://localhost:7545');
        }
        console.log('Web3 version:', Web3.version);
    }

    async loadBlockchainData() {
        const web3 = this.web3;
        try {
            const accounts = await web3.eth.getAccounts();
            this.state.accounts = accounts;
            this.state.account = accounts[0];

            const networkId = await web3.eth.net.getId();
            const chatAppData = ChatApp.networks[networkId];
            if (chatAppData) {
                this.state.chatContract = new web3.eth.Contract(ChatApp.abi, chatAppData.address);
                console.log('Chat contract initialized at:', chatAppData.address);
            } else {
                throw new Error(`Contract not deployed to network ${networkId}`);
            }
        } catch (error) {
            console.error('Error in loadBlockchainData:', error);
            throw error;
        }
    }

    async sendMessage(to, message) {
        try {
            await this.state.chatContract.methods.sendMsg(to, message).send({ from: this.state.account });
            console.log(`Message "${message}" sent to ${to} from ${this.state.account}`);
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    async getMessages(to) {
        try {
            await this.state.chatContract.methods.getAllMsg(to).send({ from: this.state.account });
            return new Promise((resolve) => {
                this.state.chatContract.once('messagesFetchedEvent', {
                    filter: { from: this.state.account, to }
                }, (error, event) => {
                    if (error) {
                        console.error('Error fetching messages:', error);
                        throw error;
                    }
                    const messages = event.returnValues.messages.map(msg => msg.message);
                    resolve(messages);
                });
            });
        } catch (error) {
            console.error('Error in getMessages:', error);
            throw error;
        }
    }

    async logAllAccounts() {
        try {
            if (!this.web3) {
                throw new Error('Web3 is not initialized. Call initialize() first.');
            }
            const accounts = await this.web3.eth.getAccounts();
            console.log('All accounts in the network:');
            for (let i = 0; i < accounts.length; i++) {
                const balance = await this.web3.eth.getBalance(accounts[i]);
                console.log(`Account ${i + 1}: ${accounts[i]} - Balance: ${this.web3.utils.fromWei(balance, 'ether')} ETH`);
            }
            return accounts;
        } catch (error) {
            console.error('Error fetching accounts:', error);
            throw error;
        }
    }

    async sendMessageFromTo(from, to, message) {
        try {
            if (!this.state.chatContract) {
                throw new Error('Chat contract is not initialized. Call initialize() first.');
            }
            if (!this.state.accounts.includes(from)) {
                throw new Error('Sender address is not available in the network');
            }
            await this.state.chatContract.methods.sendMsg(to, message).send({ from });
            console.log(`Message sent from ${from} to ${to}: ${message}`);
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    // Новый метод для получения баланса
    async getBalance(account) {
        try {
            const balance = await this.web3.eth.getBalance(account);
            return this.web3.utils.fromWei(balance, 'ether');
        } catch (error) {
            console.error('Error fetching balance:', error);
            throw error;
        }
    }
}

export default BlockchainModule;