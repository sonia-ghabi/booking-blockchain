import React, { Component } from 'react';
import MomentUtils from '@date-io/moment';
import moment from 'moment';
import { MuiPickersUtilsProvider, DatePicker } from 'material-ui-pickers';
import Typography from '@material-ui/core/Typography';
import withStyles from '@material-ui/core/styles/withStyles';
import Paper from '@material-ui/core/Paper';
import Button from '@material-ui/core/Button';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';

import Header from './components/header';
import Stars from './components/stars';
import Contracts from './lib/contracts';
import Database from './lib/database';

const styles = theme => ({
  appBar: {
    position: 'relative'
  },
  layout: {
    width: 'auto',
    marginLeft: theme.spacing.unit * 2,
    marginRight: theme.spacing.unit * 2,
    [theme.breakpoints.up(600 + theme.spacing.unit * 2 * 2)]: {
      width: 600,
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
  addRoomFab: {
    position: 'absolute',
    right: theme.spacing.unit * 2,
    top: theme.spacing.unit * 2
  },
  errorSnack: {
    position: 'static',
    marginTop: theme.spacing.unit * 3,
    marginBottom: theme.spacing.unit * 3
  },
  errorSnackContent: {
    backgroundColor: theme.palette.error.dark
  }
});

class HotelSummary extends Component {
  /**
   * Constructor.
   * @param {*} props
   */
  constructor(props) {
    super(props);
    this.state = {
      addingRoom: false,
      price: '',
      priceCancellable: '',
      userHotels: [],
      startDate: moment(),
      endDate: moment(),
      hotelSummary: {
        id: null,
        name: '',
        description: '',
        stars: 0,
        rooms: []
      }
    };
    this.contracts = new Contracts();
    this.db = new Database();

    this.hotelAddress = this.props.match.params.address;

    this.checkAvailability = this.checkAvailability.bind(this);
  }

  async componentDidMount() {
    const hotelSummary = await this.db.readData('hotel', this.hotelAddress);

    hotelSummary.rooms = [];

    this.setState({
      hotelSummary
    });

    // Get Rooms
    const db = this.db.getDB();
    db.collection('hotel')
      .doc(hotelSummary.id)
      .collection('rooms')
      .onSnapshot(querySnapshot => {
        const hotel = this.state.hotelSummary;
        const rooms = [];

        querySnapshot.forEach(function(doc) {
          const room = doc.data();
          room.id = doc.id;
          rooms.push(room);
        });

        hotel.rooms = rooms;

        this.setState({
          hotelSummary: hotel
        });
      });

    this.contracts.listHotel().then(hotelIds => {
      this.setState({
        userHotels: hotelIds
      });
    });
  }

  handleCloseAddRoomDialog() {
    this.setState({ addingRoom: false });
  }

  handleChange = key => event => {
    this.setState({
      [key]: event.target.value
    });
  };

  handleDateChange = key => date => {
    this.setState({ [key]: date });
  };

  async checkAvailability() {
    const { startDate, endDate } = this.state;
    const roomId = this.state.hotelSummary.rooms[0].id;
    const availability = await this.contracts.checkAvailability(
      this.hotelAddress,
      roomId,
      startDate.unix(),
      endDate.unix()
    );
    console.log(availability);
    return availability;
  }

  bookRoom(roomId, price, isCancellableBooking = false) {
    return async () => {
      const { startDate, endDate } = this.state;
      console.log({
        roomId,
        hotelAddress: this.hotelAddress,
        isCancellableBooking,
        price,
        startDate: startDate.unix(),
        endDate: endDate.unix()
      });
      const res = await this.contracts.book(
        0,
        this.hotelAddress,
        isCancellableBooking,
        price,
        startDate.unix(),
        endDate.unix()
      );
      console.log(res);
      return res;
    };
  }

  render() {
    const { classes } = this.props;
    const { startDate, endDate } = this.state;
    const { id, name, description, stars, rooms } = this.state.hotelSummary;
    return (
      <>
        <Header />
        <main className={classes.layout}>
          <Paper className={classes.paper}>
            <Typography component="h1" variant="h4">
              {name}
            </Typography>
            <Typography
              variant="subtitle1"
              gutterBottom
              paragraph
              className={classes.description}
            >
              {description}
            </Typography>
            <Stars rating={stars} />
          </Paper>
          <Paper
            className={classes.paper}
            style={{ display: 'flex', justifyContent: 'space-between' }}
          >
            <MuiPickersUtilsProvider utils={MomentUtils}>
              <DatePicker
                label="Checkin"
                value={startDate}
                onChange={this.handleDateChange('startDate')}
                animateYearScrolling={false}
                minDate={new Date()}
              />
              <DatePicker
                label="Checkout"
                value={endDate}
                onChange={this.handleDateChange('endDate')}
                animateYearScrolling={false}
                minDate={startDate}
              />
            </MuiPickersUtilsProvider>
            <Button variant="outlined" onClick={this.checkAvailability}>
              Check availability
            </Button>
          </Paper>
          <Paper className={classes.paper}>
            <Typography component="h2" variant="h4">
              Rooms
            </Typography>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Room</TableCell>
                  <TableCell align="right">Pre-paid price</TableCell>
                  <TableCell align="right">Cancellable price</TableCell>
                  <TableCell>Book</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rooms.map(room => (
                  <TableRow key={room.id}>
                    <TableCell component="th" scope="row">
                      {room.id}
                    </TableCell>
                    <TableCell align="right">{room.price}</TableCell>
                    <TableCell align="right">{room.priceCancellable}</TableCell>
                    <TableCell>
                      <Button
                        variant="outlined"
                        onClick={this.bookRoom(room.id, room.price)}
                      >
                        Book
                      </Button>
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

export default withStyles(styles)(HotelSummary);
