App = {
  web3Provider: null,
  contracts: {},
  instances: {},
  BookingArtifact: null,

  init: function() {
    // Load pets.
    $.getJSON('../rooms.json', function(data) {
      var petsRow = $('#petsRow');
      var petTemplate = $('#petTemplate');

      for (i = 0; i < data.length; i ++) {
        petTemplate.find('.panel-title').text(data[i].name);
        petTemplate.find('img').attr('src', data[i].picture);
        petTemplate.find('.pet-price').text(data[i].price);
        petTemplate.find('.pet-name').text(data[i].name);
        petTemplate.find('.pet-location').text(data[i].location);
        petTemplate.find('.btn-adopt').attr('data-id', data[i].roomId);
        petTemplate.find('.btn-adopt').attr('data-price', data[i].price);

        petsRow.append(petTemplate.html());
      }
    });

    return App.initWeb3();
  },

  initWeb3: function() {
     // Is there an injected web3 instance?
    if (typeof web3 !== 'undefined') {
      App.web3Provider = web3.currentProvider;
    } else {
      // If no injected web3 instance is detected, fall back to Ganache
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
    }
    web3 = new Web3(App.web3Provider);
    window.web3 = web3;
    App.initContract();
  },

  initContract: function() {
    $.getJSON('HotelFactory.json', function(data) {
      // Get the necessary contract artifact file and instantiate it with truffle-contract
      var FactoryArtifact = data;
      App.contracts.Factory = TruffleContract(FactoryArtifact);

      // Set the provider for our contract
      App.contracts.Factory.setProvider(App.web3Provider);

      // Set the contract instance
      App.contracts.Factory.deployed().then(function(factoryInstance) { 
        App.instances.Factory = factoryInstance;
      }); 
    });
    $.getJSON('Hotel.json', function(data) {
      App.contracts.Hotel = TruffleContract(data);
      App.contracts.Hotel.setProvider(App.web3Provider);
    });
    App.bindEvents();

    App.listHotel();
  },

  bindEvents: function() {
    $(document).on('click', '.btn-book', App.book);
    $(document).on('click', '.btn-getBalance', App.getBalance);
    $(document).on('click', '.btn-addRoom', App.addRoom);
    $(document).on('click', '.btn-createHotel', App.createHotel);
    $(document).on('click', '.btn-listHotel', App.listHotel);
  },

  createHotel: function() {
    db.collection("users").add({
      first: "Ada",
      last: "Lovelace",
      born: 1815
    })
    .then(function(docRef) {
        console.log("Document written with ID: ", docRef.id);
    })
    .catch(function(error) {
        console.error("Error adding document: ", error);
    });
    var hotelName = $('#hotelName').val();
    if (App.instances.Factory == null)
    {
      console.log("Factory not loaded");
      return;
    }
    App.instances.Factory.createContract(hotelName).then((res) => {
      console.log("Hotel successfully created at address " + res.logs[0].args.contractAddress);
    })
    App.listHotel();
  },

  listHotel: function() {
    if (App.instances.Factory == null)
    {
      console.log("Factory not loaded");
      return;
    }
    App.instances.Factory.listHotel.call().then((res) => {
      var options = "";
      res.forEach(address => options = options + `<option value="${address}">${address}</option>`);
      $(".hotelSelector").html(options);
      //console.log(res);
    })
  },

  getBalance: function() {
    console.log("Get balance");
    var address ="0x69300b549410774281d88450DB9F27c317ac5A4b";// "0xFcaD0ca9C3BEfC0Ec8acCA441260a5795648c9b5"; //
    var meta;
    App.contracts.Booking.deployed().then(function(instance) {
      meta = instance;
      return web3.eth.getBalance(instance.address, function(err, transactionHash) {
        if (!err)
          console.log(transactionHash.c[0]); 
      });
    });
  },

  addRoom: function(){
    var price = $('#price').val();
    var cancellable = $('#cancellable').val();
    var address = $('#addRoomAddress').val();

    var hotelContract = App.contracts.Hotel.at(address);
    console.log(hotelContract);
    hotelContract.addRoom(price, cancellable)
      .then((res) => {
        console.log("Room added successfully")
      }).catch((err) => {
        console.error(err.message);
      });
  },

  book: function(){
    var address = $('#bookRoomAddress').val();
    var roomId = $('#roomId').val();
    var hotelContract = App.contracts.Hotel.at(address);
    hotelContract.freeCancellation(
      roomId, 
      1, 
      4, 
      {
        value: web3.toWei(7, 'ether')
      })
    .then((res) => {
      console.log("Booking successful");
    }).catch((err) => {
      console.log(err.message);
    });
  },
},

$(function() {
  $(window).load(function() {
    App.init();
  });
});
