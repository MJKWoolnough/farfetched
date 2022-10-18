import type {WindowElement} from './lib/windows.js';
import {add, render} from './lib/css.js';
import {clearNode} from './lib/dom.js';
import {button, fieldset, h1, input, legend, li, span, ul} from './lib/html.js';
import {NodeMap, node} from './lib/nodes.js';
import {inited, rpc} from './rpc.js';
import {desktop, shell, windows} from './lib/windows.js';

type userNode = {
	[node]: HTMLLIElement;
	acceptFn?: (sdp: string) => void;
	cancelFn?: () => void;
	window?: WindowElement;
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
				if (user.window) {
					user.window.focus();
					return;
				}
				s.addWindow(user.window = windows({"title": name, "onremove": () => user.window = undefined}, []));
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
			user.cancelFn?.();
			user.window?.remove();
			users.delete(name);
		}
	});
	rpc.waitAccept().then(nameSDP => users.get(nameSDP.name)?.acceptFn?.(nameSDP.sdp));
	rpc.waitDecline().then(name => users.get(name)?.cancelFn?.());

	add("body", {
		"margin": 0
	});
	document.head.append(render());
	clearNode(document.body, s);
});
