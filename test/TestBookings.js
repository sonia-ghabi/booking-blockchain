var Booking = artifacts.require('Hotel');

contract('Booking', function(accounts) {
  // Set variables
  const date = Date.now() / 1000; // Solidity uses date in ms
  const checkInDate = date + 60 * 60 * 24 * 1;
  const checkOutDate = date + 60 * 60 * 24 * 2;
  const priceCancellable = '3';
  const price = '2';
  const weiPriceCancellable = web3.utils.toWei(priceCancellable, 'ether');
  const weiPrice = web3.utils.toWei(price, 'ether');
  const revertMessage = 'VM Exception while processing transaction: revert';
  let instance;

  beforeEach(async () => {
    // Start a new instance
    instance = await Booking.new(accounts[0], web3.utils.asciiToHex('hotel'));

    // Add a room
    await instance.addRoom(price, priceCancellable);
  });

  it('should add room correctly', async () => {
    // Get the room information
    const room = await instance.getRoom.call(0);

    // Assert the room information
    assert.isNotNull(room);
    assert.equal(
      room[0].toNumber(),
      weiPriceCancellable,
      'Wrong cancellable price'
    ); // Price cancellable
    assert.equal(room[1].toNumber(), web3.toWei('2', 'ether'), 'Wrong price'); // Price
  });

  it('should book room correctly', async () => {
    // Book the room
    const result = await instance.booking(0, checkInDate, checkOutDate, {
      value: weiPrice
    });

    // Get the booking data
    const bookingId = result.logs[0].args.bookingId;
    const bookings = await instance.bookings(bookingId);

    // Assert the booking is confirmed
    assert.equal(bookings[5].toNumber(), 1 /* CONFIRMED */);
  });

  it('should revert double booking', async () => {
    // Book the room
    const result = await instance.booking(0, checkInDate, checkOutDate, {
      value: weiPrice
    });

    // Try to book it again
    try {
      await instance.booking.call(0, checkInDate, checkOutDate, {
        value: weiPrice
      });
      throw null;
    } catch (error) {
      // Assert an error append
      assert(error, 'Expected an error but did not get one');
      assert(error.message.startsWith(revertMessage));
    }
  });

  it('should book with free cancellation', async () => {
    const bookingId = await instance.freeCancellation.call(
      0,
      checkInDate,
      checkOutDate,
      { value: weiPriceCancellable }
    );
    assert.isNotNull(bookingId);
  });

  it('should be false is available for dates', async () => {
    // Book the room
    const result = await instance.freeCancellation(
      0,
      checkInDate,
      checkOutDate,
      { value: weiPriceCancellable }
    );
    const bookingId = result.logs[0].args.bookingId;

    /// Check availability
    const isAvailable = await instance.isAvailableForDates.call(
      0,
      checkInDate,
      checkOutDate
    );

    // Assert is false
    assert.isFalse(isAvailable);
  });

  it('should be true is available for dates', async () => {
    // Set date
    const startDate = date + 60 * 60 * 24 * 10;
    const endDate = date + 60 * 60 * 24 * 12;

    // Check availability
    const isAvailable = await instance.isAvailableForDates.call(
      0,
      startDate,
      endDate
    );

    // Assert is true
    assert.isTrue(isAvailable);
  });

  it('should book be able to cancel free cancellation', async () => {
    // Book the room
    const result = await instance.freeCancellation(
      0,
      checkInDate,
      checkOutDate,
      { value: weiPriceCancellable }
    );
    const bookingId = result.logs[0].args.bookingId;

    // Get the booking data
    let freeCancellations = await instance.freeCancellations(bookingId);

    // Assert pending
    assert.equal(freeCancellations[5].toNumber(), 2 /* PENDING */);

    // Cancel the room
    await instance.cancel.sendTransaction(bookingId);

    // Refresh the booking data
    freeCancellations = await instance.freeCancellations(bookingId);

    // Assert canceled
    assert.equal(freeCancellations[5].toNumber(), 0 /* CANCELED */);
  });

  it('should revert double booking with free cancellation', async () => {
    // Book the room a first time
    await instance.freeCancellation(0, checkInDate, checkOutDate, {
      value: weiPriceCancellable
    });

    // Repeat the booking
    try {
      await instance.freeCancellation(0, checkInDate, checkOutDate, {
        value: weiPriceCancellable
      });
      throw null;
    } catch (error) {
      // Assert an error append
      assert(error, 'Expected an error but did not get one');
      assert(error.message.startsWith(revertMessage));
    }
  });
});
