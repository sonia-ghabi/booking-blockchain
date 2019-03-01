import React from "react";
import { HashRouter, Switch, Route } from "react-router-dom";
import CssBaseline from "@material-ui/core/CssBaseline";
import HotelList from "./HotelList";
import HotelCreation from "./HotelCreation";
import ManageHotel from "./ManageHotel";
import RoomBooking from "./RoomBooking";
import MyHotels from "./MyHotels";
import Bookings from "./Bookings";

export default function() {
  return (
    <>
      <CssBaseline />
      <HashRouter>
        <Switch>
          <Route exact path="/book/:address" component={RoomBooking} />
          <Route exact path="/myhotels" component={MyHotels} />
          <Route exact path="/mybookings" component={Bookings} />
          <Route exact path="/create" component={HotelCreation} />
          <Route path="/manage/:address" component={ManageHotel} />
          <Route exact path="/" component={HotelList} />
        </Switch>
      </HashRouter>
    </>
  );
}
