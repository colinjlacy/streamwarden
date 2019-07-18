const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const logger = require('morgan');
import * as firebase from "firebase/app";

const app = express();
const debug = require('debug')('streamwarden:server');

const indexRoutes = require('./routes');
import {setUserRoutes} from './routes/user';
import {attemptAutoAuth, setAuthRoutes} from './routes/auth';

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(bodyParser.urlencoded({
	extended: true
}));
app.use(bodyParser.json());

app.use(function (req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
	next();
});

app.use(express.static(path.join(__dirname, 'public')));

const config = {
	apiKey: process.env["API_KEY"],
	authDomain: process.env["AUTH_DOMAIN"],
	databaseURL: process.env["DATABASE_URL"],
	projectId: process.env["PROJECT_ID"],
	storageBucket: process.env["STORAGE_BUCKET"],
	messagingSenderId: process.env["SENDER_ID"]
};

const fire = firebase.initializeApp(config);

app.use('/', indexRoutes);
app.use('/user', setUserRoutes(fire));
app.use('/auth', setAuthRoutes(fire));

attemptAutoAuth(fire).then((u: firebase.User) => {
	debug(`logged in as ${u.uid}`);
}).catch(() => {
	debug(`could not log in automatically`);
});

app.fire = fire;
module.exports = app;
