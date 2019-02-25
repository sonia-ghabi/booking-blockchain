import React from 'react';
import { Link } from 'react-router-dom';
import Typography from '@material-ui/core/Typography';
import withStyles from '@material-ui/core/styles/withStyles';
import Card from '@material-ui/core/Card';
import CardActionArea from '@material-ui/core/CardActionArea';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import CardMedia from '@material-ui/core/CardMedia';
import Button from '@material-ui/core/Button';
import Database from './lib/database.js';
import Header from './components/header';
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
  card: {
    marginTop: theme.spacing.unit * 3,
    marginBottom: theme.spacing.unit * 3
  },
  media: {
    height: '200px'
  }
});

class HotelList extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      hotels: []
    };
  }

  componentDidMount() {
    this.db = new Database();
    // Get Hotels
    const db = this.db.getDB();
    db.collection('hotel').onSnapshot(querySnapshot => {
      const hotels = [];

      querySnapshot.forEach(function(doc) {
        const hotel = doc.data();
        hotel.id = doc.id;
        hotels.push(hotel);
      });

      this.setState({
        hotels
      });
      console.log(hotels);
    });
  }

  render() {
    const { classes } = this.props;
    return (
      <>
        <Header />
        <main className={classes.layout}>
          {this.state.hotels.map((hotel, index) => (
            <Card className={classes.card} key={hotel.id}>
              <CardActionArea>
                <CardMedia
                  className={classes.media}
                  image={`https://source.unsplash.com/featured/600x${200 +
                    index}/?hotel`}
                />
                <CardContent>
                  <Typography gutterBottom variant="h5" component="h2">
                    {hotel.name}
                  </Typography>
                  <Typography component="p">{hotel.description}</Typography>
                </CardContent>
              </CardActionArea>
              <CardActions>
                <Link to={`/book/${hotel.id}`}>
                  <Button color="primary">Book a room</Button>
                </Link>
              </CardActions>
            </Card>
          ))}
        </main>
      </>
    );
  }
}

export default withStyles(styles)(HotelList);
