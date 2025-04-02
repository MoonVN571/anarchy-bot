import { Minecraft } from "../../structures";
import { MineflayerEvent } from "../../typings/MineflayerEvent";

export default class KickedEvent extends MineflayerEvent {
    constructor() {
        super({
            name: 'kicked',
        });
    }

    async execute(main: Minecraft, reason: string, logged: boolean): Promise<void> {
        console.log(main.config.serverInfo.ip, reason, logged);
    }
}