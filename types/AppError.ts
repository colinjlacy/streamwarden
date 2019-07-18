import { Response } from "express";
const debug = require('debug')('streamwarden:server');

export class AppError {
	constructor(public response: Response, public status: number, public message: string, public context: string, public log: string) {
		return this;
	}
	
	send(): Promise<null> {
		return new Promise<null>((resolve => {
			this.response.status(this.status);
			debug(this.context, this.log);
			this.response.send({
				error: true,
				status: this.status,
				message: this.message
			});
			resolve();
		}));
	}
	
	public toObject(): {[key: string]: any} {
		return {
			error: true,
			status: this.status,
			message: this.message
		}
	}
	
	public toString(): string {
		return JSON.stringify(this.toObject());
	}
	
}