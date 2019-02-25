import React from 'react';
import { BrowserRouter, Switch, Route } from 'react-router-dom';
import CssBaseline from '@material-ui/core/CssBaseline';
import HotelList from './HotelList';
import HotelCreation from './HotelCreation';
import ManageHotel from './ManageHotel';
import RoomBooking from './RoomBooking';
import MyHotels from './MyHotels';

export default function() {
  return (
    <>
      <CssBaseline />
      <BrowserRouter>
        <Switch>
          <Route exact path="/book/:address" component={RoomBooking} />
          <Route exact path="/myhotels" component={MyHotels} />
          <Route exact path="/create" component={HotelCreation} />
          <Route path="/manage/:address" component={ManageHotel} />
          <Route exact path="/" component={HotelList} />
        </Switch>
      </BrowserRouter>
    </>
  );
}
