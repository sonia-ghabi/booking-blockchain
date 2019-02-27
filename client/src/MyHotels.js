import React from 'react';
import { Link } from 'react-router-dom';
import Typography from '@material-ui/core/Typography';
import withStyles from '@material-ui/core/styles/withStyles';
import Card from '@material-ui/core/Card';
import CardActionArea from '@material-ui/core/CardActionArea';
import CardContent from '@material-ui/core/CardContent';
import Button from '@material-ui/core/Button';
import Contracts, { isReady } from './lib/contracts';
import Header from './components/header';
import PageLoader from './components/pageLoader';
import { totalmem } from 'os';

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

    this.state = {
      hotels: [],
      withdrawalAmount: 0
    };

    this.getWithdrawalTotal = this.getWithdrawalTotal.bind(this);
  }

  async componentDidMount() {
    await isReady();
    const userHotelsIds = (await Contracts.listMyHotels()) || [];

    this.getWithdrawalTotal(userHotelsIds);

    const hotels = await Promise.all(
      userHotelsIds.map(id => {
        return Contracts.getHotel(id);
      })
    );

    this.setState({
      hotels
    });
  }

  async getWithdrawalTotal(hotelIds) {
    const withdrawalPromises = hotelIds.map(id => Contracts.withdrawal(id));

    const total = (await Promise.all(withdrawalPromises)).reduce((acc, BN) => {
      console.log(BN.toString());
      return acc + BN.toNumber();
    }, 0);
    console.log(total);
  }

  withdraw(hotelId) {
    return async () => {
      console.log(await Contracts.withdrawal(hotelId, false));
    };
  }

  render() {
    const { classes } = this.props;
    const { withdrawalAmount } = this.state;
    return (
      <>
        <Header />
        <main className={classes.layout}>
          <Card className={classes.card}>
            <CardContent>
              <Typography gutterBottom variant="h5" component="h2">
                You can withdraw: {withdrawalAmount} ETH
              </Typography>
              <Button color="primary">withdraw now</Button>
            </CardContent>
          </Card>
          {!this.state.hotels.length && <PageLoader />}
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
              <Button onClick={this.withdraw(hotel.id)}>withdraw</Button>
            </Card>
          ))}
        </main>
      </>
    );
  }
}

export default withStyles(styles)(MyHotels);
