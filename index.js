"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = __importDefault(require("discord.js"));
const fs_1 = __importDefault(require("fs"));
class Metadata {
    constructor(id, type) {
        this.metadatas = [];
        this.id = id;
        this.type = type;
    }
    static req(file) {
        return require(`${__dirname}/metadatas/${file}.json`);
    }
    req() {
        if (this.type === "member" || this.type === "message") {
            return require(`${__dirname}/metadatas/${this.id[0]}-${this.id[1]}.json`);
        }
        else
            return require(`${__dirname}/metadatas/${this.id}.json`);
    }
    write(metadatas = []) {
        if (this.type === "member" || this.type === "message") {
            fs_1.default.writeFileSync(`${__dirname}/metadatas/${this.id[0]}-${this.id[1]}.json`, JSON.stringify({
                type: this.type,
                id: this.id,
                metadatas: metadatas,
            }));
        }
        else {
            fs_1.default.writeFileSync(`${__dirname}/metadatas/${this.id}.json`, JSON.stringify({
                type: this.type,
                id: this.id,
                metadatas: metadatas,
            }));
        }
    }
    static exists(id) {
        if (typeof id === "string") {
            return fs_1.default.existsSync(`${__dirname}/metadatas/${id}.json`);
        }
        else {
            return fs_1.default.existsSync(`${__dirname}/metadatas/${id[0]}-${id[1]}.json`);
        }
    }
    exists() {
        if (this.type === "member" || this.type === "message") {
            return fs_1.default.existsSync(`${__dirname}/metadatas/${this.id[0]}-${this.id[1]}.json`);
        }
        else
            return fs_1.default.existsSync(`${__dirname}/metadatas/${this.id}.json`);
    }
    static toId(file) {
        return file.replace(".json", "");
    }
    remove(name) {
        if (!this.exists())
            this.write();
        let f = this.req();
        let mda = f.metadatas;
        if (mda.find((n) => n.name === name))
            mda = mda.filter((m) => m.name !== name);
        return mda;
    }
    has(name) {
        if (!this.exists())
            this.write();
        let f = this.req();
        let mda = f.metadatas;
        return mda.find((m) => m.name === name) ? true : false;
    }
    add(name, value) {
        if (!this.exists())
            this.write();
        let f = this.req();
        let mda = f.metadatas;
        mda = this.remove(name);
        mda.push({ name: name, value: value });
        this.write(mda);
    }
    static convertArrayToMap(array) {
        let m = new Map();
        array.forEach((a) => m.set(a.name, a.value));
        return m;
    }
    static convertMapToArray(map) {
        let arr = [];
        map.forEach((v, k) => {
            arr.push({ name: k, value: v });
        });
        return arr;
    }
    static syncMessage(prototype) {
        let mda = new Metadata([prototype.channelId, prototype.id], "message");
        let newArr = Metadata.convertMapToArray(prototype.metadata);
        prototype.metadata.forEach((v, k) => {
            if (!mda.has(k))
                mda.add(k, v);
        });
        let missing = mda.metadatas.filter((f) => !newArr.includes(f));
        missing.forEach((m) => {
            mda.write(mda.remove(m.name));
        });
    }
    static syncMember(prototype) {
        let mda = new Metadata([prototype.guild.id, prototype.id], "member");
        let newArr = Metadata.convertMapToArray(prototype.metadata);
        prototype.metadata.forEach((v, k) => {
            if (!mda.has(k))
                mda.add(k, v);
        });
        let missing = mda.metadatas.filter((f) => !newArr.includes(f));
        missing.forEach((m) => {
            mda.write(mda.remove(m.name));
        });
    }
    static syncChannel(prototype) {
        let mda = new Metadata(prototype.id, "channel");
        let newArr = Metadata.convertMapToArray(prototype.metadata);
        prototype.metadata.forEach((v, k) => {
            if (!mda.has(k))
                mda.add(k, v);
        });
        let missing = mda.metadatas.filter((f) => !newArr.includes(f));
        missing.forEach((m) => {
            mda.write(mda.remove(m.name));
        });
    }
}
Metadata.files = fs_1.default
    .readdirSync(__dirname + "/metadatas")
    .filter((f) => !f.startsWith("#"))
    .filter((f) => f.endsWith(".json"));
(() => __awaiter(void 0, void 0, void 0, function* () {
    discord_js_1.default.CommandInteraction.prototype.permissionError = (permissions, message) => {
        discord_js_1.default.CommandInteraction.prototype.reply({
            content: message
                ? message.replace("$perms$", permissions.join(","))
                : `:x: Error! You don't have the necessary permissions to proceed. You need: \`${permissions.join(",")}\`.`,
        });
    };
    discord_js_1.default.CommandInteraction.prototype.findingError = (names, message) => {
        discord_js_1.default.CommandInteraction.prototype.reply({
            content: message
                ? message.replace("$perms$", names.join(","))
                : `:x: Error! Cannot find: \`${names.join(",")}\`.`,
        });
    };
    discord_js_1.default.Client.prototype.on("ready", () => {
        Metadata.files.forEach((f) => {
            let mda = new Metadata(f, Metadata.req(f).type);
            switch (mda.type) {
                case "channel":
                    mda.metadatas.forEach((m) => {
                        if (discord_js_1.default.BaseChannel.prototype.id === mda.id)
                            discord_js_1.default.BaseChannel.prototype.metadata.set(m.name, m.value);
                    });
                    break;
                case "message":
                    mda.metadatas.forEach((m) => {
                        if (discord_js_1.default.Message.prototype.id === mda.id[1] &&
                            discord_js_1.default.Message.prototype.channelId === mda.id[0])
                            discord_js_1.default.Message.prototype.metadata.set(m.name, m.value);
                    });
                    break;
                case "member":
                    mda.metadatas.forEach((m) => {
                        if (discord_js_1.default.GuildMember.prototype.id === mda.id[1] &&
                            discord_js_1.default.GuildMember.prototype.guild.id === mda.id[0])
                            discord_js_1.default.GuildMember.prototype.metadata.set(m.name, m.value);
                    });
                    break;
            }
        });
    });
    setInterval(() => {
        Metadata.syncMessage(discord_js_1.default.Message.prototype);
        Metadata.syncChannel(discord_js_1.default.BaseChannel.prototype);
        Metadata.syncMember(discord_js_1.default.GuildMember.prototype);
    }, 0);
}))();
