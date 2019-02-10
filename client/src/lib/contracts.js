import Web3 from "web3";
import TruffleContract from "truffle-contract";
import Hotel from "../contracts/Hotel.json";
import HotelFactory from "../contracts/HotelFactory.json";

const NETWORK_ADDR = "http://localhost:7545";

export default class Contracts {
  static instance;

  constructor() {
    if (Contracts.instance) {
      return Contracts.instance;
    }

    const ethereum = window.ethereum;
    ethereum.enable().then(enArr => {
      if (typeof ethereum !== "undefined") {
        this.web3 = new Web3(ethereum);
        this.address = enArr[0];
      } else {
        console.log("No web3? You should consider trying MetaMask!");
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
    if (!this.instances.Factory) {
      throw new Error("Factory contract not loaded");
    }
    const bla = await this.execute(
      this.instances.Factory.createContract,
      hotelName
    );
    return bla.logs[0].args.contractAddress;
  }

  listHotel() {
    if (this.instances.Factory) {
      throw new Error("Factory contract not loaded");
    }
    return this.instances.Factory.listHotel.call();
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
    const hotelContract = await this.contracts.Hotel.at(address);
    try {
      return this.execute(hotelContract.addRoom, price, cancellable);
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
      : hotelContract.book;
    try {
      await this.executeWithMoney(toCall, price, roomId, dateStart, dateEnd);
    } catch (e) {
      console.error(e);
    }
  }

  execute(func, ...param) {
    console.log(param);
    return func(...param, { from: this.address });
  }

  executeWithMoney(func, price, ...param) {
    const req = {
      from: this.address,
      value: this.web3.toWei(price, "ether")
    };
    return func(...param, req);
  }
}
