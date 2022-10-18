import {clearNode} from './lib/dom.js';
import {button, fieldset, h1, input, legend, li, span, ul} from './lib/html.js';
import {NodeMap, node} from './lib/nodes.js';
import {inited, rpc} from './rpc.js';

type userNode = {
	[node]: HTMLLIElement;
}

inited.then(userList => {
	let connected = false;
	const users = new NodeMap<string, userNode>(ul()),
	      name = input(),
	      addName = (name: string) => users.set(name, {
		[node]: li({"onclick": () => { // local
			if (!connected) {
				return;
			}
		}}, name)
	      }),
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
	      ]);
	for (const user of userList) {
		addName(user);
	}
	clearNode(document.body, [
		fs,
		users[node]
	]);
	rpc.waitUserAdd().then(addName);
	rpc.waitUserRemove().then(name => users.delete(name));
});
