import * as express from "express";
import {app, FirebaseError} from "firebase";
import {AppError} from "../types/AppError";
import UserCredential = firebase.auth.UserCredential;
import {checkUserSettingsDirectory, fetchExistingSettings, writeCredentialsToSettings} from "../ras/settings";
import {SettingsFile} from "../types/SettingsFile";
import {authenticateUser, checkSyncStatus, listenForCommands, stopListeningForCommands} from "../managers/stream";
const router = express.Router();
const debug = require('debug')('streamwarden:server');

export function attemptAutoAuth(a: app.App): Promise<firebase.User> {
	return new Promise<firebase.User>((resolve, reject) => {
		authenticateUser().then((u: UserCredential) => {
			if(u.user) {
				checkSyncStatus().then(() => {
					listenForCommands();
					resolve(u.user);
				}, () => {
					resolve(u.user);
				});
			} else {
				reject();
			}
		}).catch(reject);
	});
}

export function setAuthRoutes(a: app.App): express.Router {
	/* POST auth to sign in. */
	router.post('/', function(req, res, next) {
		
		console.log(req.body);
		
		const body = req.body;
		
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
		
		a.auth().signInWithEmailAndPassword(body.email, body.password).then((u: UserCredential) => {
			checkUserSettingsDirectory();
			let settings: SettingsFile = fetchExistingSettings();
			writeCredentialsToSettings(settings, body.email, body.password);
			listenForCommands();
			res.status(201);
			res.send(u);
		}).catch((e: FirebaseError) => {
			const p: Promise<void> = new AppError(res, 500, "There was a problem authenticating the user: " + e.message, req.path, e.message).send();
			p.catch((e: Error) => {
				debug(`[ERROR ${req.path}] error sending response: ${e}`);
			});
		});
	});
	
	router.delete('/', function(req, res, next) {
		stopListeningForCommands();
		a.auth().signOut().then(() => {
			res.status(201);
			res.send({error: false});
		}).catch((e: FirebaseError) => {
			const p: Promise<void> = new AppError(res, 500, "There was a problem signing out: " + e.message, req.path, e.message).send();
			p.catch((e: Error) => {
				debug(`[ERROR ${req.path}] error sending response: ${e}`);
			});
		});
	});
	
	return router;
}
