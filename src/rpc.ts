import type {Subscription} from './lib/inter.js';
import {WS} from './lib/conn.js';
import pageLoad from './lib/load.js';
import {RPC} from './lib/rpc.js';

type sdpRequest = {
	name: string;
	sdp: string;
}

const BroadcastInit = -1, BroadcastUserAdd = -2, BroadcastUserRemove = -3, BroadcastSDP = -4, BroadcastCancel = -5, BroadcastAccept = -6, BroadcastDecline = -7;

export const rpc = {} as {
	waitUserAdd: () => Subscription<string>;
	waitUserRemove: () => Subscription<string>;
	waitSDP: () => Subscription<sdpRequest>;
	waitCancel: () => Subscription<void>;
	waitAccept: () => Subscription<sdpRequest>;
	waitDecline: () => Subscription<string>;
	init: (name: string) => Promise<string[]>;
	request: (r: sdpRequest) => Promise<void>;
	cancel: (name: string) => Promise<void>;
	accept: (r: sdpRequest) => Promise<void>;
	decline: (name: string) => Promise<void>;
},
inited = pageLoad.then(() => WS("/socket").then(ws => {
	const arpc = new RPC(ws);

	Object.assign(rpc, {
		"waitUserAdd": arpc.subscribe.bind(arpc, BroadcastUserAdd),
		"waitUserRemove": arpc.subscribe.bind(arpc, BroadcastUserRemove),
		"waitSDP": arpc.subscribe.bind(arpc, BroadcastSDP),
		"waitCancel": arpc.subscribe.bind(arpc, BroadcastCancel),
		"waitAccept": arpc.subscribe.bind(arpc, BroadcastAccept),
		"waitDecline": arpc.subscribe.bind(arpc, BroadcastDecline),
		"init": arpc.request.bind(arpc, "init"),
		"request": arpc.request.bind(arpc, "request"),
		"cancel": arpc.request.bind(arpc, "cancel"),
		"accept": arpc.request.bind(arpc, "accept"),
		"decline": arpc.request.bind(arpc, "decline")
	});

	return arpc.await<string[]>(BroadcastInit);
}));
