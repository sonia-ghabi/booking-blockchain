import React, { Component } from "react";
import TextField from "@material-ui/core/TextField";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import Grid from "@material-ui/core/Grid";
import Button from "@material-ui/core/Button";

import Contracts from "./lib/contracts";
import Database from "./lib/database.js";

class HotelSummary extends Component {
  /**
   * Constructor.
   * @param {*} props
   */
  constructor(props) {
    super(props);
    this.state = {
      price: "",
      priceCancellable: "",
      hotelSummary: {}
    };
    this.contracts = new Contracts();
    this.db = new Database();
  }

  async componentDidMount() {
    const hotelSummary = await this.db.readData(
      "hotel",
      this.props.match.params.address
    );
    this.setState({
      hotelSummary
    });
  }

  async saveRoom() {
    const address = await this.contracts.addRoom(
      this.state.price,
      this.state.priceCancellable,
      this.state.hotelSummary.id
    );
    if (address) {
      await this.db.writeData("room", {
        id: this.state.hotelSummary.id,
        price: this.state.price,
        priceCancellable: this.state.priceCancellable
      });
    }
  }

  handleChange = key => event => {
    this.setState({
      [key]: event.target.value
    });
  };

  render() {
    const { hotelName, hotelId } = this.props;
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
                <Typography>
                  Hotel {this.state.hotelSummary.name} with Id{" "}
                  {this.state.hotelSummary.id}
                </Typography>
                <TextField
                  id="outlined-name"
                  label="Price cancellable"
                  className=""
                  value={this.state.priceCancellable}
                  onChange={this.handleChange("priceCancellable")}
                  margin="normal"
                  variant="outlined"
                />
                <TextField
                  id="outlined-name"
                  label="Price"
                  className=""
                  value={this.state.price}
                  onChange={this.handleChange("price")}
                  margin="normal"
                  variant="outlined"
                />
              </CardContent>
              <CardActions>
                <Button
                  variant="outlined"
                  className="button"
                  onClick={() => this.saveRoom()}
                >
                  Add room
                </Button>
              </CardActions>
            </Card>
          </Grid>
        </Grid>
      </>
    );
  }
}

export default HotelSummary;
