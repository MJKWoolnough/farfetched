import type {WindowElement} from './lib/windows.js';
import {add, render} from './lib/css.js';
import {clearNode} from './lib/dom.js';
import {button, fieldset, h1, input, legend, li, span, ul} from './lib/html.js';
import {NodeMap, node} from './lib/nodes.js';
import {inited, rpc} from './rpc.js';
import {desktop, shell, windows} from './lib/windows.js';

type arWindow = {
	acceptFn?: (sdp: string) => void;
	cancelFn?: () => void;
	window: WindowElement;
}

type userNode = {
	[node]: HTMLLIElement;
	send?: arWindow;
	receive?: arWindow;
}

inited.then(userList => {
	let connected = false;
	const users = new NodeMap<string, userNode>(ul()),
	      name = input(),
	      addName = (name: string) => {
		const user: userNode = {
			[node]: li({"onclick": () => {
				if (!connected) {
					return;
				}
				if (user.send?.window) {
					user.send.window.focus();
					return;
				}
				user.send = {"window": windows({"title": name, "onremove": () => user.send = undefined}, [])}
				s.addWindow(user.send.window);
			}}, name)
		      };
		users.set(name, user);
	      },
	      error = span(),
	      fs = fieldset([
		legend("Enter Name"),
		name,
		button({"onclick": () => {
			const n = name.value;
			rpc.init(n)
			.then(() => {
				fs.replaceWith(h1(n))
				connected = true;
			})
			.catch(e => clearNode(error, e + ""));
		}}, "Connect"),
		error
	      ]),
	      s = shell({"snap": 50}, desktop([
		fs,
		users[node]
	      ]));
	for (const user of userList) {
		addName(user);
	}
	rpc.waitUserAdd().then(addName);
	rpc.waitUserRemove().then(name => {
		const user = users.get(name);
		if (user) {
			user.send?.cancelFn?.();
			user.send?.window?.remove();
			users.delete(name);
		}
	});
	rpc.waitAccept().then(nameSDP => users.get(nameSDP.name)?.send?.acceptFn?.(nameSDP.sdp));
	rpc.waitDecline().then(name => users.get(name)?.send?.cancelFn?.());

	add("body", {
		"margin": 0
	});
	document.head.append(render());
	clearNode(document.body, s);
});
