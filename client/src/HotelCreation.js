import React, { Component } from "react";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import Grid from "@material-ui/core/Grid";

import Contracts from "./lib/contracts";
import Database from "./lib/database.js";

class HotelCreation extends Component {
  /**
   * Constructor.
   * @param {*} props
   */
  constructor(props) {
    super(props);
    this.state = {
      hotelName: "",
      hotelId: null
    };
    this.contracts = new Contracts();
    this.db = new Database();
  }

  handleChange = key => event => {
    this.setState({
      [key]: event.target.value
    });
  };

  async saveHotel() {
    const address = await this.contracts.createHotel(this.state.hotelName);
    if (address) {
      await this.db.writeData(
        "hotel",
        {
          id: address,
          name: this.state.hotelName
        },
        address
      );
      this.setState({ hotelId: address });
    }
  }

  render() {
    const button = this.state.hotelId ? (
      <>
        <Typography>Hotel successfully added</Typography>
        <Button>Add room</Button>
      </>
    ) : (
      <Button
        variant="outlined"
        className="button"
        onClick={() => this.saveHotel()}
      >
        Create new hotel
      </Button>
    );
    return (
      <>
        <AppBar position="static" color="default">
          <Toolbar>
            <Typography variant="h6" color="inherit">
              Booking.com
            </Typography>
          </Toolbar>
        </AppBar>
        <Grid container spacing={16} alignContent={"center"}>
          <Grid item xs={6}>
            <Card>
              <CardContent>
                <TextField
                  id="outlined-name"
                  label="Name"
                  className=""
                  value={this.state.hotelName}
                  onChange={this.handleChange("hotelName")}
                  margin="normal"
                  variant="outlined"
                />
              </CardContent>
              <CardActions>{button}</CardActions>
            </Card>
          </Grid>
        </Grid>
      </>
    );
  }
}

export default HotelCreation;
