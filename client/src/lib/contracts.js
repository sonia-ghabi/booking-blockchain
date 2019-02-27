import Web3 from 'web3';
import TruffleContract from 'truffle-contract';
import Hotel from '../contracts/Hotel.json';
import HotelFactory from '../contracts/HotelFactory.json';

const NETWORK_ADDR = 'http://localhost:7545';

const ethereum = window.ethereum;
let contracts = {};
let instances = {};

let address;
let web3;
ethereum.enable().then(enArr => {
  if (typeof ethereum !== 'undefined') {
    web3 = new Web3(ethereum);
    address = enArr[0];
    web3.currentProvider.publicConfigStore.on(
      'update',
      ({ selectedAddress }) => {
        address = selectedAddress;
      }
    );
  } else {
    console.log('No web3? You should consider trying MetaMask!');
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
    if (instances.Factory && contracts.Hotel) {
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
  async createHotel(name, stars, description) {
    const nameHex = web3.utils.asciiToHex(name);
    if (!instances || !instances.Factory) {
      throw new Error('Factory contract not loaded');
    }
    const txReceipt = await this.execute(
      instances.Factory.createContract,
      nameHex,
      stars,
      description
    );
    console.log(txReceipt);
    return txReceipt.logs[0].args.contractAddress;
  }

  async getHotel(address) {
    /*const hotelContract = new web3.eth.Contract(Hotel.abi, address);
    const tx = await hotelContract.methods.getHotel().call();
    return {
      id: address,
      name: web3.utils.hexToAscii(tx.hotelName),
      stars: Number(tx.hotelStars),
      description: tx.hotelDescription
    }*/

    const hotelContract = await contracts.Hotel.at(address);

    const tx = await hotelContract.getHotel.call();
    return {
      id: address,
      name: web3.utils.hexToAscii(tx.hotelName),
      stars: Number(tx.hotelStars),
      description: tx.hotelDescription
    };
  }

  listHotels() {
    if (!instances || !instances.Factory) {
      throw new Error('Factory contract not loaded');
    }
    return instances.Factory.listAllHotels.call({ from: address });
  }

  listMyHotels() {
    if (!instances || !instances.Factory) {
      throw new Error('Factory contract not loaded');
    }
    return instances.Factory.listMyHotels.call({ from: address });
  }

  async getRooms(address) {
    const hotelContract = await contracts.Hotel.at(address);
    const lastRoom = await hotelContract.currentRoomId();

    const roomsPromise = [];
    for (let i = 1; i <= lastRoom; i++) {
      roomsPromise.push(hotelContract.getRoom.call(i));
    }

    const rooms = await Promise.all(roomsPromise);

    return rooms.map((txResult, index) => ({
      id: index + 1,
      booked: txResult.booked,
      price: web3.utils.fromWei(txResult.price),
      priceCancellable: web3.utils.fromWei(txResult.priceCancellable)
    }));
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

    try {
      return this.executeWithMoney(
        hotelContract.book,
        price.toString(),
        roomId,
        dateStart,
        dateEnd,
        isCancellableBooking
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
    try {
      const roomArray = await hotelContract.availableRoomsForDates.call(
        start,
        end
      );
      return roomArray
        .map((available, i) => {
          if (available) return i + 1;
        })
        .filter(v => v !== undefined);
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

  async myBookings(hotelAddress) {
    const hotelContract = await contracts.Hotel.at(hotelAddress);
    return hotelContract.myBookings({ from: address });
  }

  async withdrawal(hotelAddress, dryRun = true) {
    const hotelContract = await contracts.Hotel.at(hotelAddress);

    if (dryRun) {
      return hotelContract.withdraw.call(Date.now(), {
        from: address
      });
    } else {
      console.log(address);
      return hotelContract.withdraw(
        Math.floor(Date.now() / 100, { from: address })
      );
    }
  }

  execute(func, ...param) {
    return func(...param, { from: address });
  }

  executeWithMoney(func, price, ...param) {
    const req = {
      from: address,
      value: web3.utils.toWei(price, 'ether')
    };

    return func(...param, req);
  }
}

const contractsManager = new ContractsManager();

export default contractsManager;
