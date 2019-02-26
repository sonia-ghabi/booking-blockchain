pragma solidity ^0.5.0;

contract HotelFactory {
    address[] hotelContracts;
    mapping(address => address[]) public hotelOwnerships;
    string public myString = "Hello World";

    event newHotelEvent(address contractAddress);

    function createContract (bytes32 name) public {
        Hotel hotel = new Hotel(msg.sender, name);
        address hotelContractAddress = address(hotel);
        hotelContracts.push(hotelContractAddress);
        hotelOwnerships[msg.sender].push(hotelContractAddress);
        emit newHotelEvent(hotelContractAddress);
    } 

    function listMyHotel() public returns (address[] memory){
        return hotelOwnerships[msg.sender];
    }

    function listAllHotel() public view returns (address[] memory){
        return hotelContracts;
    }
}

contract Hotel {

    enum BookingStatus {
        CANCELED,
        CONFIRMED,
        PENDING
    }

    struct BookingData {
        address customer;
        uint roomId;
        uint startDate;
        uint endDate;
        uint amountPaid;
        BookingStatus status;
    }

    struct Room {
        uint roomId;
        uint priceCancellable;
        uint price;
        bool[] booked;
    }

    address payable owner;
    bytes32 name;
    uint public currentRoomId = 0;
    uint96 public numBooking = 0;
    Room[10] public roomList;
    mapping(bytes32 => BookingData) public freeCancellations;
    mapping(bytes32 => BookingData) public bookings;

    uint public dateStart;
    mapping(address => bytes32[]) userBookings;

    event FreeCancel(bytes32 bookingId);
    event Cancelled(bytes32 bookingId);
    event Booked(bytes32 bookingId);

    // **************
    // PUBLIC METHODS
    // **************

    constructor(address payable _owner, bytes32 _name) public {
        name = _name;
        owner = _owner;
        dateStart = now;
    }
    
    // No cancellation
    function booking(uint roomId, uint start, uint end) payable public returns (bytes32)
    {
        // Make sure the roomId exist and the date are usable
        require(currentRoomId > 0 && roomId >= 0 && roomId < currentRoomId && start < end && dateStart <= start);
        
        // Do not proceed if the price of the booking is wrong
        if (msg.value != ((end - start)/ 60 / 60 / 24) * roomList[roomId].price)
        {
            revert("Wrong price");
        }
        
        // Mark the room as booked for the days of the booking
        uint dayStart;
        uint dayEnd;
        (dayStart, dayEnd) = markAsBooked(roomId, start, end);
        
        // Save the booking data
        bytes32 bookingId = generateBookingId(msg.sender);
        bookings[bookingId] = BookingData(msg.sender, roomId, dayStart, dayEnd, msg.value, BookingStatus.CONFIRMED);
        
        // Transfer the money to the hotel owner
        owner.transfer(msg.value);
        
        // Push the booking ID for the user
        userBookings[msg.sender].push(bookingId);

        emit Booked(bookingId);
        return bookingId;
    }
	
	// Free cancellation
    function freeCancellation(uint roomId, uint start, uint end) payable public returns (bytes32)
	{
	    // Make sure the roomId exist and the date are usable
        require(roomId >= 0 && roomId <= currentRoomId && start < end && dateStart <= start);

        // Do not proceed if the price of the booking is wrong
        if (msg.value != ((end - start)/ 60 / 60 / 24) * roomList[roomId].priceCancellable)
        {
            revert("Wrong price");
        }
        
        // Mark the room as booked for the days of the booking
        uint dayStart;
        uint dayEnd;
        (dayStart, dayEnd) = markAsBooked(roomId, start, end);
        
        // Save the booking data
        bytes32 bookingId = generateBookingId(msg.sender);
        freeCancellations[bookingId] = BookingData(msg.sender, roomId, dayStart, dayEnd, msg.value, BookingStatus.PENDING);
	
	    // Push the booking ID for the user
        userBookings[msg.sender].push(bookingId);
        
        emit FreeCancel(bookingId);
        return bookingId;
    }
	
    function cancel(bytes32 bookingId) public
	{
	    // Get the booking
        BookingData memory bookingData = freeCancellations[bookingId];
        if (bookingData.customer != msg.sender)
            revert("Not the owner of the booking");
        else if (bookingData.status != BookingStatus.PENDING)
            revert("Booking already canceled");
            
        // Mark the room as available
        markAsAvailable(bookingData.roomId, bookingData.startDate, bookingData.endDate);
	    
	    // Transfer the money back to the customer
        msg.sender.transfer(bookingData.amountPaid);
        
        emit Cancelled(bookingId);

        // Mark the booking as canceled
        freeCancellations[bookingId].status = BookingStatus.CANCELED;
    }
	
	// Check if a room is available for the given dates
    function isAvailableForDates(uint roomId, uint start, uint end) 
		public 
        view
		returns (bool)
	{
	    // Convert the date to day number (0 being the date the contract was deployed)
        uint dayStart = convertToDayNumber(start);	
        uint dayEnd = convertToDayNumber(end);
        
        // Delegate the call 
        return isAvailableForDayNumbers(roomId, dayStart, dayEnd);
    }

    function availableRoomsForDates(uint start, uint end) 
		public 
        view
		returns (bool[] memory)
	{
	    // Convert the date to day number (0 being the date the contract was deployed)
        uint dayStart = convertToDayNumber(start);	
        uint dayEnd = convertToDayNumber(end);
        
        bool[] memory availableRooms;
        for(uint i = 0; i < currentRoomId; i++) {
            availableRooms[i] = isAvailableForDayNumbers(i, dayStart, dayEnd);
        }
        return availableRooms;
    }
	
    event newRoomEvent(uint roomId);
    function addRoom(uint price, uint priceCancellable) 
		public 
		returns (uint) 
	{
        if (msg.sender != owner)
        {
            revert("Only owner can update hotel.");
        }
        uint weiPriceCancellable = priceCancellable * 1000000000000000000;
        uint weiPrice = price * 1000000000000000000;
        roomList[currentRoomId] = Room(currentRoomId, weiPriceCancellable, weiPrice, new bool[](365));
        currentRoomId = currentRoomId + 1;
        emit newRoomEvent(currentRoomId);
        return currentRoomId;
    }

    function getRoom(uint roomId) 
		public 
		returns (uint priceCancellable, uint price, bool[] memory booked) 
    {
        return (roomList[roomId].priceCancellable, roomList[roomId].price, roomList[roomId].booked);
    }
	
	// **************
    // PRIVATE METHODS
    // **************
    
    // Generate unique booking ID 
    function generateBookingId(address senderAddress)
        internal
        returns (bytes32)
    {
        // Update numBooking
        numBooking = numBooking + 1;
        // requestId = ADDRESS_SENDER+ numRequests (0xADRRESSSENDER00000NUMREQUEST)
        return bytes32((uint256(senderAddress) << 96) + numBooking);
    }
    
    // Convert dae to day number (0 being the contract creation day)
    function convertToDayNumber(uint date) 
    	internal 
        view
    	returns (uint)
	{
        return (date - dateStart) / 60 / 60 / 24;
    }
    
    // Check whether the room is available for the given day numbers
    function isAvailableForDayNumbers(uint roomId, uint dayStart, uint dayEnd) 
    	internal 
        view
    	returns (bool)
	{
        for (uint i = dayStart; i <= dayEnd ; i++)
        {
            if (roomList[roomId].booked[i])
                return false;
        }
        return true;
    }
	
	// Marks the room as booked
    function markAsBooked(uint roomId, uint start, uint end) 
		internal 
		returns (uint, uint) 
	{
	    // Convert the date to day number (0 being the date the contract was deployed)
        uint dayStart = convertToDayNumber(start);	
        uint dayEnd = convertToDayNumber(end);
        
        // Check if the room is available
        if (!isAvailableForDayNumbers(roomId, dayStart, dayEnd))
            revert("Room not available");
            
        // Mark as booked
        for (uint i = dayStart; i <= dayEnd ; i++)
        {
            roomList[roomId].booked[i] = true;
        }
        
        // Return the day numbers
        return (dayStart, dayEnd);
    }
	
	// Marks the room as available
    function markAsAvailable(uint roomId, uint dayStart, uint dayEnd) 
		internal
	{
        // Mark as available
        for (uint i = dayStart; i <= dayEnd ; i++)
        {
            roomList[roomId].booked[i] = false;
        }
    }
}