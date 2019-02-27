import React, { Component } from 'react';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import withStyles from '@material-ui/core/styles/withStyles';
import Paper from '@material-ui/core/Paper';
import Dialog from '@material-ui/core/Dialog';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContentText from '@material-ui/core/DialogContentText';
import Button from '@material-ui/core/Button';
import Fab from '@material-ui/core/Fab';
import AddIcon from '@material-ui/icons/Add';
import WarningIcon from '@material-ui/icons/Warning';
import InputAdornment from '@material-ui/core/InputAdornment';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Snackbar from '@material-ui/core/Snackbar';
import SnackbarContent from '@material-ui/core/SnackbarContent';

import Header from './components/header';
import Stars from './components/stars';
import Contracts, { isReady } from './lib/contracts';
import Database, { firebaseDb } from './lib/database';

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

class ManageHotel extends Component {
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
      hotelSummary: {
        id: null,
        name: '',
        description: '',
        stars: 0
      },
      rooms: []
    };

    this.hotelAddress = this.props.match.params.address;

    this.handleCloseAddRoomDialog = this.handleCloseAddRoomDialog.bind(this);
    this.handleAddRoomDialogCreate = this.handleAddRoomDialogCreate.bind(this);
    this.saveRoom = this.saveRoom.bind(this);
  }

  async componentDidMount() {
    await isReady();
    const hotelSummary = await Contracts.getHotel(this.hotelAddress);
    this.setState({
      hotelSummary
    });

    this.loadRooms();

    Contracts.listMyHotels().then(hotelIds => {
      this.setState({
        userHotels: hotelIds
      });
    });
  }

  async loadRooms() {
    const rooms = await Contracts.getRooms(this.hotelAddress);

    this.setState({
      rooms
    });
  }

  handleCloseAddRoomDialog() {
    this.setState({ addingRoom: false });
  }

  async handleAddRoomDialogCreate() {
    const { price, priceCancellable, hotelSummary } = this.state;
    this.handleCloseAddRoomDialog();
    await this.saveRoom(hotelSummary.id, price, priceCancellable);
    this.setState({
      price: '',
      priceCancellable: ''
    });
  }

  async saveRoom(hotelId, price, priceCancellable) {
    const roomId = await Contracts.addRoom(price, priceCancellable, hotelId);
    this.loadRooms();
    if (roomId) {
      await firebaseDb
        .collection('hotel')
        .doc(hotelId)
        .collection('rooms')
        .doc(roomId)
        .set({
          price,
          priceCancellable
        });
    }
  }

  handleChange = key => event => {
    this.setState({
      [key]: event.target.value
    });
  };

  render() {
    const { classes } = this.props;
    const { id, name, description, stars } = this.state.hotelSummary;
    const { rooms } = this.state;

    return (
      <>
        <Header />
        <main className={classes.layout}>
          <Snackbar
            className={classes.errorSnack}
            open={!this.state.userHotels.includes(this.hotelAddress)}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          >
            <SnackbarContent
              className={classes.errorSnackContent}
              message={
                <span>
                  <WarningIcon style={{ verticalAlign: 'bottom' }} /> You're not
                  the owner of this hotel and can't modify it.
                </span>
              }
            />
          </Snackbar>

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
          <Paper className={classes.paper}>
            <Typography component="h2" variant="h4">
              Rooms
            </Typography>
            {this.state.userHotels.includes(this.hotelAddress) ? (
              <Fab
                color="secondary"
                aria-label="Add"
                className={classes.addRoomFab}
                onClick={() => this.setState({ addingRoom: true })}
              >
                <AddIcon />
              </Fab>
            ) : (
              ''
            )}

            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Room</TableCell>
                  <TableCell align="right">Pre-paid price</TableCell>
                  <TableCell align="right">Cancellable price</TableCell>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </main>

        <Dialog
          open={this.state.addingRoom}
          onClose={this.handleCloseAddRoomDialog}
          aria-labelledby="add-room-dialog-title"
        >
          <DialogTitle id="add-room-dialog-title">Add Room</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Please enter the room price and the price for cancellable
              bookings. Leave empty if the booking is not cancellable.
            </DialogContentText>
            <TextField
              autoFocus
              margin="dense"
              label="Pre-paid booking price"
              type="number"
              fullWidth
              value={this.state.price}
              onChange={e => this.setState({ price: e.target.value })}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">ETH</InputAdornment>
                )
              }}
            />
            <TextField
              margin="dense"
              label="Cancellable booking price"
              type="number"
              fullWidth
              value={this.state.priceCancellable}
              onChange={e =>
                this.setState({ priceCancellable: e.target.value })
              }
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">ETH</InputAdornment>
                )
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={this.handleCloseAddRoomDialog} color="primary">
              Cancel
            </Button>
            <Button onClick={this.handleAddRoomDialogCreate} color="primary">
              Create
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }
}

export default withStyles(styles)(ManageHotel);
