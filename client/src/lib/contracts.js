import Web3 from "web3";
import TruffleContract from "truffle-contract";
import Hotel from "../contracts/Hotel.json";
import HotelFactory from "../contracts/HotelFactory.json";

const NETWORK_ADDR = process.env.REACT_APP_NETWORK_ADDR;

let web3;

// Initialize local static variables
// Keep all the contracts definitions
let contracts = {};
// Keep all the contract instances
let instances = {};
// The user address
let address;

// Initialize web3 provider (through Metamask if possible)
const ethereum = window.ethereum;
ethereum.enable().then(enArr => {
  if (typeof ethereum !== "undefined") {
    web3 = new Web3(ethereum);
    address = enArr[0];

    // Subscribe to an event to update the user address when changing wallets
    web3.currentProvider.publicConfigStore.on(
      "update",
      ({ selectedAddress }) => {
        address = selectedAddress;
      }
    );
  } else {
    console.log("No web3? You should consider trying MetaMask!");
    web3 = new Web3(new Web3.providers.HttpProvider(NETWORK_ADDR));
    address = web3.eth.defaultAccount;
  }

  // Load Hotel Factory contract and instanciate it
  contracts.Factory = TruffleContract(HotelFactory);
  contracts.Factory.setProvider(ethereum);
  contracts.Factory.deployed().then(factoryInstance => {
    instances.Factory = factoryInstance;
  });

  // Load Hotel contract (to be instantiated by hotel id)
  contracts.Hotel = TruffleContract(Hotel);
  contracts.Hotel.setProvider(ethereum);
});

// Resolves when contracts are ready and loaded
export function isReady() {
  const check = res => {
    if (instances.Factory && contracts.Hotel) {
      res();
    } else {
      setTimeout(() => check(res), 200);
    }
  };
  return new Promise((res, rej) => {
    check(res);
  });
}

// Class with functions to interact with our contracts
class ContractsManager {
  // Creates a new hotel
  async createHotel(name, stars, description) {
    const nameHex = web3.utils.asciiToHex(name);
    const txReceipt = await this.execute(
      instances.Factory.createContract,
      nameHex,
      stars,
      description
    );

    return txReceipt.logs[0].args.contractAddress;
  }

  // Add a room to a hotel
  async addRoom(price, cancellable, address) {
    const weiPrice = web3.utils.toWei(price);
    const weiCancellable = web3.utils.toWei(cancellable);
    const hotelContract = await contracts.Hotel.at(address);
    const txReceipt = await this.execute(
      hotelContract.addRoom,
      weiPrice,
      weiCancellable
    );
    return txReceipt.logs[0].args.roomId.toString(10);
  }

  // Get a hotel details from it's address
  async getHotel(address) {
    const hotelContract = await contracts.Hotel.at(address);
    const tx = await hotelContract.getHotel.call();
    return {
      id: address,
      name: web3.utils.hexToAscii(tx.hotelName),
      stars: Number(tx.hotelStars),
      description: tx.hotelDescription
    };
  }

  // List all the hotels
  listHotels() {
    return instances.Factory.listAllHotels.call({ from: address });
  }

  // List all the hotels belonging to the caller
  listMyHotels() {
    return instances.Factory.listMyHotels.call({ from: address });
  }

  // Get all the rooms from a hotel
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

  // Book a room
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

  // Check a room availability between two dates
  async checkAvailability(hotelAddress, roomId, start, end) {
    const hotelContract = await contracts.Hotel.at(hotelAddress);
    return await hotelContract.isAvailableForDates.call(roomId, start, end);
  }

  // Get all the available rooms between two dates
  async availableRooms(hotelAddress, start, end) {
    const hotelContract = await contracts.Hotel.at(hotelAddress);
    const roomArray = await hotelContract.availableRoomsForDates.call(
      start,
      end
    );
    return roomArray
      .map((available, i) => {
        if (available) return i + 1;
      })
      .filter(v => v !== undefined);
  }

  // Cancels a booking
  async cancel(hotelAddress, bookingId) {
    const hotelContract = await contracts.Hotel.at(hotelAddress);
    try {
      return await hotelContract.cancel(bookingId, { from: address });
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  // Get all bookings from one hotel for a user
  async myBookings(hotelAddress) {
    const hotelContract = await contracts.Hotel.at(hotelAddress);
    return hotelContract.listUserBookings({ from: address });
  }

  // Get all the bookings from many hotels for a user
  async getMyBookingsFromHotels(hotelIds) {
    const bookingsArray = await Promise.all(
      hotelIds.map(async id => {
        const bookings = await this.myBookings(id);
        const bookingObjects = [];
        for (let i = 0; i < bookings.id.length; i++) {
          bookingObjects.push({
            id: bookings.id[i],
            hotel: id,
            roomId: bookings.roomId[i].toString(),
            amountPaid: web3.utils.fromWei(bookings.amountPaid[i]),
            status: bookings.status[i].toString(),
            startDate: bookings.startDate[i].toString(),
            endDate: bookings.endDate[i].toString()
          });
        }
        return bookingObjects;
      })
    );

    return bookingsArray.reduce((acc, arr) => acc.concat(arr), []);
  }

  // Get the total a user can withdraw from all it's hotels
  async getWithdrawalTotal(hotelIds) {
    const withdrawalPromises = hotelIds.map(id => this.withdrawal(id));
    const total = (await Promise.all(withdrawalPromises)).reduce((acc, BN) => {
      return acc + Number(web3.utils.fromWei(BN));
    }, 0);

    return total;
  }

  // Get how much a user can withdraw (dry run) or execute the actual withdrawal
  async withdrawal(hotelAddress, dryRun = true) {
    const hotelContract = await contracts.Hotel.at(hotelAddress);

    if (dryRun) {
      return hotelContract.withdraw.call(Math.floor(Date.now() / 1000), {
        from: address
      });
    } else {
      return hotelContract.withdraw(Math.floor(Date.now() / 1000), {
        from: address
      });
    }
  }

  // Convert wei to ETH
  fromWei(wei) {
    return web3.utils.fromWei(wei);
  }

  // execute a smart contract function with the from parameter
  execute(func, ...param) {
    return func(...param, { from: address });
  }

  // execute a smart contract function with the from parameter and a value to pay
  executeWithMoney(func, price, ...param) {
    const req = {
      from: address,
      value: web3.utils.toWei(price, "ether")
    };

    return func(...param, req);
  }
}

const contractsManager = new ContractsManager();

export default contractsManager;
