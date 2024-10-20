const admin = require('firebase-admin');
const serviceAccount = require('../investme-faf8d-firebase-adminsdk-wcyq4-5d9ef2b134.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'gs://investme-faf8d.appspot.com' // Replace with your Firebase bucket name
});

// Get reference to Firebase Storage bucket
const bucket = admin.storage().bucket();
module.exports = { admin, bucket };