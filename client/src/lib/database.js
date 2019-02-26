import firebase from "firebase";

var config = {
  apiKey: process.env.REACT_APP_APIKEY,
  authDomain: process.env.REACT_APP_AUTHDOMAIN,
  databaseURL: process.env.REACT_APP_DATABASEURL,
  projectId: process.env.REACT_APP_PROJECTID,
  storageBucket: process.env.REACT_APP_STORAGEBUCKET,
  messagingSenderId: process.env.REACT_APP_MESSAGINGSENDERID
};
firebase.initializeApp(config);

export const firebaseDb = firebase.firestore();

class Database {
  writeData(collectionName, object, id = null) {
    if (id) {
      return firebaseDb
        .collection(collectionName)
        .doc(id)
        .set(object);
    }
    return firebaseDb.collection(collectionName).add(object);
  }

  async readData(collectionName, id) {
    const req = await firebaseDb
      .collection(collectionName)
      .doc(id)
      .get();
    return req.data();
  }
}

const db = new Database();
export default db;
