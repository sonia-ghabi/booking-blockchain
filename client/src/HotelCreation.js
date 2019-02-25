import React, { Component } from 'react';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import CssBaseline from '@material-ui/core/CssBaseline';
import withStyles from '@material-ui/core/styles/withStyles';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import { Redirect } from 'react-router';

import Header from './components/header';
import Contracts from './lib/contracts';
import Database from './lib/database.js';

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
    marginTop: theme.spacing.unit * 3,
    marginBottom: theme.spacing.unit * 3,
    padding: theme.spacing.unit * 2,
    [theme.breakpoints.up(600 + theme.spacing.unit * 3 * 2)]: {
      marginTop: theme.spacing.unit * 6,
      marginBottom: theme.spacing.unit * 6,
      padding: theme.spacing.unit * 3
    }
  },
  starsSelect: {
    minWidth: '120px'
  },
  buttonWrapper: {
    display: 'flex',
    justifyContent: 'flex-end'
  },
  button: {
    marginTop: theme.spacing.unit * 3,
    marginLeft: theme.spacing.unit
  }
});

class HotelCreation extends Component {
  /**
   * Constructor.
   * @param {*} props
   */
  constructor(props) {
    super(props);
    this.state = {
      hotelName: '',
      hotelId: null,
      hotelDescription: '',
      hotelStars: 0,
      error: ''
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
    const { hotelName, hotelDescription, hotelStars } = this.state;
    if (!hotelName || !hotelDescription || !hotelStars) {
      this.setState({ error: 'Missing required field.' });
      return;
    }
    const address = await this.contracts.createHotel(
      hotelName,
      hotelDescription,
      hotelStars
    );
    if (address) {
      await this.db.writeData(
        'hotel',
        {
          id: address,
          name: this.state.hotelName,
          description: this.state.hotelDescription,
          stars: this.state.hotelStars
        },
        address
      );
      this.setState({ hotelId: address });
    }
  }

  render() {
    const { classes } = this.props;
    const { hotelId } = this.state;

    const error = (
      <Typography color="error" align="center">
        {this.state.error}
      </Typography>
    );
    return (
      <>
        {hotelId ? <Redirect to={`manage/${hotelId}`} /> : ''}
        <Header />
        <main className={classes.layout}>
          <Paper className={classes.paper}>
            <Typography component="h1" variant="h4" align="center">
              Create Hotel
            </Typography>
            {error}
            <TextField
              label="Hotel Name"
              value={this.state.hotelName}
              onChange={this.handleChange('hotelName')}
              fullWidth
              autoComplete="fname"
              required
            />
            <TextField
              label="Hotel Description"
              multiline
              rows="5"
              value={this.state.hotelDescription}
              onChange={this.handleChange('hotelDescription')}
              margin="normal"
              variant="outlined"
              fullWidth
              required
            />

            <FormControl>
              <InputLabel htmlFor="stars">Stars</InputLabel>
              <Select
                required
                className={classes.starsSelect}
                value={this.state.hotelStars}
                onChange={this.handleChange('hotelStars')}
              >
                <MenuItem value={0}>0</MenuItem>
                <MenuItem value={1}>1</MenuItem>
                <MenuItem value={2}>2</MenuItem>
                <MenuItem value={3}>3</MenuItem>
                <MenuItem value={4}>4</MenuItem>
                <MenuItem value={5}>5</MenuItem>
              </Select>
            </FormControl>
            <div className={classes.buttonWrapper}>
              <Button
                onClick={() => this.saveHotel()}
                variant="contained"
                color="primary"
                className="button"
              >
                Create
              </Button>
            </div>
          </Paper>
        </main>
      </>
    );
  }
}

export default withStyles(styles)(HotelCreation);
