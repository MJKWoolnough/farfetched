import {clearNode} from './lib/dom.js';
import {button, h1, input, li, ul} from './lib/html.js';
import {NodeMap, node} from './lib/nodes.js';
import {inited} from './rpc.js';

inited.then(rpc => {
	const name = input();
	clearNode(document.body, [
		name,
		button({"onclick": () => rpc.init(name.value).then(list => {
			type nameNode = {
				[node]: HTMLLIElement;
			}
			const nameList = new NodeMap<string, nameNode>(ul()),
			      addName = (name: string) => nameList.set(name, {
				[node]: li(name)
			      });
			for (const name of list) {
				addName(name);
			}
			clearNode(document.body, [
				h1(name.value),
				nameList[node]
			]);
			rpc.waitUserAdd().then(addName);
			rpc.waitUserRemove().then(name => nameList.delete(name));
		})}, "Connect")
	]);
});
