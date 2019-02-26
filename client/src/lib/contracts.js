import Web3 from "web3";
import TruffleContract from "truffle-contract";
import Hotel from "../contracts/Hotel.json";
import HotelFactory from "../contracts/HotelFactory.json";

const NETWORK_ADDR = "http://localhost:7545";

const ethereum = window.ethereum;
let contracts = {};
let instances = {};

let address;
let web3;
ethereum.enable().then(enArr => {
  if (typeof ethereum !== "undefined") {
    web3 = new Web3(ethereum);
    address = enArr[0];
  } else {
    console.log("No web3? You should consider trying MetaMask!");
    // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
    web3 = new Web3(new Web3.providers.HttpProvider(NETWORK_ADDR));
    address = web3.eth.defaultAccount;
  }

  contracts.Factory = TruffleContract(HotelFactory);

  contracts.Factory.setProvider(ethereum);
  contracts.Factory.deployed().then(factoryInstance => {
    instances.Factory = factoryInstance;
  });

  contracts.Hotel = TruffleContract(Hotel);
  contracts.Hotel.setProvider(ethereum);
});

export function isReady() {
  const check = res => {
    if (instances.Factory) {
      res();
    } else {
      setTimeout(() => check(res), 500);
    }
  };
  return new Promise((res, rej) => {
    check(res);
  });
}

class ContractsManager {
  async createHotel(hotelName) {
    hotelName = web3.utils.asciiToHex(hotelName);
    if (!instances || !instances.Factory) {
      throw new Error("Factory contract not loaded");
    }
    const txReceipt = await this.execute(
      instances.Factory.createContract,
      hotelName
    );
    return txReceipt.logs[0].args.contractAddress;
  }

  listHotels() {
    if (!instances || !instances.Factory) {
      throw new Error("Factory contract not loaded");
    }
    return instances.Factory.listAllHotels.call({ from: address });
  }

  listMyHotels() {
    if (!instances || !instances.Factory) {
      throw new Error("Factory contract not loaded");
    }
    console.log(address);
    return instances.Factory.listMyHotels.call({ from: address });
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
    const weiPrice = web3.utils.toWei(price);
    const weiCancellable = web3.utils.toWei(cancellable);
    const hotelContract = await contracts.Hotel.at(address);
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
    const hotelContract = await contracts.Hotel.at(hotelAddress);
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
    const hotelContract = await contracts.Hotel.at(hotelAddress);
    try {
      return await hotelContract.isAvailableForDates.call(roomId, start, end);
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  async availableRooms(hotelAddress, start, end) {
    const hotelContract = await contracts.Hotel.at(hotelAddress);
    console.log(start, end);
    try {
      return await hotelContract.availableRoomsForDates.call(start, end);
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  async cancel(hotelAddress, bookingId) {
    const hotelContract = await contracts.Hotel.at(hotelAddress);
    try {
      return await hotelContract.cancel.call(bookingId);
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  execute(func, ...param) {
    return func(...param, { from: address });
  }

  executeWithMoney(func, price, ...param) {
    console.log(address);
    const req = {
      from: address,
      value: web3.utils.toWei(price, "ether")
    };

    return func(...param, req);
  }
}

const contractsManager = new ContractsManager();

export default contractsManager;
