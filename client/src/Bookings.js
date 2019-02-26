import React from "react";
import { Link } from "react-router-dom";
import Typography from "@material-ui/core/Typography";
import withStyles from "@material-ui/core/styles/withStyles";
import Paper from "@material-ui/core/Paper";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Button from "@material-ui/core/Button";
import moment from "moment";
import Database from "./lib/database.js";
import Contracts from "./lib/contracts";
import Header from "./components/header";

const styles = theme => ({
  layout: {
    width: "auto",
    marginLeft: theme.spacing.unit * 2,
    marginRight: theme.spacing.unit * 2,
    [theme.breakpoints.up(800 + theme.spacing.unit * 2 * 2)]: {
      width: 800,
      marginLeft: "auto",
      marginRight: "auto"
    }
  },
  paper: {
    position: "relative",
    marginTop: theme.spacing.unit * 3,
    marginBottom: theme.spacing.unit * 3,
    padding: theme.spacing.unit * 2,
    [theme.breakpoints.up(600 + theme.spacing.unit * 3 * 2)]: {
      marginTop: theme.spacing.unit * 6,
      marginBottom: theme.spacing.unit * 6,
      padding: theme.spacing.unit * 3
    }
  }
});

class MyHotels extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      bookings: [
        {
          hotelId: "0xXXX",
          id: 1,
          startDate: 1551195778,
          endDate: 1551195778,
          amountPaid: 10,
          status: "PENDING"
        },
        {
          hotelId: "0xYYY",
          id: 2,
          startDate: 1551195778,
          endDate: 1551195778,
          amountPaid: 15,
          status: "COMPLETE"
        }
      ]
    };
  }

  async componentDidMount() {}

  cancelBooking(hotelId, bookingId) {
    return () => {
      return Contracts.cancel(hotelId, bookingId);
    };
  }
  /*
address customer;
uint roomId;
uint startDate;
uint endDate;
uint dateTimeStart;
uint amountPaid;
BookingStatus status;
*/
  render() {
    const { classes } = this.props;
    const { bookings } = this.state;
    return (
      <>
        <Header />
        <main className={classes.layout}>
          <Paper className={classes.paper}>
            <Typography component="h1" variant="h4">
              My bookings
            </Typography>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Hotel</TableCell>
                  <TableCell align="right">Checkin</TableCell>
                  <TableCell align="right">Checkout</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell align="right">Cancel</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bookings.map(booking => (
                  <TableRow key={booking.id}>
                    <TableCell component="th" scope="row">
                      {booking.hotelId}
                    </TableCell>
                    <TableCell>
                      {moment(booking.startDate).format("D/M/YYYY")}
                    </TableCell>
                    <TableCell>
                      {moment(booking.endDate).format("D/M/YYYY")}
                    </TableCell>
                    <TableCell align="right">{booking.amountPaid}</TableCell>
                    <TableCell align="right">
                      {booking.status === "PENDING" ? (
                        <Button
                          variant="outlined"
                          onClick={this.cancelBooking(
                            booking.hotelId,
                            booking.id
                          )}
                        >
                          Cancel
                        </Button>
                      ) : (
                        "Non-cancellable"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </main>
      </>
    );
  }
}

export default withStyles(styles)(MyHotels);
