import * as fs from 'fs';
export function open(path, mode) {
    return new Promise((resolve, reject) => {
        fs.open(path, mode, (err, fd) => {
            err ? reject(err) : resolve(fd);
        });
    });
}
export async function read(fd, length) {
    let buffer = Buffer.allocUnsafe(length);
    let bytesRead = await new Promise((resolve, reject) => {
        fs.read(fd, buffer, 0, length, null, (err, bytesRead) => {
            err ? reject(err) : resolve(bytesRead);
        });
    });
    return buffer.slice(0, bytesRead);
}
export function close(fd) {
    return new Promise((resolve, reject) => {
        fs.close(fd, err => {
            err ? reject(err) : resolve();
        });
    });
}
export async function readlink(path) {
    const buffer = new Promise((resolve, reject) => {
        fs.readlink(path, (err, dest) => {
            err ? reject(err) : resolve(dest);
        });
    });
    return buffer instanceof Buffer ? buffer.toString() : buffer;
}
export function lstat(path) {
    return new Promise((resolve, reject) => {
        fs.lstat(path, (err, stat) => {
            err ? reject(err) : resolve(stat);
        });
    });
}
// noinspection JSUnusedGlobalSymbols
export function stat(path) {
    return new Promise((resolve, reject) => {
        fs.stat(path, (err, stat) => {
            err ? reject(err) : resolve(stat);
        });
    });
}
export async function readdir(path) {
    const names = await new Promise((resolve, reject) => {
        fs.readdir(path, (err, names) => {
            err ? reject(err) : resolve(names);
        });
    });
    // Googling gives mixed results about whether fs.readdir() sorts and
    // whether it sorts on all platforms. Just sort it ourselves to be sure.
    names.sort((a, b) => (a === b ? 0 : a > b ? 1 : -1));
    return names;
}
export function rmdir(path) {
    return new Promise((resolve, reject) => {
        fs.rmdir(path, err => {
            err ? reject(err) : resolve();
        });
    });
}
export function unlink(path) {
    return new Promise((resolve, reject) => {
        fs.unlink(path, err => {
            err ? reject(err) : resolve();
        });
    });
}
//# sourceMappingURL=promise_fs.js.map