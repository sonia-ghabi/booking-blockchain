var Hotel = artifacts.require("Hotel");

contract("Hotel", function(accounts) {
  // Set variables
  const date =
    new Date(Date.UTC(
      new Date().getFullYear(),
      new Date().getMonth(),
      new Date().getDate())
    ) / 1000; // Solidity uses date in ms
  const checkInDate = date + 60 * 60 * 24 * 1;
  const checkOutDate = date + 60 * 60 * 24 * 2;
  const priceCancellable = "3";
  const price = "2";
  const weiPriceCancellable = web3.utils.toWei(priceCancellable, "ether");
  const weiPrice = web3.utils.toWei(price, "ether");
  const revertMessage =
    "Returned error: VM Exception while processing transaction: revert";
  let instance;

  beforeEach(async () => {
    // Start a new instance
    instance = await Hotel.new(
      accounts[1],
      web3.utils.asciiToHex("hotel 1"),
      4,
      "This is an hotel"
    );
    // Add a room
    await instance.addRoom(weiPrice, weiPriceCancellable, {
      from: accounts[1]
    });
  });

  it("should add room correctly", async () => {
    // Get the room information
    const room = await instance.getRoom.call(1);

    // Assert the room information
    assert.isNotNull(room);
    assert.equal(
      room[0].toString(),
      weiPriceCancellable,
      "Wrong cancellable price"
    ); // Price cancellable
    assert.equal(room[1].toString(), weiPrice, "Wrong price"); // Price
  });

  it("should book room correctly", async () => {
    // Book the room
    const result = await instance.book(1, checkInDate, checkOutDate, false, {
      value: weiPrice,
      from: accounts[2]
    });

    // Get the boooking data
    const bookingId = result.logs[0].args.bookingId;
    const bookings = await instance.allBookings(bookingId);

    // Assert the booking is confirmed
    assert.equal(bookings[5].toNumber(), 1 /* CONFIRMED */);
  });

  it("should revert double booking", async () => {
    // Book the room
    const result = await instance.book(1, checkInDate, checkOutDate, false, {
      value: weiPrice,
      from: accounts[2]
    });

    // Try to book it again
    try {
      await instance.book.call(1, checkInDate, checkOutDate, false, {
        value: weiPrice,
        from: accounts[2]
      });
      throw null;
    } catch (error) {
      // Assert an error append
      assert(error, "Expected an error but did not get one");
      assert(error.message.startsWith(revertMessage));
    }
  });

  it("should book with free cancellation", async () => {
    const bookingId = await instance.book.call(
      1,
      checkInDate,
      checkOutDate,
      true,
      { value: weiPriceCancellable, from: accounts[2] }
    );
    assert.isNotNull(bookingId);
  });

  it("should be false is available for dates", async () => {
    // Book the room
    const result = await instance.book(1, checkInDate, checkOutDate, true, {
      value: weiPriceCancellable,
      from: accounts[2]
    });
    const bookingId = result.logs[0].args.bookingId;

    /// Check availability
    const isAvailable = await instance.isAvailableForDates.call(
      1,
      checkInDate,
      checkOutDate
    );

    // Assert is false
    assert.isFalse(isAvailable);
  });

  it("should be true is available for dates", async () => {
    // Set date
    const startDate = date + 60 * 60 * 24 * 10;
    const endDate = date + 60 * 60 * 24 * 12;

    // Check availability
    const isAvailable = await instance.isAvailableForDates.call(
      1,
      startDate,
      endDate
    );

    // Assert is true
    assert.isTrue(isAvailable);
  });

  it("should book be able to cancel free cancellation", async () => {
    // Book the room
    const result = await instance.book(1, checkInDate, checkOutDate, true, {
      value: weiPriceCancellable,
      from: accounts[2]
    });
    const bookingId = result.logs[0].args.bookingId;

    // Get the booking data
    let freeCancellations = await instance.allBookings(bookingId);

    // Assert pending
    assert.equal(freeCancellations[5].toNumber(), 2 /* PENDING */);

    // Cancel the room
    await instance.cancel(bookingId, { from: accounts[2] });

    // Refresh the booking data
    freeCancellations = await instance.allBookings(bookingId);

    // Assert canceled
    assert.equal(freeCancellations[5].toNumber(), 0 /* CANCELED */);
  });

  it("should revert double booking with free cancellation", async () => {
    // Book the room a first time
    await instance.book(1, checkInDate, checkOutDate, true, {
      value: weiPriceCancellable,
      from: accounts[2]
    });

    // Repeat the booking
    try {
      await instance.book.call(1, checkInDate, checkOutDate, true, {
        value: weiPriceCancellable,
        from: accounts[2]
      });
      throw null;
    } catch (error) {
      // Assert an error append
      assert(error, "Expected an error but did not get one");
      assert(error.message.startsWith(revertMessage));
    }
  });

  it("should be returned is available rooms for dates", async () => {
    // Add 2 other rooms
    await instance.addRoom(weiPrice, weiPriceCancellable, {
      from: accounts[1]
    });
    await instance.addRoom(weiPrice, weiPriceCancellable, {
      from: accounts[1]
    });

    // Book one of the room
    const result = await instance.book(2, checkInDate, checkOutDate, false, {
      value: weiPrice
    });

    // Get availability
    const availableRooms = await instance.availableRoomsForDates.call(
      checkInDate,
      checkOutDate
    );

    // Assert
    assert(availableRooms.length == 3);
    assert(availableRooms[0]);
    assert(!availableRooms[1]);
    assert(availableRooms[2]);
  });
  
  /*
  it("should withdraw correct amount", async () => {
    // Add other rooms
    await instance.addRoom(weiPrice, weiPriceCancellable, {
      from: accounts[1]
    });
    await instance.addRoom(weiPrice, weiPriceCancellable, {
      from: accounts[1]
    });
    await instance.addRoom(weiPrice, weiPriceCancellable, {
      from: accounts[1]
    });
    await instance.addRoom(weiPrice, weiPriceCancellable, {
      from: accounts[1]
    });

    // Book the rooms
    let result = await instance.book(1, checkInDate, checkOutDate, true, {
      value: weiPriceCancellable,
      from: accounts[2]
    });
    result = await instance.book(2, checkInDate, checkOutDate, true, {
      value: weiPriceCancellable,
      from: accounts[2]
    });
    const bookingId = result.logs[0].args.bookingId;

    result = await instance.book(3, checkInDate, checkOutDate, true, {
      value: weiPriceCancellable,
      from: accounts[2]
    });

    // Book a room in the future
    const futureBookingCI =
      new Date(
        new Date().getFullYear(),
        new Date().getMonth() + 2,
        new Date().getDate()
      ) / 1000;
    const futureBookingCO =
      new Date(
        new Date().getFullYear(),
        new Date().getMonth() + 2,
        new Date().getDate() + 1
      ) / 1000;
    result = await instance.book(4, futureBookingCI, futureBookingCO, true, {
      value: weiPriceCancellable,
      from: accounts[2]
    });

    // Cancel one of the room
    await instance.cancel(bookingId, { from: accounts[2] });

    // Future date
    const inOneMonth =
      new Date(
        new Date().getFullYear(),
        new Date().getMonth() + 1,
        new Date().getDate()
      ) / 1000;

    // Get availability
    const withdraw = await instance.withdraw(inOneMonth, { from: accounts[1] });

    // Assert
    assert.equal(
      withdraw.logs[0].args["0"].toString(),
      (weiPriceCancellable * 2).toString()
    );
    assert.equal(withdraw.logs[0].args["2"].length, 1); // Only the future booking should remain
  });
*/
});
