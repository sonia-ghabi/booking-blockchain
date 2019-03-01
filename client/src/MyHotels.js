import React from "react";
import { Link } from "react-router-dom";
import Typography from "@material-ui/core/Typography";
import withStyles from "@material-ui/core/styles/withStyles";
import Card from "@material-ui/core/Card";
import CardActionArea from "@material-ui/core/CardActionArea";
import CardContent from "@material-ui/core/CardContent";
import Button from "@material-ui/core/Button";
import Contracts, { isReady } from "./lib/contracts";
import Header from "./components/header";
import PageLoader from "./components/pageLoader";

const styles = theme => ({
  appBar: {
    position: "relative"
  },
  layout: {
    width: "auto",
    marginLeft: theme.spacing.unit * 2,
    marginRight: theme.spacing.unit * 2,
    [theme.breakpoints.up(600 + theme.spacing.unit * 2 * 2)]: {
      width: 600,
      marginLeft: "auto",
      marginRight: "auto"
    }
  },
  card: {
    marginTop: theme.spacing.unit * 3,
    marginBottom: theme.spacing.unit * 3
  },
  media: {
    height: "200px"
  }
});

class MyHotels extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      hotels: [],
      withdrawalAmount: 0,
      withdrawalByHotel: {}
    };

    this.getWithdrawalTotal = this.getWithdrawalTotal.bind(this);
  }

  async componentDidMount() {
    await isReady();
    const userHotelsIds = (await Contracts.listMyHotels()) || [];

    this.getWithdrawalTotal(userHotelsIds);
    this.withdrawByHotel(userHotelsIds);

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
    const withdrawalAmount = await Contracts.getWithdrawalTotal(hotelIds);
    console.log(withdrawalAmount);
    this.setState({
      withdrawalAmount
    });
  }

  withdraw(hotelId) {
    return async () => {
      await Contracts.withdrawal(hotelId, false);
    };
  }

  async withdrawByHotel(hotelId) {
    const withdrawalArray =
      (await Promise.all(
        hotelId.map(async id => {
          return [id, await Contracts.withdrawal(id)];
        })
      )) || [];

    const withdrawalByHotel = withdrawalArray.reduce((acc, [id, amount]) => {
      acc[id] = Contracts.fromWei(amount) + "ETH";
      return acc;
    }, {});
    console.log(withdrawalByHotel);
    this.setState({
      withdrawalByHotel
    });
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
                Total you can withdraw: {withdrawalAmount} ETH
              </Typography>
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
              {this.state.withdrawalByHotel[hotel.id] && (
                <Button onClick={this.withdraw(hotel.id)}>
                  withdraw {this.state.withdrawalByHotel[hotel.id]}
                </Button>
              )}
            </Card>
          ))}
        </main>
      </>
    );
  }
}

export default withStyles(styles)(MyHotels);
