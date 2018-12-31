var Bookings = artifacts.require("Bookings");

module.exports = function(deployer) {
  deployer.deploy(Bookings);
};