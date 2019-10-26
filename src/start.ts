import app from "@server";
import { logger } from "@shared";
import { MessageType, ISocketMessage } from "@entities";
var WebSocketServer = require("ws").Server;

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
	logger.info("Express server started on port: " + port);
});

let userMap: { [key: string]: any } = {};
var wss = new WebSocketServer({ port: 9090 });
wss.on("connection", (connection: any) => {
	console.log("User connected");

	connection.on("message", (message: any) => {
		let inboundMessage = {} as ISocketMessage;
		try {
			inboundMessage = JSON.parse(message);
		} catch (error) {
			console.log("Invalid JSON", error);
			return;
		}
		switch (inboundMessage.type) {
			case MessageType.Login:
				handleLogin(inboundMessage, connection);
				break;
			case MessageType.Offer:
				handleOffer(inboundMessage, connection);
				break;
			case MessageType.Answer:
				handleAnswer(inboundMessage, connection);
				break;
			case MessageType.Candidate:
				handleCandidate(inboundMessage);
				break;
			case MessageType.Leave:
				handleLeave(inboundMessage);
				break;
			default:
				handleDefault(inboundMessage, connection);
		}
	});

	connection.on("close", () => {
		delete userMap[connection.name];
		var remoteConnection = userMap[connection.otherName];
		if (remoteConnection) {
			remoteConnection.otherName = null;
			let outboundMessage = {
				type: MessageType.Leave
			} as ISocketMessage;
			sendTo(remoteConnection, outboundMessage);
		}
	});
});

function handleLogin(inboundMessage: ISocketMessage, connection: any) {
	let outboundMessage = {} as ISocketMessage;
	outboundMessage.type = MessageType.Login;
	console.log("user logged in:", inboundMessage.name);
	if (userMap[inboundMessage.name]) {
		outboundMessage.data = false;
		sendTo(connection, outboundMessage);
	} else {
		userMap[inboundMessage.name] = connection;
		connection.name = inboundMessage.name;
		outboundMessage.data = true;
		sendTo(connection, outboundMessage);
	}
}

function handleOffer(inboundMessage: ISocketMessage, connection: any) {
	let calleeConnection = userMap[inboundMessage.name];
	console.log("Sending offer to:", inboundMessage.name);
	if (calleeConnection) {
		connection.otherName = inboundMessage.name;
		let outboundMessage = {} as ISocketMessage;
		outboundMessage.type = MessageType.Offer;
		outboundMessage.name = connection.name;
		outboundMessage.data = inboundMessage.data;
		sendTo(calleeConnection, outboundMessage);
	}
}

function handleAnswer(inboundMessage: ISocketMessage, connection: any) {
	let callerConnection = userMap[inboundMessage.name];
	console.log("sending answer to: ", inboundMessage.name);
	if (callerConnection) {
		connection.otherName = inboundMessage.name;
		let outboundMessage = {} as ISocketMessage;
		outboundMessage.type = MessageType.Answer;
		console.log("answer:", inboundMessage.data);
		outboundMessage.data = inboundMessage.data;
		sendTo(callerConnection, outboundMessage);
	}
}

function handleCandidate(inboundMessage: ISocketMessage) {
	console.log("sending candidate to: ", inboundMessage.name);
	let inboundConnection = userMap[inboundMessage.name];
	if (inboundConnection) {
		let outboundMessage = {
			type: MessageType.Candidate,
			data: inboundMessage.data
		} as ISocketMessage;
		sendTo(inboundConnection, outboundMessage);
	}
}

function handleLeave(inboundMessage: ISocketMessage) {
	let inboundName = inboundMessage.name;
	console.log("Disconnecting from", inboundName);
	let inboundConnection = userMap[inboundName];
	inboundConnection.otherName = null;
	if (inboundConnection != null) {
		let outboundMessage = { type: MessageType.Leave } as ISocketMessage;
		sendTo(inboundConnection, outboundMessage);
	}
}

function handleDefault(inboundMessage: ISocketMessage, connection: any) {
	let outboundMessage = {
		type: MessageType.Error,
		data: "Command not found: " + inboundMessage.type
	} as ISocketMessage;
	sendTo(connection, outboundMessage);
}

function sendTo(connection: WebSocket, message: ISocketMessage) {
	connection.send(JSON.stringify(message));
}
