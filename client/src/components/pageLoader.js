import React from 'react';
import withStyles from '@material-ui/core/styles/withStyles';
import CircularProgress from '@material-ui/core/CircularProgress';

const styles = theme => ({
  loader: {
    width: '100px',
    height: '100px',
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginTop: '-50px',
    marginLeft: '-50px'
  }
});

const PageLoader = ({ classes }) => (
  <CircularProgress size="100" className={classes.loader} />
);

export default withStyles(styles)(PageLoader);
