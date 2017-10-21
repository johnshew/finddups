'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.report = report;

var _reading = require('./reading');

var _util = require('./util');

var _readline = require('readline');

var readline = _interopRequireWildcard(_readline);

var _promise_fs = require('./promise_fs');

var fs = _interopRequireWildcard(_promise_fs);

var _path = require('path');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

async function report(roots) {
  let groups = gatherDuplicates(roots);
  let count = (0, _util.formatNumber)(groups.length);
  let bytes = (0, _util.formatBytes)((0, _util.sum)(groups, group => amountDuplicated(group)));
  await (0, _util.printLn)();
  await (0, _util.printLn)(`Found ${count} duplicate sets, ${bytes} duplicated`);
  await runReport(groups);
}

function amountDuplicated(nodes) {
  if (nodes.length === 0) return 0;
  return deepSize(nodes[0]) * (nodes.length - 1);
}

function deepSize(node) {
  let size = 0;
  for (let node2 of (0, _reading.traverse)(node)) {
    size += node2.size;
  }
  return size;
}

function getDuplicateCids(roots) {
  let one = new Set();
  let many = new Set();
  for (let root of roots) {
    for (let node of (0, _reading.traverse)(root)) {
      let { cid } = node;
      if (one.has(cid)) {
        many.add(cid);
      } else {
        one.add(cid);
      }
    }
  }
  return many;
}

function gatherDuplicates(roots) {
  let dups = getDuplicateCids(roots);
  let map = new Map();
  function add(node) {
    let { cid } = node;
    if (!dups.has(cid)) {
      for (let child of node.children) {
        add(child);
      }
    } else {
      let list = map.get(cid);
      if (list === undefined) {
        list = [];
        map.set(cid, list);
      }
      list.push(node);
    }
  }
  for (let root of roots) {
    add(root);
  }
  return Array.from(map.values()).filter(x => x.length > 1);
}

async function runReport(groups) {
  groups.sort((a, b) => amountDuplicated(b) - amountDuplicated(a));

  let rl = new Readline();
  let index = 0;
  let quit = false;
  while (groups.length > 0 && !quit) {
    index = (index + groups.length) % groups.length;
    let group = groups[index];
    let count = group.length;
    let bytes = (0, _util.formatBytes)(amountDuplicated(group));
    let info = group[0].type.name + ' ' + group[0].cid;

    await (0, _util.printLn)();
    await (0, _util.printLn)(`${index + 1}/${groups.length}: ${info} (${count} copies, ${bytes} duplicated)`);

    let options = new Map();
    for (let i = 0; i < group.length; i++) {
      let { path } = group[i];
      options.set(`${i + 1}`, {
        name: `Keep only "${path.get()}"`,
        async action() {
          for (let j = 0; j < group.length; j++) {
            let { path: path2 } = group[j];
            if (i !== j) {
              await removeRecursive(path2.get());
            }
          }
          // Delete the group
          groups.splice(index, 1);
        }
      });
    }
    options.set('D', {
      name: 'Delete ALL',
      async action() {
        for (let { path } of group) {
          await removeRecursive(path.get());
        }
        // Delete the group
        groups.splice(index, 1);
      }
    });
    options.set('n', {
      name: 'Next duplicate',
      async action() {
        index++;
      }
    });
    options.set('p', {
      name: 'Previous duplicate',
      async action() {
        index--;
      }
    });
    options.set('q', {
      name: 'Quit',
      async action() {
        quit = true;
      }
    });
    await rl.choose(options);
  }
  rl.close();
  await (0, _util.printLn)();
  if (quit) {
    await (0, _util.printLn)('Quit');
  } else {
    await (0, _util.printLn)('DONE');
  }
}

class Readline {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }
  close() {
    this.rl.close();
  }
  async choose(options) {
    while (true) {
      let question = 'Please select an option:\n';
      for (let [key, { name }] of options) {
        question += `  ${key}: ${name}\n`;
      }
      question += '> ';
      let response = await new Promise(resolve => {
        this.rl.question(question, answer => {
          resolve(answer);
        });
      });
      response = response.trim();
      let option = options.get(response);
      if (option !== undefined) {
        await option.action();
        return;
      }
    }
  }
}

async function removeRecursive(path) {
  let stat = await fs.lstat(path);
  if (stat.isDirectory()) {
    for (let name of await fs.readdir(path)) {
      await removeRecursive(path + _path.sep + name);
    }
    await (0, _util.printLn)('rmdir ' + path);
    await fs.rmdir(path);
  } else {
    await (0, _util.printLn)('unlink ' + path);
    await fs.unlink(path);
  }
}
//# sourceMappingURL=reporting.js.map