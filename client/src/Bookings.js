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
import Contracts, { isReady } from "./lib/contracts";
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
  },
  addressRow: {
    width: "150px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  }
});

const cancelBooking = (hotelId, bookingId, callback) => {
  return () => {
    const cancel = Contracts.cancel(hotelId, bookingId);
    callback(cancel);
    return cancel;
  };
};

class MyHotels extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      hotelIds: [],
      bookings: []
    };

    this.getBookings = this.getBookings.bind(this);
  }

  async componentDidMount() {
    await isReady();
    const hotelIds = (await Contracts.listHotels()) || [];

    this.setState({
      hotelIds
    });

    this.getBookings();
  }

  async getBookings() {
    const hotelIds = this.state.hotelIds;
    const bookings = await Contracts.getMyBookingsFromHotels(hotelIds);
    console.log(bookings);
    this.setState({
      bookings
    });
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
                      <div className={classes.addressRow}>{booking.hotel}</div>
                    </TableCell>
                    <TableCell>
                      {moment.unix(booking.startDate).format("D/M/YYYY")}
                    </TableCell>
                    <TableCell>
                      {moment.unix(booking.endDate).format("D/M/YYYY")}
                    </TableCell>
                    <TableCell align="right">{booking.amountPaid}</TableCell>
                    <TableCell align="right">
                      <BookingAction
                        booking={booking}
                        onUpdate={this.getBookings}
                      />
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

const BookingAction = ({ booking, onUpdate }) => {
  switch (booking.status) {
    case "0":
      return "Cancelled";
    case "1":
    case "3":
      return "Confirmed";
    case "2": {
      if (booking.startDate <= moment().unix()) {
        return "Confirmed";
      }

      return (
        <Button
          variant="outlined"
          onClick={cancelBooking(booking.hotel, booking.id, onUpdate)}
        >
          Cancel
        </Button>
      );
    }
    default:
      return "Oups";
  }
};

export default withStyles(styles)(MyHotels);
