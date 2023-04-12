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
        permissionError: (permissions: PermissionsString[], message?: string) => void;
        findingError: (names: string[], message?: string) => void;
    }
}
export {};
