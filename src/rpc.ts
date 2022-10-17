import type {Subscription} from './lib/inter.js';
import {WS} from './lib/conn.js';
import pageLoad from './lib/load.js';
import {RPC} from './lib/rpc.js';

type sdpRequest = {
	name: string;
	sdp: string;
}

const BroadcastUserAdd = -1, BroadcastUserRemove = -2, BroadcastSDP = -3, BroadcastCancel = -4, BroadcastAccept = -5, BroadcastDecline = -6;

export const rpc = {} as {
	waitUserAdd: () => Subscription<string>;
	waitUserRemove: () => Subscription<string>;
	waitSDP: () => Subscription<sdpRequest>;
	init: (name: string) => Promise<string[]>;
	connect: (r: sdpRequest) => void;
},
inited = pageLoad.then(() => WS("/socket").then(ws => {
	const arpc = new RPC(ws);
	Object.assign(rpc, {
		"waitUserAdd": arpc.subscribe.bind(arpc, BroadcastUserAdd),
		"waitUserRemove": arpc.subscribe.bind(arpc, BroadcastUserRemove),
		"waitSDP": arpc.subscribe.bind(arpc, BroadcastSDP),
		"init": arpc.request.bind(arpc, "init"),
		"connect": arpc.request.bind(arpc, "connect"),
	});
	return rpc;
}));
