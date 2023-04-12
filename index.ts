import Discord, { MessageActivityType, PermissionsString } from "discord.js";
import fs from "fs";

declare module "discord.js" {
  interface Message {
    metadata: Map<string, string>;
  }

  interface BaseChannel {
    metadata: Map<string, string>;
  }

  interface GuildMember {
    metadata: Map<string, string>;
  }

  interface CommandInteraction {
    permissionError: (
      permissions: PermissionsString[],
      message?: string
    ) => void;
    findingError: (names: string[], message?: string) => void;
  }
}

type MetadataFile = {
  type: "channel" | "message" | "member";
  id: string[] | string;
  metadatas: { name: string; value: string }[];
};

class Metadata {
  public id: string[] | string;
  public type: "channel" | "member" | "message";
  public metadatas: { name: string; value: string }[] = [];
  static files = fs
    .readdirSync(__dirname + "/metadatas")
    .filter((f) => !f.startsWith("#"))
    .filter((f) => f.endsWith(".json"));

  constructor(id: string[] | string, type: "channel" | "member" | "message") {
    this.id = id;
    this.type = type;
  }

  static req(file: string): Metadata {
    return require(`${__dirname}/metadatas/${file}.json`);
  }

  req(): MetadataFile {
    if (this.type === "member" || this.type === "message") {
      return require(`${__dirname}/metadatas/${this.id[0]}-${this.id[1]}.json`);
    } else return require(`${__dirname}/metadatas/${this.id}.json`);
  }

  write(metadatas: { name: string; value: string }[] = []) {
    if (this.type === "member" || this.type === "message") {
      fs.writeFileSync(
        `${__dirname}/metadatas/${this.id[0]}-${this.id[1]}.json`,
        JSON.stringify({
          type: this.type,
          id: this.id,
          metadatas: metadatas,
        })
      );
    } else {
      fs.writeFileSync(
        `${__dirname}/metadatas/${this.id}.json`,
        JSON.stringify({
          type: this.type,
          id: this.id,
          metadatas: metadatas,
        })
      );
    }
  }

  static exists(id: string[] | string) {
    if (typeof id === "string") {
      return fs.existsSync(`${__dirname}/metadatas/${id}.json`);
    } else {
      return fs.existsSync(`${__dirname}/metadatas/${id[0]}-${id[1]}.json`);
    }
  }

  exists() {
    if (this.type === "member" || this.type === "message") {
      return fs.existsSync(
        `${__dirname}/metadatas/${this.id[0]}-${this.id[1]}.json`
      );
    } else return fs.existsSync(`${__dirname}/metadatas/${this.id}.json`);
  }

  static toId(file: string) {
    return file.replace(".json", "");
  }

  remove(name: string) {
    if (!this.exists()) this.write();
    let f = this.req();
    let mda = f.metadatas;

    if (mda.find((n) => n.name === name))
      mda = mda.filter((m) => m.name !== name);

    return mda;
  }

  has(name: string) {
    if (!this.exists()) this.write();
    let f = this.req();
    let mda = f.metadatas;

    return mda.find((m) => m.name === name) ? true : false;
  }

  add(name: string, value: string) {
    if (!this.exists()) this.write();
    let f = this.req();

    let mda = f.metadatas;
    mda = this.remove(name);
    mda.push({ name: name, value: value });

    this.write(mda);
  }

  static convertArrayToMap(array: { name: string; value: string }[]) {
    let m = new Map();
    array.forEach((a) => m.set(a.name, a.value));

    return m;
  }

  static convertMapToArray(map: Map<any, any>) {
    let arr: { name: string; value: string }[] = [];
    map.forEach((v, k) => {
      arr.push({ name: k, value: v });
    });

    return arr;
  }

  static syncMessage(prototype: typeof Discord.Message.prototype) {
    let mda = new Metadata([prototype.channelId, prototype.id], "message");
    let newArr = Metadata.convertMapToArray(prototype.metadata);

    prototype.metadata.forEach((v, k) => {
      if (!mda.has(k)) mda.add(k, v);
    });

    let missing = mda.metadatas.filter((f) => !newArr.includes(f));

    missing.forEach((m) => {
      mda.write(mda.remove(m.name));
    });
  }

  static syncMember(prototype: typeof Discord.GuildMember.prototype) {
    let mda = new Metadata([prototype.guild.id, prototype.id], "member");
    let newArr = Metadata.convertMapToArray(prototype.metadata);

    prototype.metadata.forEach((v, k) => {
      if (!mda.has(k)) mda.add(k, v);
    });

    let missing = mda.metadatas.filter((f) => !newArr.includes(f));

    missing.forEach((m) => {
      mda.write(mda.remove(m.name));
    });
  }

  static syncChannel(prototype: typeof Discord.BaseChannel.prototype) {
    let mda = new Metadata(prototype.id, "channel");
    let newArr = Metadata.convertMapToArray(prototype.metadata);

    prototype.metadata.forEach((v, k) => {
      if (!mda.has(k)) mda.add(k, v);
    });

    let missing = mda.metadatas.filter((f) => !newArr.includes(f));

    missing.forEach((m) => {
      mda.write(mda.remove(m.name));
    });
  }
}

(async () => {
  Discord.CommandInteraction.prototype.permissionError = (
    permissions,
    message
  ) => {
    Discord.CommandInteraction.prototype.reply({
      content: message
        ? message.replace("$perms$", permissions.join(","))
        : `:x: Error! You don't have the necessary permissions to proceed. You need: \`${permissions.join(
            ","
          )}\`.`,
    });
  };

  Discord.CommandInteraction.prototype.findingError = (names, message) => {
    Discord.CommandInteraction.prototype.reply({
      content: message
        ? message.replace("$perms$", names.join(","))
        : `:x: Error! Cannot find: \`${names.join(",")}\`.`,
    });
  };

  Discord.Client.prototype.on("ready", () => {
    Metadata.files.forEach((f) => {
      let mda = new Metadata(f, Metadata.req(f).type);

      switch (mda.type) {
        case "channel":
          mda.metadatas.forEach((m) => {
            if (Discord.BaseChannel.prototype.id === mda.id)
              Discord.BaseChannel.prototype.metadata.set(m.name, m.value);
          });
          break;

        case "message":
          mda.metadatas.forEach((m) => {
            if (
              Discord.Message.prototype.id === mda.id[1] &&
              Discord.Message.prototype.channelId === mda.id[0]
            )
              Discord.Message.prototype.metadata.set(m.name, m.value);
          });
          break;

        case "member":
          mda.metadatas.forEach((m) => {
            if (
              Discord.GuildMember.prototype.id === mda.id[1] &&
              Discord.GuildMember.prototype.guild.id === mda.id[0]
            )
              Discord.GuildMember.prototype.metadata.set(m.name, m.value);
          });
          break;
      }
    });
  });

  setInterval(() => {
    Metadata.syncMessage(Discord.Message.prototype);
    Metadata.syncChannel(Discord.BaseChannel.prototype);
    Metadata.syncMember(Discord.GuildMember.prototype);
  }, 0);
})();
