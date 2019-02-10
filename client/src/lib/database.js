import firebase from "firebase";

export default class Database {
  static instance;

  constructor() {
    if (Database.instance) {
      return Database.instance;
    }

    var config = {
      apiKey: process.env.REACT_APP_APIKEY,
      authDomain: process.env.REACT_APP_AUTHDOMAIN,
      databaseURL: process.env.REACT_APP_DATABASEURL,
      projectId: process.env.REACT_APP_PROJECTID,
      storageBucket: process.env.REACT_APP_STORAGEBUCKET,
      messagingSenderId: process.env.REACT_APP_MESSAGINGSENDERID
    };
    console.log(config);
    firebase.initializeApp(config);

    this.db = firebase.firestore();
    Database.instance = this;
  }

  writeData(collectionName, object, id = null) {
    if (id) {
      return this.db
        .collection(collectionName)
        .doc(id)
        .set(object);
    }
    return this.db.collection(collectionName).add(object);
  }

  async readData(collectionName, id) {
    const req = await this.db
      .collection(collectionName)
      .doc(id)
      .get();
    return req.data();
  }
}
