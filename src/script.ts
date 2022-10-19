import type {Children, PropsObject} from './lib/dom.js';
import type {WindowElement} from './lib/windows.js';
import {add, id, render} from './lib/css.js';
import {amendNode, clearNode} from './lib/dom.js';
import {button, fieldset, h1, input, label, legend, li, span, ul} from './lib/html.js';
import {NodeMap, node} from './lib/nodes.js';
import {inited, rpc} from './rpc.js';
import {StringSetting} from './lib/settings.js';
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

type Input = HTMLInputElement | HTMLButtonElement | HTMLTextAreaElement | HTMLSelectElement;

interface Labeller {
	<T extends Input>(name: Children, input: T, props?: PropsObject): [HTMLLabelElement, T];
	<T extends Input>(input: T, name: Children, props?: PropsObject): [T, HTMLLabelElement];
}

inited.then(userList => {
	let connected = false;
	const addLabel = ((name: Children | Input, input: Input | Children, props: PropsObject = {}) => {
		const iProps = {"id": props["for"] = id()};
		return name instanceof HTMLInputElement || name instanceof HTMLButtonElement || name instanceof HTMLTextAreaElement || name instanceof HTMLSelectElement ? [amendNode(name, iProps), label(props, input)] : [label(props, name), amendNode(input as Input, iProps)];
	      }) as Labeller,
	      users = new NodeMap<string, userNode>(ul()),
	      nameSetting = new StringSetting("name"),
	      name = input({"value": nameSetting.value}),
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
			nameSetting.set(n);
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
