import type {Children, PropsObject} from './lib/dom.js';
import type {WindowElement} from './lib/windows.js';
import {add, id, render} from './lib/css.js';
import {amendNode, clearNode} from './lib/dom.js';
import {br, button, fieldset, h1, img, input, label, legend, li, span, ul} from './lib/html.js';
import {NodeMap, node} from './lib/nodes.js';
import {BoolSetting, StringSetting} from './lib/settings.js';
import {desktop, shell, windows} from './lib/windows.js';
import {inited, rpc} from './rpc.js';

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
	      autoSetting = new BoolSetting("autoconnect"),
	      name = input({"value": nameSetting.value}),
	      addName = (name: string) => {
		const user: userNode = {
			[node]: li({"onclick": () => {
				if (!connected) {
					return;
				} else if (user.send?.window) {
					user.send.window.focus();
					return;
				}

				user.send = {"window": windows({"title": name, "onremove": () => user.send = undefined}, [])}

				s.addWindow(user.send.window);
			}}, name)
		      };

		users.set(name, user);
	      },
	      connect = () => {
		const n = name.value;
		if (n) {
			amendNode(connectButton, {"disabled": true});
			amendNode(name, {"disabled": true});
			nameSetting.set(n);

			rpc.init(n)
			.then(() => {
				fs.replaceWith(h1([
					n,
					img({"src": `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 10"%3E%3Cpath d="M2,1 q5,6 8,8 M2,9 q5,-3 8,-8" stroke="%23f00" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke-width="2" /%3E%3C/svg%3E`, "onclick": () => {
						autoSetting.set(false);
						window.location.reload();
					}})
				]));
				connected = true;
			})
			.catch(e => clearNode(error, e + ""))
			.finally(() => {
				amendNode(connectButton, {"disabled": false});
				amendNode(name, {"disabled": false});
			});
		}
	      },
	      connectButton = button({"onclick": connect}, "Connect"),
	      error = span(),
	      fs = fieldset([
		legend("Enter Name"),
		name,
		connectButton,
		error,
		br(),
		addLabel(input({"type": "checkbox", "checked": autoSetting.value, "onchange": function(this: HTMLInputElement) {autoSetting.set(this.checked)}}), "Auto-Connect: ")
	      ]),
	      s = shell({"snap": 50}, desktop([
		fs,
		users[node]
	      ]));

	for (const user of userList) {
		addName(user);
	}

	rpc.waitUserAdd().when(addName);
	rpc.waitUserRemove().when(name => {
		const user = users.get(name);
		if (user) {
			user.send?.cancelFn?.();
			user.send?.window?.remove();
			user.receive?.cancelFn?.();
			user.receive?.window?.remove();
			users.delete(name);
		}
	});
	rpc.waitAccept().when(nameSDP => users.get(nameSDP.name)?.send?.acceptFn?.(nameSDP.sdp));
	rpc.waitDecline().when(name => users.get(name)?.send?.cancelFn?.());

	add("body", {
		"margin": 0
	});
	add("fieldset>input[type=checkbox]", {
		"display": "none",
		"+label:after": {
			"width": "1.2em",
			"height": "1em",
			"display": "inline-block",
			"content": `""`,
			"background-repeat": "no-repeat",
			"background-size": "1em",
			"background-position": "bottom center",
			"background-image": `url('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 10"%3E%3Cpath d="M2,1 q5,6 8,8 M2,9 q5,-3 8,-8" stroke="%23f00" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke-width="2" /%3E%3C/svg%3E')`
		},
		":checked+label:after": {
			"background-image": `url('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 10"%3E%3Cpath d="M1,6 l3,3 7,-8" stroke="%230f0" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke-width="2" /%3E%3C/svg%3E')`
		}
	});
	add("h1>img", {
		"width": "0.5em",
		"margin-left": "0.5em"
	});
	document.head.append(render());
	clearNode(document.body, s);

	if (autoSetting.value) {
		connect();
	}
});
