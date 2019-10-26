export enum MessageType {
	Login = "login",
	Offer = "offer",
	Answer = "answer",
	Candidate = "candidate",
	Leave = "leave",
	Error = "error"
}

export interface ISocketMessage {
	type: MessageType;
	name: string;
	data: any;
}
