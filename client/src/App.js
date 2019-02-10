import React from "react";
import { BrowserRouter, Switch, Route } from "react-router-dom";
import HotelCreation from "./HotelCreation";
import HotelSummary from "./HotelSummary";

export default function() {
  return (
    <BrowserRouter>
      <Switch>
        <Route exact path="/" component={HotelCreation} />
        <Route exact path="/hotel/:address" component={HotelSummary} />
      </Switch>
    </BrowserRouter>
  );
}
