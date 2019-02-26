import Web3 from 'web3';
import TruffleContract from 'truffle-contract';
import Hotel from '../contracts/Hotel.json';
import HotelFactory from '../contracts/HotelFactory.json';

const NETWORK_ADDR = 'http://localhost:7545';

export default class Contracts {
  static instance;

  constructor() {
    if (Contracts.instance) {
      return Contracts.instance;
    }

    const ethereum = window.ethereum;
    ethereum.enable().then(enArr => {
      if (typeof ethereum !== 'undefined') {
        this.web3 = new Web3(ethereum);
        this.address = enArr[0];
      } else {
        console.log('No web3? You should consider trying MetaMask!');
        // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
        this.web3 = new Web3(new Web3.providers.HttpProvider(NETWORK_ADDR));
        this.address = this.web3.eth.defaultAccount;
      }

      this.contracts = {};
      const instances = {};
      this.contracts.Factory = TruffleContract(HotelFactory);

      this.contracts.Factory.setProvider(ethereum);
      this.contracts.Factory.deployed().then(factoryInstance => {
        instances.Factory = factoryInstance;
      });
      this.instances = instances;

      this.contracts.Hotel = TruffleContract(Hotel);
      this.contracts.Hotel.setProvider(ethereum);
    });

    this.instance = this;
  }

  async createHotel(hotelName) {
    hotelName = this.web3.utils.asciiToHex(hotelName);
    if (!this.instances || !this.instances.Factory) {
      throw new Error('Factory contract not loaded');
    }
    const txReceipt = await this.execute(
      this.instances.Factory.createContract,
      hotelName
    );
    return txReceipt.logs[0].args.contractAddress;
  }

  listHotel() {
    if (!this.instances || !this.instances.Factory) {
      throw new Error('Factory contract not loaded');
    }
    return this.instances.Factory.listHotel.call({ from: this.address });
  }

  /*getBalance() {
    var address =  "0x69300b549410774281d88450DB9F27c317ac5A4b";// "0xFcaD0ca9C3BEfC0Ec8acCA441260a5795648c9b5"; //
    var meta;
    App.contracts.Booking.deployed().then(function(instance) {
      meta = instance;
      return web3.eth.getBalance(instance.address, function(err, transactionHash) {
        if (!err)
          console.log(transactionHash.c[0]); 
      });
    });
  }*/

  async addRoom(price, cancellable, address) {
    const weiPrice = this.web3.utils.toWei(price);
    const weiCancellable = this.web3.utils.toWei(cancellable);
    const hotelContract = await this.contracts.Hotel.at(address);
    try {
      const txReceipt = await this.execute(
        hotelContract.addRoom,
        price,
        cancellable
      );
      return txReceipt.logs[0].args.roomId.toString(10);
    } catch (e) {
      console.error(e);
    }
  }

  async book(
    roomId,
    hotelAddress,
    isCancellableBooking,
    price,
    dateStart,
    dateEnd
  ) {
    const hotelContract = await this.contracts.Hotel.at(hotelAddress);
    const toCall = isCancellableBooking
      ? hotelContract.freeCancellation
      : hotelContract.booking;
    try {
      console.log(price);
      await this.executeWithMoney(
        toCall,
        price.toString(),
        roomId,
        dateStart,
        dateEnd
      );
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  async checkAvailability(hotelAddress, roomId, start, end) {
    const hotelContract = await this.contracts.Hotel.at(hotelAddress);
    console.log(hotelAddress);
    console.log(roomId);
    console.log(start);
    console.log(end);
    try {
      return await hotelContract.isAvailableForDates.call(roomId, start, end);
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  execute(func, ...param) {
    return func(...param, { from: this.address });
  }

  executeWithMoney(func, price, ...param) {
    const req = {
      from: this.address,
      value: this.web3.utils.toWei(price, 'ether')
    };
    console.log(req.value);
    return func(...param, req);
  }
}
