import React from 'react';
import StarRate from '@material-ui/icons/StarRate';
import withStyles from '@material-ui/core/styles/withStyles';

const styles = theme => ({
  stars: {
    position: 'absolute',
    top: theme.spacing.unit * 4,
    right: theme.spacing.unit * 2,
    color: 'rgb(242,221,78)'
  }
});

const star = ({ rating = 0, classes }) => (
  <div className={classes.stars}>
    {Array(rating).map((r, i) => (
      <StarRate key={i} />
    ))}
  </div>
);

export default withStyles(styles)(star);
