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
			const nameList = new NodeMap<string, nameNode>(ul());
			for (const name of list) {
				nameList.set(name, {
					[node]: li(name)
				});
			}
			clearNode(document.body, [
				h1(name.value),
				nameList[node]
			]);
		})}, "Connect")
	]);
});
