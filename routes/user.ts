import * as express from "express";
import {app, FirebaseError, firestore, User} from "firebase";
import {AppError} from "../types/AppError";
import UserCredential = firebase.auth.UserCredential;
import {checkUserSettingsDirectory, fetchExistingSettings, writeCredentialsToSettings} from '../ras/settings';
import {SettingsFile} from "../types/SettingsFile";
import {listenForCommands} from "../managers/stream";
import {SyncDoc} from "../types/SyncDoc";

const router = express.Router();
const debug = require('debug')('streamwarden:server');

export function setUserRoutes(a: app.App): express.Router {
	/* GET current user. */
	router.get('/', function (req, res, next) {
		const user: User = a.auth().currentUser;
		if(!!user) {
			res.status(200);
			res.send(user);
		} else {
			const p: Promise<void> = new AppError(res, 404, "No user currently set", req.path, "no user logged in").send();
			p.catch((e: Error) => {
				debug(`error sending response: ${e}`);
			});
		}
	});
	
	router.get('/synced', function (req, res, next) {
		const user: User = a.auth().currentUser;
		let close: () => void;
		if (!user) {
			const p: Promise<void> = new AppError(res, 401, "No user currently set", req.path, "no user logged in").send();
			p.catch((e: Error) => {
				debug(`error sending response: ${e}`);
			});
			return;
		}
		
		const docRef = a.firestore().collection('sync').doc(user.uid);
		close = docRef.onSnapshot((doc: firestore.DocumentSnapshot) => {
			if(!doc.exists) {
				res.status(200);
				res.send({error: false, data: { synced: false } });
				close();
				return;
			}
			const data = doc.data();
			const syncDoc: SyncDoc = new SyncDoc().fromObject(data);
			if(syncDoc.a && !!syncDoc.v) {
				res.status(200);
				res.send({error: false, data: { synced: true } });
				close();
			} else {
				res.status(200);
				res.send({error: false, data: { synced: false } });
				close();
			}
		}, err => {
			const p: Promise<void> = new AppError(res, 500, "error getting sync doc: " + err, req.path, "could not retrieve sync doc: " + err).send();
			p.catch((e: Error) => {
				debug(`error sending response: ${e}`);
			});
			if (!!close) close();
			return;
		});
	});
	
	/* POST new user. */
	router.post('/', function(req, res, next) {
		const body = req.body;
		console.log(req.body);
		if (!body.email)  {
			const p: Promise<void> = new AppError(res, 400, "You need to include an email address", req.path, "post body did not include 'email' key").send();
			p.catch((e: Error) => {
				debug(`error sending response: ${e}`);
			});
		}
		
		if (!body.password)  {
			const p: Promise<void> = new AppError(res, 400, "You need to include a password", req.path, "post body did not include 'password' key").send();
			p.catch((e: Error) => {
				debug(`error sending response: ${e}`);
			});
		}
		
		a.auth().createUserWithEmailAndPassword(body.email, body.password).then((u: UserCredential) => {
			checkUserSettingsDirectory();
			let settings: SettingsFile = fetchExistingSettings();
			writeCredentialsToSettings(settings, body.email, body.password);
			listenForCommands();
			res.status(201);
			res.send(u.user);
		}).catch((e: FirebaseError) => {
			const p: Promise<void> = new AppError(res, 500, "There was a problem creating the user: " + e.message, req.path, e.message).send();
			p.catch((e: Error) => {
				debug(`[ERROR ${req.path}] error sending response: ${e}`);
			});
		});
	});
	
	return router
}

