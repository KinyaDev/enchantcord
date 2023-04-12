import Discord, { PermissionsString } from "discord.js";
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

  constructor(id: string, type: "channel" | "member" | "message") {
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

  add(name: string, value: string) {
    if (!this.exists()) this.write();
    let f = this.req();

    let mda = f.metadatas;
    mda = this.remove(name);
    mda.push({ name: name, value: value });

    this.write(mda);
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

        case "message":
          mda.metadatas.forEach((m) => {
            if (
              Discord.Message.prototype.id === mda.id[1] &&
              Discord.Message.prototype.channelId === mda.id[0]
            )
              Discord.Message.prototype.metadata.set(m.name, m.value);
          });

        case "member":
          mda.metadatas.forEach((m) => {
            if (
              Discord.GuildMember.prototype.id === mda.id[1] &&
              Discord.GuildMember.prototype.guild.id === mda.id[0]
            )
              Discord.GuildMember.prototype.metadata.set(m.name, m.value);
          });
      }
    });
  });

  setInterval(() => {}, 0);
})();
