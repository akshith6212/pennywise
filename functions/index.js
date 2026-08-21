/*
MIT License
Copyright (c) 2025 rushikc <rushikc.dev@gmail.com>
*/

/* eslint-disable */
// noinspection JSUnusedGlobalSymbols
// noinspection JSUnresolvedReference

const {onRequest} = require('firebase-functions/v2/https');

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
dayjs.extend(utc);
require('dotenv').config();

const admin = require('firebase-admin');
const {getFirestore} = require('firebase-admin/firestore');

admin.initializeApp();

const db = getFirestore();

const invalidResponse = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  500: 'Internal Server Error'
};

let cachedUserUid = null;

async function resolveUserUid(email) {
  if (cachedUserUid) return cachedUserUid;
  const userRecord = await admin.auth().getUserByEmail(email);
  cachedUserUid = userRecord.uid;
  return cachedUserUid;
}

function userCollection(uid, collectionName) {
  return db.collection('users').doc(uid).collection(collectionName);
}

exports.addExpenseData = onRequest(async (req, res) => {

  const userEmail = process.env.USER_EMAIL;
  const validationStatus = await isValidRequest(req, userEmail);
  if (validationStatus !== 200) {
    res.status(validationStatus).send(invalidResponse[validationStatus]);
    return;
  }

  try {
    const uid = await resolveUserUid(userEmail);
    const expense = req.body;

    let key = dayjs(expense.date).utc().utcOffset(330)
      .format('DD MMM YY, hh:mm A') + ' ' + expense.vendor.slice(0, 10);

    const docRef = userCollection(uid, 'expense').doc(key);

    docRef.set(expense).then(() => {
      console.log('Executed setDoc');
      res.send('Executed setDoc');
    }).catch(err => {
      console.error('Error in addExpenseData setDoc:', err);
      res.status(500).send('Error - ' + err.message);
    });

  } catch (err) {
    console.error('Error in addExpenseData:', err);
    res.status(500).send('Error - ' + err.message);
  }

});


exports.getOneDoc = onRequest(async (req, res) => {

  const userEmail = process.env.USER_EMAIL;
  const validationStatus = await isValidRequest(req, userEmail);
  if (validationStatus !== 200) {
    res.status(validationStatus).send(invalidResponse[validationStatus]);
    return;
  }

  try {
    const uid = await resolveUserUid(userEmail);
    const data = req.body;

    const docRef = userCollection(uid, data.collection).doc(data.key);
    docRef.get().then((resp) => {
      console.log(resp.data());
      res.send(resp.data());
    }).catch(err => {
      console.error('Error in getOneDoc getDoc:', err);
      res.status(500).send('Error - ' + err.message);
    });

  } catch (err) {
    console.error('Error in getOneDoc:', err);
    res.status(500).send('Error - ' + err.message);
  }

});


exports.setOneDoc = onRequest(async (req, res) => {

  const userEmail = process.env.USER_EMAIL;
  const validationStatus = await isValidRequest(req, userEmail);
  if (validationStatus !== 200) {
    res.status(validationStatus).send(invalidResponse[validationStatus]);
    return;
  }

  try {
    const uid = await resolveUserUid(userEmail);
    const data = req.body;

    const docRef = userCollection(uid, data.collection).doc(data.key);
    docRef.set(data.json).then(() => {
      console.log('Executed setDoc');
      res.send('Executed setOneDoc');
    }).catch(err => {
      console.error('Error in setOneDoc setDoc:', err);
      res.status(500).send('Error - ' + err.message);
    });

  } catch (err) {
    console.error('Error in setOneDoc:', err);
    res.status(500).send('Error - ' + err.message);
  }
});


exports.getAllDoc = onRequest(async (req, res) => {

  const userEmail = process.env.USER_EMAIL;
  const validationStatus = await isValidRequest(req, userEmail);
  if (validationStatus !== 200) {
    res.status(validationStatus).send(invalidResponse[validationStatus]);
    return;
  }

  try {
    const uid = await resolveUserUid(userEmail);
    const data = req.body;

    userCollection(uid, data.collection).get().then((querySnapshot) => {
      let docList = [];
      querySnapshot.forEach((doc) => {
        let document = doc.data();
        document.id = doc.id;
        docList.push(document);
      });
      res.send(docList);
    }).catch(err => {
      console.error('Error in getAllDoc getDocs:', err);
      res.status(500).send('Error - ' + err.message);
    });

  } catch (err) {
    console.error('Error in getAllDoc:', err);
    res.status(500).send('Error - ' + err.message);
  }

});


const isValidRequest = async (req, userEmail) => {

  if (req.method !== 'POST') {
    return 403;
  }

  if (!req.body || Object.keys(req.body).length === 0) {
    return 400;
  }

  if (!req.headers || !req.headers.authorization) {
    console.warn('No authorization header provided.');
    return 401;
  }

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {

    const token = req.headers.authorization.split('Bearer ')[1];

    try {
      const tokenInfoResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${token}`);
      const tokenInfo = await tokenInfoResponse.json();

      console.log('token info', tokenInfo);

      if (tokenInfo.email_verified && tokenInfo.email === userEmail) {
        return 200;
      } else {
        console.warn(`OAuth2 token provided but email ${tokenInfo.email} is not matching account user email or not verified.`);
        return 401;
      }
    } catch (oauthError) {
      console.error('OAuth2 token verification failed:', oauthError.message);
      return 500;
    }
  }
};
