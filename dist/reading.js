// @flow
import { FileReader } from './file-reader';
import * as fs from './promise_fs';
import { FileType } from './scanning';
import { padString, newCid } from './util';
import { isIgnored } from './ignore-rules';
class StringCids {
    constructor() {
        this.map = new Map();
    }
    get(str) {
        let cid = this.map.get(str);
        if (cid === undefined) {
            cid = newCid();
            this.map.set(str, cid);
        }
        return cid;
    }
}
const DirContentCids = new StringCids();
const LinkContentCids = new StringCids();
function dirContent(nodes) {
    let data = '';
    for (let node of nodes) {
        if (!isIgnored(node)) {
            let { path, cid } = node;
            data += padString(cid + '', 20) + ' ' + path.name + '\n';
        }
    }
    return data;
}
export async function read(nodes) {
    let reader = new FileReader();
    async function nodeContent(node, children) {
        switch (node.type) {
            case FileType.File:
                return reader.add(node);
            case FileType.Directory:
                return DirContentCids.get(dirContent(await children));
            case FileType.Symlink:
                return LinkContentCids.get(await fs.readlink(node.path.get()));
            default:
                // For types other than file, directory or symlink, just use the cid
                // attached to the file type.
                return node.type.cid;
        }
    }
    async function readNode(node) {
        let { path, type, size } = node;
        // The FileReader needs all files to be added to it before being started,
        // which is what nodeContent() does, so it is important that we don't await
        // on our children until nodeContent() has been called.
        let children = Promise.all(node.children.map(readNode));
        let cid = await nodeContent(node, children);
        return { path, size, children: await children, type, cid };
    }
    let done = Promise.all(nodes.map(readNode));
    await reader.run();
    return await done;
}
//# sourceMappingURL=reading.js.map