pragma solidity ^0.5.0;

contract HotelFactory {
    address[] hotelContracts;
    mapping(address => address[]) public hotelOwnerships;

    event newHotelEvent(address contractAddress);

    function createContract (bytes32 name, uint8 stars, string memory description) public {
        Hotel hotel = new Hotel(msg.sender, name, stars, description);
        address hotelContractAddress = address(hotel);
        hotelContracts.push(hotelContractAddress);
        hotelOwnerships[msg.sender].push(hotelContractAddress);
        emit newHotelEvent(hotelContractAddress);
    } 

    function listMyHotels() public view returns (address[] memory){
        return hotelOwnerships[msg.sender];
    }

    function listAllHotels() public view returns (address[] memory){
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
        uint dateTimeStart;
    }

    struct Room {
        uint roomId;
        uint priceCancellable;
        uint price;
        bool[] booked;
    }

    struct UserBookings {
        uint count;
        bytes32[] bookingIds;
    }

    uint public dateStart;
    address payable owner;
    bytes32 name;
    uint8 stars;
    string description;
    uint public currentRoomId = 0;
    uint96 public numBooking = 0;
    mapping(uint => Room) public roomList; // Id will start from 1
    mapping(bytes32 => BookingData) public freeCancellations;
    mapping(bytes32 => BookingData) public bookings;
    mapping(bytes32 => BookingData) public allBookings;
    mapping(address => UserBookings) userBookingsMap;
    bytes32[] public pendingFreeCancellation;
    uint pendingFreeCancellationCount = 0;

    event FreeCancel(bytes32 bookingId);
    event Cancelled(bytes32 bookingId);
    event Booked(bytes32 bookingId);

    event Created(address payable owner, bytes32 name, uint8 stars, string description);

    // **************
    // PUBLIC METHODS
    // **************

    constructor(address payable _owner, bytes32 _name, uint8 _stars, string memory _description) public {
        name = _name;
        stars = _stars;
        description = _description;
        owner = _owner;
        uint day = 60*60*24;
        dateStart = (now/day)*day; // floor to date, don't keep the time
        emit Created(owner, name, stars, description);
    }

    function book(uint roomId, uint start, uint end, bool isCancellable) payable public returns (bytes32)
    {
        // Make sure the roomId exist and the date are usable
        require(currentRoomId > 0 && roomId > 0 && roomId <= currentRoomId && start < end && dateStart <= start);
        
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
        if (msg.value != ((end - start)/ 60 / 60 / 24) * price)
        {
            revert("Wrong price");
        }
        
        // Mark the room as booked for the days of the booking
        uint dayStart;
        uint dayEnd;
        (dayStart, dayEnd) = markAsBooked(roomId, start, end);
        
        // Save the booking data
        bytes32 bookingId = generateBookingId(msg.sender);
        allBookings[bookingId] = BookingData(msg.sender, roomId, dayStart, dayEnd, msg.value, status, start);
        
        // Push the booking ID for the user
        userBookingsMap[msg.sender].bookingIds.push(bookingId);
        (userBookingsMap[msg.sender]).count++;

        // Transfer the money to the hotel owner
        if (!isCancellable)
        {
            emit Booked(bookingId);
            owner.transfer(msg.value);
        }
           
        else
        {
            // Push the booking ID into the pending FreeCancellations
            pendingFreeCancellation.push(bookingId);
            pendingFreeCancellationCount++;
            emit FreeCancel(bookingId);
        }
        return bookingId;
    }
    
    // No cancellation
    function booking(uint roomId, uint start, uint end) payable public returns (bytes32)
    {
        // Make sure the roomId exist and the date are usable
        require(currentRoomId > 0 && roomId > 0 && roomId <= currentRoomId && start < end && dateStart <= start);
        
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
        bookings[bookingId] = BookingData(msg.sender, roomId, dayStart, dayEnd, msg.value, BookingStatus.CONFIRMED, start);
        
        // Transfer the money to the hotel owner
        owner.transfer(msg.value);
        
        // Push the booking ID for the user
        //userBookings[msg.sender].push(bookingId);
        (userBookingsMap[msg.sender]).bookingIds.push(bookingId);
        (userBookingsMap[msg.sender]).count++;

        emit Booked(bookingId);
        return bookingId;
    }
	
	// Free cancellation
    function freeCancellation(uint roomId, uint start, uint end) payable public returns (bytes32)
	{
	    // Make sure the roomId exist and the date are usable
        require(roomId > 0 && roomId <= currentRoomId && start < end && dateStart <= start);

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
        freeCancellations[bookingId] = BookingData(msg.sender, roomId, dayStart, dayEnd, msg.value, BookingStatus.PENDING, start);
	
	    // Push the booking ID for the user
        //userBookings[msg.sender].push(bookingId);
         (userBookingsMap[msg.sender]).bookingIds.push(bookingId);
        (userBookingsMap[msg.sender]).count++;

        // Push the booking ID into the pending FreeCancellations
        pendingFreeCancellation.push(bookingId);
        pendingFreeCancellationCount++;
        
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
        else if (bookingData.dateTimeStart < now)
            revert("Booking already started, cannot be cancelled");
            
        // Mark the room as available
        markAsAvailable(bookingData.roomId, bookingData.startDate, bookingData.endDate);
	    
        // Mark the booking as canceled
        freeCancellations[bookingId].status = BookingStatus.CANCELED;
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
	    // Convert the date to day number (0 being the date the contract was deployed)
        uint dayStart = convertToDayNumber(start);	
        uint dayEnd = convertToDayNumber(end);
        
        // Delegate the call 
        return isAvailableForDayNumbers(roomId, dayStart, dayEnd);
    }

    // Get an array corresponding to available rooms
    function availableRoomsForDates(uint start, uint end)
		public
        view
		returns (bool[] memory)
	{       
	    // Convert the date to day number (0 being the date the contract was deployed)
        uint dayStart = convertToDayNumber(start);
        uint dayEnd = convertToDayNumber(end);
    
        bool[] memory availableRooms = new bool[](currentRoomId);
        for(uint i = 0; i < currentRoomId; i++) {
            availableRooms[i] = isAvailableForDayNumbers(i+1, dayStart, dayEnd);
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
        ++currentRoomId;
        roomList[currentRoomId] = Room(currentRoomId, weiPriceCancellable, weiPrice, new bool[](365));
        emit newRoomEvent(currentRoomId);
        return currentRoomId;
    }

    function getRoom(uint roomId) 
        view
		public 
		returns (uint priceCancellable, uint price, bool[] memory booked) 
    {
        return (roomList[roomId].priceCancellable, roomList[roomId].price, roomList[roomId].booked);
    }

    function getHotel()
        view
        public 
		returns (bytes32 hotelName, uint8 hotelStars, string memory hotelDescription)
    {
        return (name, stars, description);
    }

    event userBooking(address hotel, uint roomId, BookingStatus status, uint startDate);
    function myBookings() view public
    returns (bytes32[] memory id, address[] memory hotel, uint[] memory roomId, uint[] memory amountPaid, BookingStatus[] memory status, uint[] memory startDate, uint[] memory endDate) {
        bytes32[] memory userBookingIds = userBookingsMap[msg.sender].bookingIds;

        uint totalCount = userBookingsMap[msg.sender].count;

        bytes32[] memory bookingIds = new bytes32[](totalCount);
        address[] memory hotelAddresses = new address[](totalCount);
        uint[] memory roomIds = new uint[](totalCount);
        uint[] memory amountPaid = new uint[](totalCount);
        BookingStatus[] memory statuses = new BookingStatus[](totalCount);
        uint[] memory startDates = new uint[](totalCount);
        uint[] memory endDates = new uint[](totalCount);

        for (uint i = 0; i < userBookingsMap[msg.sender].count; i++)
        {
            BookingData memory bookingData = allBookings[userBookingIds[i]];
            bookingIds[i] = userBookingIds[i];
            hotelAddresses[i] = owner;
            roomIds[i] = bookingData.roomId;
            amountPaid[i] = bookingData.amountPaid;
            statuses[i] = bookingData.status;
            startDates[i] = bookingData.startDate;
            endDates[i] = bookingData.endDate;
        }
        return (bookingIds, hotelAddresses, roomIds, amountPaid, statuses, startDates, endDates);

        /*for (uint i = 0; i < userBookingsMap[msg.sender].count; i++)
        {
            BookingData memory bookingData = allBookings[userBookingIds[i]];
            emit userBooking(owner, bookingData.roomId, bookingData.status, bookingData.dateTimeStart);
        }*/
    }   

    event withdrawEvent(uint, uint, bytes32[]);
    function withdraw(uint nowDate) public returns (uint) {
        if (msg.sender != owner)
        {
            revert("Only owner can withdraw money from his hotel.");
        }

        // Initialize
        uint amount = 0;
        bytes32[] memory tempCopy = pendingFreeCancellation;
        delete pendingFreeCancellation;
        uint count = 0;
        
        // Loop through the pending free cancellations
        for (uint i = 0; i < pendingFreeCancellationCount; i++)
        {
            bytes32 bookingId = tempCopy[i];
            BookingData memory bookingData = freeCancellations[bookingId];

            // Collect the money if the booking was for a past date and wasn't cancelled
            if (bookingData.dateTimeStart < nowDate && bookingData.status == BookingStatus.PENDING)
                amount += bookingData.amountPaid;
            
            // Otherwise keep the booking for pending 
            else if (bookingData.dateTimeStart > nowDate)
            {
                pendingFreeCancellation.push(bookingId); 
                count++;
            }              
        }

        // Update class members
        pendingFreeCancellationCount = count;
        emit withdrawEvent(amount,pendingFreeCancellationCount, pendingFreeCancellation);

        // Refund the money
        msg.sender.transfer(amount);
        return (amount);
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