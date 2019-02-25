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
import Contracts from './lib/contracts';
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

class MyHotels extends React.Component {
  constructor(props) {
    super(props);

    this.db = new Database();
    this.contracts = new Contracts();

    this.state = {
      hotels: []
    };
  }

  async componentDidMount() {
    await new Promise(res => setTimeout(() => res(), 1000));
    const userHotelsIds = await this.contracts.listHotel();
    this.setState({
      userHotels: userHotelsIds
    });
    console.log(userHotelsIds);
    const hotels = await Promise.all(
      userHotelsIds.map(id => {
        console.log(id);
        return this.db.readData('hotel', id);
      })
    );
    console.log(hotels);

    this.setState({
      hotels
    });
  }

  render() {
    const { classes } = this.props;
    return (
      <>
        <Header />
        <main className={classes.layout}>
          {this.state.hotels.map(hotel => (
            <Card className={classes.card} key={hotel.id}>
              <CardActionArea>
                <Link to={`/manage/${hotel.id}`}>
                  <CardContent>
                    <Typography gutterBottom variant="h5" component="h2">
                      {hotel.name}
                    </Typography>
                  </CardContent>
                </Link>
              </CardActionArea>
            </Card>
          ))}
        </main>
      </>
    );
  }
}

export default withStyles(styles)(MyHotels);
