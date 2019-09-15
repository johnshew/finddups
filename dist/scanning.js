// @flow
import * as fs from './promise_fs';
import { sep as DIR_SEP } from 'path';
import { formatBytes, printLn, newCid, formatNumber } from './util';
export class FileType {
    constructor(name) {
        this.cid = newCid();
        this.name = name;
    }
    static create(stat) {
        if (stat.isFile())
            return FileType.File;
        if (stat.isDirectory())
            return FileType.Directory;
        if (stat.isSymbolicLink())
            return FileType.Symlink;
        if (stat.isBlockDevice())
            return FileType.BlockDev;
        if (stat.isCharacterDevice())
            return FileType.CharDev;
        if (stat.isFIFO())
            return FileType.FIFO;
        if (stat.isSocket())
            return FileType.Socket;
        return FileType.Unknown;
    }
}
FileType.File = new FileType('file');
FileType.Directory = new FileType('dir');
FileType.Symlink = new FileType('link');
FileType.BlockDev = new FileType('block');
FileType.CharDev = new FileType('char');
FileType.FIFO = new FileType('pipe');
FileType.Socket = new FileType('socket');
FileType.Unknown = new FileType('unknown');
/**
 * To save on memory for large trees, nodes with parents only contain the
 * basename of their path as `name`. A full path can be made by following
 * the parents. Nodes without parents have a full path as `name`.
 */
export class Path {
    constructor(name, parent = null) {
        this.name = name;
        this.parent = parent;
    }
    get() {
        let { name, parent } = this;
        return parent ? parent.join(name) : name;
    }
    join(name) {
        return this.get() + DIR_SEP + name;
    }
}
async function createNode(path) {
    let stat = await fs.lstat(path.get());
    let type = FileType.create(stat);
    let size = type === FileType.File ? stat.size : 0;
    let children;
    if (type === FileType.Directory) {
        children = await Promise.all((await fs.readdir(path.get())).map(name => createNode(new Path(name, path))));
    }
    else {
        children = [];
    }
    return { path, type, size, children };
}
export async function scan(paths) {
    let size = 0;
    let count = 0;
    let roots = [];
    function visit(node) {
        count++;
        size += node.size;
        node.children.forEach(visit);
    }
    for (let path of paths) {
        await printLn(`Scanning ${path.get()}`);
        let root = await createNode(path);
        visit(root);
        roots.push(root);
    }
    await printLn(`Found ${formatNumber(count, 0)} files, ${formatBytes(size)}`);
    return roots;
}
//# sourceMappingURL=scanning.js.map