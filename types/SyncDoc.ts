export class SyncDoc {
	v?: string; // voiceUserId
	u?: string; // firebaseUserId
	a?: boolean; // approved
	i?: string; // voiceUserInfo
	g?: string; // generatedCode
	c?: string; // attemptedCode
	t?: number; // timestamp
	
	constructor(userId?: string) {
		this.a = false;
		this.t = Date.now();
		if(userId) {
			this.u = userId;
			this.generateCode();
		}
	}
	
	public generateCode(): void {
		const num: string = Math.random().toFixed(4);
		this.g = num.substr(2);
	}
	
	public approve(): void {
		this.a = true;
	}
	
	public toObject(): {[key: string]: any} {
		return {
			v: this.v || '',
			u: this.u || '',
			a: this.a || false,
			i: this.i || '',
			g: this.g || '',
			c: this.c || '',
			t: this.t
		}
	}
	
	public fromObject(obj: any): SyncDoc {
		this.v = obj.v;
		this.u = obj.u;
		this.a = obj.a;
		this.i = obj.i;
		this.g = obj.g;
		this.c = obj.c;
		this.t = obj.t;
		return this;
	}
}