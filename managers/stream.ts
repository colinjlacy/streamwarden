import {fetchUserCredentials} from "../ras/settings";
import {auth, firestore} from 'firebase';
import {SyncDoc} from "../types/SyncDoc";
import {CommandDoc} from "../types/CommandDoc";
import * as request from "request";

let closeScanWatcher: () => void;
let closeDeliveryWatcher: () => void;
let closeSyncCheck: () => void;
const SCANNER_URL: string = "http://localhost:8000/scan";
const EMAILER_URL: string = "http://localhost:9000/email";
const debug = require('debug')('streamwarden:server');

export function listenForCommands() {
	listenForScanCommands();
	listenForDeliveryCommands();
}

function listenForScanCommands() {
	closeScanWatcher = firestore()
		.collection('scan')
		.where('u', '==', auth().currentUser.uid)
		.limit(1)
		.onSnapshot((querySnapshot: firestore.QuerySnapshot) => {
			querySnapshot.forEach((snap:firestore.QueryDocumentSnapshot) => {
				const data: CommandDoc = <CommandDoc>snap.data();
				request.post(SCANNER_URL, {
					body: {
						fileName: Date.now(),
						pretttyName: data.j,
						folderName: data.j,
						includeThumbnail: false
					}
				}, ((error) => {
					if(!!error) { debug(`error in scan POST request`, error); return; }
					if(!!data.d && !!data.m) {
						deliverJob(data.j, data.d).then(() => {
							snap.ref.delete().then(null, (error) => { debug(`error in deleting command doc`, error)})
						})
					} else {
						snap.ref.delete().then(null, (error) => { debug(`error in deleting command doc`, error)})
					}
				}));
			});
		}, (error: firestore.FirestoreError) => console.log(error));
}

function listenForDeliveryCommands() {
	closeDeliveryWatcher = firestore()
		.collection('scan')
		.where('f', '==', false)
		.where('u', '==', auth().currentUser.uid)
		.limit(1)
		.onSnapshot((querySnapshot: firestore.QuerySnapshot) => {
			querySnapshot.forEach((snap:firestore.QueryDocumentSnapshot) => {
				const data: CommandDoc = <CommandDoc>snap.data();
				deliverJob(data.j, data.d).then(() => {
					snap.ref.delete().then(null, (error) => { debug(`error in deleting command doc`, error)})
				}, () => {});
			});
		}, (error: firestore.FirestoreError) => console.log(error));
}

function deliverJob(foldername: string, emailAddress: string): Promise<void> {
	return new Promise<void>((res, rej) => {
		request.post(EMAILER_URL, {
			body: { foldername, emailAddress }
		}, ((error) => {
			if(!!error) { debug(`error in deliverJob POST request`, error); rej(); }
			res();
		}));
	});
}

export function stopListeningForCommands(): void {
	closeScanWatcher();
	closeDeliveryWatcher();
}

export function authenticateUser(): Promise<auth.UserCredential> {
	const {email, password} = fetchUserCredentials();
	if (!email || !password) return Promise.resolve(null);
	return auth().signInWithEmailAndPassword(email, password);
}

export async function checkSyncStatus(): Promise<boolean> {
	return new Promise<boolean>((resolve, reject) => {
		closeSyncCheck = firestore()
			.collection('sync')
			.doc(auth().currentUser.uid)
			.onSnapshot((doc: firestore.DocumentSnapshot) => {
				if(doc.exists) {
					const docData = <SyncDoc>doc.data();
					closeSyncCheck();
					resolve(docData.a);
				} else {
					closeSyncCheck();
					reject();
				}
			}, () => {
				// I don't think this should be defined,
				// but I haven't tested it so I'm dropping this here to be memory safe
				if (!!closeSyncCheck) {
					closeSyncCheck();
				}
				reject()
			});
	})
}