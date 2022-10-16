import type {Subscription} from './lib/inter.js';
import {WS} from './lib/conn.js';
import pageLoad from './lib/load.js';
import {RPC} from './lib/rpc.js';

type sdpRequest = {
	user: string;
	sdp: string;
}

const BroadcastUserAdd = -1, BroadcastUserRemove = -2, BroadcastSDP = -3;

export const rpc = {} as {
	waitUserAdd: () => Subscription<string>;
	waitUserRemove: () => Subscription<string>;
	waitSDP: () => Subscription<sdpRequest>;
	init: () => void;
	connect: () => void;
},
inited = pageLoad.then(() => WS("/socket").then(ws => {
	const arpc = new RPC(ws);
	Object.assign(rpc, {
		"waitUserAdd": arpc.subscribe.bind(BroadcastUserAdd),
		"waitUserRemove": arpc.subscribe.bind(BroadcastUserRemove),
		"waitSDP": arpc.subscribe.bind(BroadcastSDP),
		"init": arpc.request.bind("init"),
		"connect": arpc.request("connect"),
	});
	return rpc;
}));
