App = {
  web3Provider: null,
  contracts: {},

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
    return App.initContract();
  },

  initContract: function() {
     $.getJSON('Bookings.json', function(data) {
      // Get the necessary contract artifact file and instantiate it with truffle-contract
      var BookingArtifact = data;
      App.contracts.Booking = TruffleContract(BookingArtifact);

      // Set the provider for our contract
      App.contracts.Booking.setProvider(App.web3Provider);

      // Use our contract to retrieve and mark the adopted pets
      //return App.markAdopted();
      });
    return App.bindEvents();
  },

  bindEvents: function() {
    $(document).on('click', '.btn-adopt', App.book);
    $(document).on('click', '.btn-getBalance', App.getBalance);
  },

  getBalance: function() {
    console.log("Get balance");
    var address ="0x69300b549410774281d88450DB9F27c317ac5A4b";// "0xFcaD0ca9C3BEfC0Ec8acCA441260a5795648c9b5"; //
    var meta;
    App.contracts.Booking.deployed().then(function(instance) {
      meta = instance;
      return web3.eth.getBalance("0xFcaD0ca9C3BEfC0Ec8acCA441260a5795648c9b5", function(err, transactionHash) {
        if (!err)
          console.log(transactionHash.c[0]); 
      });
    });
  },

  book: function(event){
    var roomId = parseInt($(event.target).data('id'));
    var price = parseInt($(event.target).data('price'));
    web3.eth.getAccounts(function(error, accounts) {
        if (error) {
          console.log(error);
        }
        console.log(price);
        console.log(roomId);
        var bookingInstance;
        App.contracts.Booking.deployed().then(function(instance) {
          bookingInstance = instance;
          return bookingInstance.freeCancellation(
            roomId,
            {
              gas: 300000,
              from: web3.eth.coinbase,
              value: web3.toWei(price, 'ether')
            }).then((res) => {
              console.log("Booking successful");
            }).catch((error) => {
              console.log(error.message);
            });
        });
      });
  },
},

$(function() {
  $(window).load(function() {
    App.init();
  });
});
