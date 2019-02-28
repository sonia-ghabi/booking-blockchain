pragma solidity ^0.5.0;

// The factory for the hotel contract
contract HotelFactory {

    // All the hotel contracts
    address[] hotelContracts;

    // The map of owner => hotel contract
    mapping(address => address[]) public hotelOwnerships;
    event newHotelEvent(address contractAddress);

    // Create an Hotel instance
    function createContract (bytes32 name, uint8 stars, string memory description) public {
        Hotel hotel = new Hotel(msg.sender, name, stars, description);
        address hotelContractAddress = address(hotel);
        hotelContracts.push(hotelContractAddress);
        hotelOwnerships[msg.sender].push(hotelContractAddress);
        emit newHotelEvent(hotelContractAddress);
    } 

    //List my hotels
    function listMyHotels() public view returns (address[] memory){
        return hotelOwnerships[msg.sender];
    }

    // List all hotels
    function listAllHotels() public view returns (address[] memory){
        return hotelContracts;
    }
}

contract Hotel {

    enum BookingStatus {
        CANCELED,
        CONFIRMED,
        PENDING, 
        WITHDRAWN // When the hotel owner will withdraw the money of a free cancellation booking
    }

    struct BookingData {
        address customer;
        uint roomId;
        uint amountPaid;
        uint dateTimeStart;
        uint dateTimeEnd;
        BookingStatus status;     
    }

    struct Room {
        uint roomId;
        uint priceCancellable;
        uint price;
        mapping(uint => bool) booked;
    }

    struct UserBookings {
        uint count;
        bytes32[] bookingIds;
    }

    uint constant day = 60*60*24;
    uint public creationDate; 
    address payable owner;
    bytes32 name;
    uint8 stars;
    string description;
    uint public currentRoomId = 0;
    uint96 public numBooking = 0;
    mapping(uint => Room) public roomList; // Id will start from 1
    mapping(bytes32 => BookingData) public allBookings;
    mapping(address => UserBookings) userBookingsMap; // Bookings Ids by user
    bytes32[] public pendingFreeCancellation;
    uint pendingFreeCancellationCount = 0;
    
    event FreeCancel(bytes32 bookingId);
    event Cancelled(bytes32 bookingId);
    event Booked(bytes32 bookingId);
    event AddRoom(uint roomId);
    event CreatedHotel(address payable owner, bytes32 name, uint8 stars, string description);
    event Withdraw(uint, uint, bytes32[]);

    // **************
    // PUBLIC METHODS
    // **************

    // Constructor
    constructor(address payable _owner, bytes32 _name, uint8 _stars, string memory _description) 
        public 
    {
        name = _name;
        stars = _stars;
        description = _description;
        owner = _owner;
        creationDate = (now/day) * day; // floor to date, don't keep the time
        emit CreatedHotel(owner, name, stars, description);
    }

    // Book a room
    function book(uint roomId, uint start, uint end, bool isCancellable) 
        payable 
        public 
        returns (bytes32)
    {
        // Make sure the roomId exist and the date are usable
        require(
            currentRoomId > 0 && 
            roomId > 0 && 
            roomId <= currentRoomId && 
            start < end && 
            creationDate <= start &&
            start % day == 0 && // time must be 00h00
            end % day == 0,
            "Invalid parameters"
        );
    
        // Set variables depending on whether the booking is cancellable
        uint price;
        BookingStatus status;
        if (isCancellable)
        {
            price = roomList[roomId].priceCancellable;
            status = BookingStatus.PENDING;
        }
        else
        {
            price = roomList[roomId].price;
            status = BookingStatus.CONFIRMED;
        }          

        // Do not proceed if the price of the booking is wrong
        if (msg.value != ((end - start)/ day) * price)
        {
            revert("Wrong price");
        }
        
        // Mark the room as booked for the days of the booking
        markAsBooked(roomId, start, end);
        
        // Save the booking data
        bytes32 bookingId = generateBookingId(msg.sender);
        allBookings[bookingId] = BookingData(msg.sender, roomId, msg.value, start, end, status);
        
        // Push the booking ID for the user
        userBookingsMap[msg.sender].bookingIds.push(bookingId);
        (userBookingsMap[msg.sender]).count++;

        // Transfer the money to the hotel owner
        if (!isCancellable)
        {
            emit Booked(bookingId);
            owner.transfer(msg.value);
        }

        // Push the booking ID into the pending FreeCancellations 
        else
        {           
            pendingFreeCancellation.push(bookingId);
            pendingFreeCancellationCount++;
            emit FreeCancel(bookingId);
        }
        return bookingId;
    }
    
    // Cancel a booking 
    function cancel(bytes32 bookingId) 
        public
	{
	    // Get the booking
        BookingData memory bookingData = allBookings[bookingId];
        if (bookingData.customer != msg.sender)
            revert("Not the owner of the booking");
        else if (bookingData.status != BookingStatus.PENDING)
            revert("Booking already canceled");
        else if (bookingData.dateTimeStart < now)
            revert("Booking already started, cannot be cancelled");
            
        // Mark the room as available
        markAsAvailable(bookingData.roomId, bookingData.dateTimeStart, bookingData.dateTimeEnd);
	    
        // Mark the booking as canceled
        allBookings[bookingId].status = BookingStatus.CANCELED;
        emit Cancelled(bookingId);

        // Transfer the money back to the customer
        msg.sender.transfer(bookingData.amountPaid);
    }
	
	// Check if a room is available for the given dates
    function isAvailableForDates(uint roomId, uint start, uint end) 
		public 
        view
		returns (bool)
	{
	    for (uint i = start; i < end ; i+=day)
            if (roomList[roomId].booked[i])
                return false;
        return true;
    }

    // Get an array corresponding to available rooms
    function availableRoomsForDates(uint start, uint end)
		public
        view
		returns (bool[] memory)
	{     
        // Data validation  
        require(
            start < end && 
            creationDate <= start &&
            start % day == 0 && // time must be 00h00
            end % day == 0,
            "Invalid parameters"
        );

        bool[] memory availableRooms = new bool[](currentRoomId);
        for (uint i = 0; i < currentRoomId; i++)
            availableRooms[i] = isAvailableForDates(i+1, start, end);
        return availableRooms;
    }

    // List a user's bookings
    function listUserBookings() 
        view 
        public
        returns (bytes32[] memory id, uint[] memory roomId, uint[] memory amountPaid, BookingStatus[] memory status, uint[] memory startDate, uint[] memory endDate) 
    {
        // Get the user's booking IDs
        bytes32[] memory userBookingIds = userBookingsMap[msg.sender].bookingIds;
        uint totalCount = userBookingsMap[msg.sender].count;

        // Initialize the array to return
        bytes32[] memory bookingIds = new bytes32[](totalCount);
        uint[] memory roomIds = new uint[](totalCount);
        uint[] memory amountsPaid = new uint[](totalCount);
        BookingStatus[] memory statuses = new BookingStatus[](totalCount);
        uint[] memory startDates = new uint[](totalCount);
        uint[] memory endDates = new uint[](totalCount);

        // Populate the array to return
        for (uint i = 0; i < totalCount; i++)
        {
            BookingData memory bookingData = allBookings[userBookingIds[i]];
            bookingIds[i] = userBookingIds[i];
            roomIds[i] = bookingData.roomId;
            amountsPaid[i] = bookingData.amountPaid;
            statuses[i] = bookingData.status;
            startDates[i] = bookingData.dateTimeStart;
            endDates[i] = bookingData.dateTimeEnd;
        }
        return (bookingIds, roomIds, amountsPaid, statuses, startDates, endDates);
    }   

    // Withdraw the money from the cancellable bookings
    function withdraw() 
        public 
        returns (uint) 
    {
        // Data validation
        require(msg.sender == owner, "Only owner can withdraw money from his hotel.");

        // Initialize
        uint amount = 0;
        bytes32[] memory tempCopy = pendingFreeCancellation;
        delete pendingFreeCancellation;
        uint count = 0;
        
        // Loop through the pending free cancellations
        for (uint i = 0; i < pendingFreeCancellationCount; i++)
        {
            bytes32 bookingId = tempCopy[i];
            BookingData memory bookingData = allBookings[bookingId];

            // Collect the money if the booking was for a past date and wasn't cancelled
            if (bookingData.dateTimeStart < now && bookingData.status == BookingStatus.PENDING)
            {
                amount += bookingData.amountPaid;
                allBookings[bookingId].status = BookingStatus.WITHDRAWN;
            }               
            
            // Otherwise keep the booking for pending 
            else if (bookingData.dateTimeStart > now)
            {
                pendingFreeCancellation.push(bookingId); 
                count++;
            }              
        }

        // Update class members
        pendingFreeCancellationCount = count;
        emit Withdraw(amount,pendingFreeCancellationCount, pendingFreeCancellation);

        // Refund the money
        msg.sender.transfer(amount);
        return (amount);
    }

    // Add a room with the given prices
    function addRoom(uint price, uint priceCancellable)  // the prices should be in wei
		public 
		returns (uint) 
	{
        // Make sure the sender is the hotel owner and the price is well set
        require(price > 0 && priceCancellable > 0, "Prices must be > 0");
        require(msg.sender == owner, "Only owner can update hotel.");
        
        ++currentRoomId;
        roomList[currentRoomId] = Room(currentRoomId, priceCancellable, price);
        emit AddRoom(currentRoomId);
        return currentRoomId;
    }

    // Get a room information
    function getRoom(uint roomId) 
        view
		public 
		returns (uint priceCancellable, uint price)
    {
        return (roomList[roomId].priceCancellable, roomList[roomId].price);
    }

    // Get the hotel information
    function getHotel()
        view
        public 
		returns (bytes32 hotelName, uint8 hotelStars, string memory hotelDescription)
    {
        return (name, stars, description);
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

        // Build the ID
        return bytes32((uint256(senderAddress) << 96) + numBooking);
    }
	
	// Marks the room as booked
    function markAsBooked(uint roomId, uint start, uint end) 
		internal 
	{
        // Check if the room is available
        if (!isAvailableForDates(roomId, start, end))
            revert("Room not available");
            
        // Mark as booked
        for (uint i = start; i < end ; i+=day)
            roomList[roomId].booked[i] = true;
    }
	
	// Marks the room as available
    function markAsAvailable(uint roomId, uint start, uint end) 
		internal
	{
        // Mark as available
        for (uint i = start; i < end ; i+=day)
            roomList[roomId].booked[i] = false;
    }
}