import React from "react";
import { Link } from "react-router-dom";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import Button from "@material-ui/core/Button";
import withStyles from "@material-ui/core/styles/withStyles";

const styles = theme => ({
  spacer: {
    flexGrow: 1
  }
});

const Header = ({ classes }) => (
  <AppBar position="static">
    <Toolbar>
      <Typography variant="h6" color="inherit">
        <Link to="/">Booking Blockchain</Link>
      </Typography>
      <div className={classes.spacer} />
      <Button color="inherit">
        <Link to="/mybookings">🛏 My bookings</Link>
      </Button>
      <Button color="inherit">
        <Link to="/myhotels">🏨 My hotels</Link>
      </Button>
      <Button color="inherit">
        <Link to="/create">🖌 Create Hotel</Link>
      </Button>
    </Toolbar>
  </AppBar>
);

export default withStyles(styles)(Header);
