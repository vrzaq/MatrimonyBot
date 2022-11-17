"use strict";
require('dotenv').config();

const { flatDirectly } = require('./placement/importantly/flatDirectly.js');
const { qrcode, rimraf, baileys, fs, chalk, figlet, CFonts, yargs, pino, Boom, moment } = new flatDirectly();
const { default: makeWASocket, isJidStatusBroadcast, delay, jidDecode, getContentType, fetchLatestBaileysVersion, makeInMemoryStore, useMultiFileAuthState, Browsers, areJidsSameUser, jidNormalizedUser, proto, generateWAMessageFromContent, DisconnectReason } = baileys;
const { config } = require('./placement/arguments/config.js');
const { inf } = config;
const { bindMsg } = require('./placement/validation/bindMsg.js');
const { Functions } = require('./placement/validation/Functions.js');
const { bgColor, color, msgs, pluginLoader, Scandir, isLatestVersion } = Functions;
const { groupManage } = require("./database/index.js");
const { switches } = require("./database/data/data.json");

async function session(path) {
  const baileysVersion = await fetchLatestBaileysVersion();
  const getAuth = await useMultiFileAuthState(path);
  const checkVersion = await isLatestVersion();
  const store = await makeInMemoryStore({ 
    logger: pino().child({
      level: 'silent', 
      stream: 'store'
    }),
  })
  const ZAQ = await makeWASocket({
    version: baileysVersion.version, 
      logger: pino({ 
      level: 'silent' 
    }), 
    printQRInTerminal: true, 
    auth: getAuth.state, 
    msgRetryCounterMap: {}, 
    markOnlineOnConnect: true, 
    syncFullHistory: true,
    keepAliveIntervalMs: 60000,
    browser: Browsers.appropriate(inf.ownName),
    getMessage: async key => {
      if(store) {
        var msg = await store.loadMessage(key.remoteJid, key.id, undefined);
        return msg?.message || undefined;
      };
      return {
        conversation: undefined,
      };
    },
  });
  class page {
    static _ = pluginLoader('../../handlers/events');
    static __ = pluginLoader('../../handlers/response');
    static ___ = pluginLoader('../../handlers/commands');
    constructor() {
      this.START_TIME = Date.now();
      this.LAUNCH_TIME_MS = Date.now() - this.START_TIME;
    };
  };
  global.plugins = Object.assign(page._, page.__, page.___);
  fs.writeFileSync('./database/temp/txt/start.txt', new page().START_TIME.toString());
  console.log(chalk.hex('#FF8800').bold(figlet.textSync(inf.ownName, { font: 'Standard', horizontalLayout: 'default', vertivalLayout: 'default', width: 80, whitespaceBreak: false }), ), chalk.italic.yellow('\n'+require("./package.json").description))
  console.log(color('[SYS]', 'cyan'), `Client loaded with ${color(Object.keys(store.contacts).length, '#009FF0')} contacts, ` + `${color(store.chats.length, '#009FF0')} chats, ` + `${color(Object.keys(store.messages).length, '#009FF0')} messages in ` + `${color(new page().LAUNCH_TIME_MS / 1000, '#38ef7d')}s`)
  console.log(color('[SYS]', 'cyan'), `Package Version`, color(`${require("./package.json").version}`, '#009FF0'), 'Is Latest :', color(`${checkVersion.isLatest}`, '#f5af19'));
  console.log(color('[SYS]', 'cyan'), `WA Version`, color(baileysVersion.version.join('.'), '#38ef7d'), 'Is Latest :', color(`${baileysVersion.isLatest}`, '#f5af19'));
  console.log(color('[SYS]', 'cyan'), `Loaded Plugins ${color(Object.keys(plugins).length, '#38ef7d')} of ${color(Scandir('./handlers').length, '#f5af19')}`);
  if(store) {
    try {
      store.readFromFile("database/store/baileys_store.json");
    } catch {
      fs.writeFile('./database/store/store.json', JSON.stringify([], null, 3), () => {
        store.writeToFile("database/store/store.json");
      });
    } finally {
      store.writeToFile("database/store/store.json");
    };
  };
  await store?.bind(ZAQ.ev);
  await bindMsg(ZAQ);
  ZAQ.ev.on('creds.update', getAuth.saveCreds);
  ZAQ.ev.on('connection.update', update => {
  ZAQ.ev.emit('multi.session', update)
    require("./collections/connectionApi/connectionApi.js").JsonMultiSessions(update, session, path)
  });
  ZAQ.ev.on('messages.upsert', message => {
    require("./collections/messagesUpsert/messagesUpsert.js").JsonRoomFeatures(ZAQ, message, store)
  })
  ZAQ.ev.on("groups.update", p => {
    require("./collections/groupUpdate/groupUpdate.js").JsonGroupAnnounce(ZAQ, p)
  });
  ZAQ.ev.on('group-participants.update', jid => {
    require("./collections/groupAction/groupAction.js").JsonGroupMetaData(ZAQ, jid)
  });
  ZAQ.ev.on('call', json => {
    require("./collections/callFunctions/callFunctions.js").JsonCall(ZAQ, json)
  });
};
process.on("uncaughtException", json => {
  if(json) {
    console.log(json);
  };
});
process.on("unhandledRejection", json => {
  if(json) {
    console.log(json);
  };
});
session('./database/session');