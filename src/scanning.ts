// @flow
import * as fs from './promise_fs';
import {sep as DIR_SEP} from 'path';
import {formatBytes, printLn, newCid, formatNumber} from './util';

export class FileType {
  static create(stat: fs.Stats): FileType {
    if (stat.isFile()) return FileType.File;
    if (stat.isDirectory()) return FileType.Directory;
    if (stat.isSymbolicLink()) return FileType.Symlink;
    if (stat.isBlockDevice()) return FileType.BlockDev;
    if (stat.isCharacterDevice()) return FileType.CharDev;
    if (stat.isFIFO()) return FileType.FIFO;
    if (stat.isSocket()) return FileType.Socket;
    return FileType.Unknown;
  }

  static File: FileType = new FileType('file');
  static Directory: FileType = new FileType('dir');
  static Symlink: FileType = new FileType('link');
  static BlockDev: FileType = new FileType('block');
  static CharDev: FileType = new FileType('char');
  static FIFO: FileType = new FileType('pipe');
  static Socket: FileType = new FileType('socket');
  static Unknown: FileType = new FileType('unknown');

  name: string;
  cid: number;
  constructor(name: string) {
    this.cid = newCid();
    this.name = name;
  }
}

/**
 * To save on memory for large trees, nodes with parents only contain the
 * basename of their path as `name`. A full path can be made by following
 * the parents. Nodes without parents have a full path as `name`.
 */
export class Path {
  name: string;
  parent: Path | null;
  constructor(name: string, parent: Path | null = null) {
    this.name = name;
    this.parent = parent;
  }
  get(): string {
    let {name, parent} = this;
    return parent ? parent.join(name) : name;
  }
  join(name: string): string {
    return this.get() + DIR_SEP + name;
  }
}

export interface Node {
  readonly type: FileType;
  readonly path: Path;
  readonly size: number;
  readonly children: Array<Node>;
}

async function createNode(path: Path): Promise<Node> {
  let stat = await fs.lstat(path.get());
  let type = FileType.create(stat);
  let size = type === FileType.File ? stat.size : 0;
  let children;
  if (type === FileType.Directory) {
    children = await Promise.all(
      (await fs.readdir(path.get())).map(name =>
        createNode(new Path(name, path)),
      ),
    );
  } else {
    children = [];
  }
  return {path, type, size, children};
}

export async function scan(paths: Path[]): Promise<Node[]> {
  let size = 0;
  let count = 0;
  let roots = [];
  function visit(node: Node) {
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
