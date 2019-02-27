import React from 'react';
import { Link } from 'react-router-dom';
import Typography from '@material-ui/core/Typography';
import withStyles from '@material-ui/core/styles/withStyles';
import Paper from '@material-ui/core/Paper';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Button from '@material-ui/core/Button';
import moment from 'moment';
import Contracts, { isReady } from './lib/contracts';
import Header from './components/header';

const styles = theme => ({
  layout: {
    width: 'auto',
    marginLeft: theme.spacing.unit * 2,
    marginRight: theme.spacing.unit * 2,
    [theme.breakpoints.up(800 + theme.spacing.unit * 2 * 2)]: {
      width: 800,
      marginLeft: 'auto',
      marginRight: 'auto'
    }
  },
  paper: {
    position: 'relative',
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
    width: '150px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  }
});

class MyHotels extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      bookings: []
    };
  }

  async componentDidMount() {
    await isReady();
    const hotelIds = (await Contracts.listHotels()) || [];

    const bookings = await this.getBookings(hotelIds);
    console.log(bookings);
    this.setState({
      bookings
    });
  }

  async getBookings(hotelIds) {
    const bookingsArray = await Promise.all(
      hotelIds.map(async id => {
        const bookings = await Contracts.myBookings(id);
        const bookingObjects = [];
        for (let i = 0; i < bookings.hotel.length; i++) {
          bookingObjects.push({
            id: bookings.id[i],
            hotel: bookings.hotel[i],
            roomId: bookings.roomId[i].toString(),
            amountPaid: bookings.amountPaid[i].toString(),
            status: bookings.status[i].toString(),
            startDate: moment.unix(bookings.startDate[i].toString())
          });
        }
        console.log(bookingObjects);
        return bookingObjects;
      })
    );

    return bookingsArray.reduce((acc, arr) => acc.concat(arr), []);
  }

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
                      <div className={classes.addressRow}>{booking.hotel}</div>
                    </TableCell>
                    <TableCell>
                      {moment(booking.startDate).format('D/M/YYYY')}
                    </TableCell>
                    <TableCell>
                      {moment(booking.endDate).format('D/M/YYYY')}
                    </TableCell>
                    <TableCell align="right">{booking.amountPaid}</TableCell>
                    <TableCell align="right">
                      {booking.status === '2' ? (
                        <Button
                          variant="outlined"
                          onClick={this.cancelBooking(
                            booking.hotel,
                            booking.id
                          )}
                        >
                          Cancel
                        </Button>
                      ) : (
                        'Non-cancellable'
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
