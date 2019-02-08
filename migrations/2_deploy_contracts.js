var Hotel = artifacts.require("Hotel");
var HotelFactory = artifacts.require("HotelFactory");

module.exports = function(deployer) {
  deployer.deploy(HotelFactory);
};