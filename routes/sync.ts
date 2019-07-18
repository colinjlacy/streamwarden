import {app, FirebaseError, User, firestore} from "firebase";
import {SyncDoc} from "../types/SyncDoc";
import {AppError} from "../types/AppError";

const debug = require('debug')('streamwarden:server');
let close: () => void;

declare type watcherMessage = { approve: boolean, tryAgain: boolean, cancel: boolean }

export function handleWebsocketConnection(cx, a: app.App) {
	const currentUser: User = a.auth().currentUser;
	if (!currentUser) {
		debug("unauthorized sync attempt, closing connection");
		cx.close(1001, "You must be logged in first!");
		return;
	}
	
	let syncDoc: SyncDoc = new SyncDoc(currentUser.uid);
	const docRef = a.firestore().collection('sync').doc(currentUser.uid);
	if (!!close) close();
	docRef.set(syncDoc.toObject())
		.then(() => {
			close = docRef.onSnapshot((snap: firestore.DocumentSnapshot) => {
				for (let key in snap.data()) {
					syncDoc[key] = snap.data()[key]
				}
				cx.send(JSON.stringify(syncDoc));
			}, (e: Error) => {
				debug("error pulling snapshot", e.toString());
				cx.close(1011, `internal server error: ${e}`);
				close();
			});
		})
		.catch((e: FirebaseError) => {
			debug(`error creating sync doc`, e);
			cx.close(1011, `internal server error: ${e}`);
			if(!!close) close();
		});
	
	cx.on('message', function (msgString: string) {
		let msg: watcherMessage;
		try {
			msg = JSON.parse(msgString);
		} catch (e) {
			debug("received unsupported data type: " + e.toString(), msgString);
			if(!!close) close();
			cx.close(1003, "received unsupported data type: " + e.toString());
			return;
		}
		debug("received message", msg);
		if (msg.approve === true) {
			syncDoc.approve();
			docRef.update({a: true, g: null, c: null})
				.then(() => {
					if(!!close) close();
					cx.send(JSON.stringify(syncDoc));
					cx.close(1000);
				})
				.catch((e: FirebaseError) => {
					const err = new AppError(null, 1011, `there was an internal error updating the sync doc; ${e}`, `watch`, `there was an internal error updating the sync doc; ${e}`);
					if(!!close) close();
					cx.close(1011, err.toString());
				});
		} else if (msg.tryAgain === true) {
			syncDoc = new SyncDoc(currentUser.uid);
			docRef.set(syncDoc.toObject())
				.then(() => cx.send(JSON.stringify(syncDoc)))
				.catch((e: FirebaseError) => {
					const err = new AppError(null, 1011, `there was an internal error creating the new sync doc; ${e}`, `watch`, `there was an internal error creating the new sync doc; ${e}`);
					if(!!close) close();
					cx.close(1011, err.toString());
				});
		} else if (msg.tryAgain === false || msg.cancel === true) {
			// TODO: this isn't deleting the firebase doc
			docRef.delete()
				.catch((e: FirebaseError) => {
					debug(`error deleting unwanted sync doc`, e);
				});
			if(!!close) close();
			cx.close(1000);
		} else {
			const e = new AppError(null, 1003, `received unsupported data: message must be of type {"accept": boolean, "tryAgain": boolean}`, "watch", `received unsupported data type: ${JSON.stringify(msg)}`);
			if(!!close) close();
			cx.close(1003, e.toString());
		}
	});
}