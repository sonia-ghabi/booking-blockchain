pragma solidity ^0.4.17;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/Bookings.sol";

contract TestBookings{
  	Bookings booking = Bookings(DeployedAddresses.Bookings());

  	// Testing the book function
	function testHotelOwnerCanAddRoom() public {
	  booking.addRoom(2, 3);
	  Assert.equal(booking.currentRoomId(), uint(1), "currentRoomId should be recorded.");
	}
}
