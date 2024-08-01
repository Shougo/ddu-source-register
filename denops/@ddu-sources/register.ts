import type { Denops } from "jsr:@denops/core@^7.0.0";
import * as fn from "jsr:@denops/std@^7.0.0/function";
import { accumulate } from "jsr:@milly/denops-batch-accumulate@^1.0.0";
import {
  BaseSource,
  type GatherArguments,
  type OnInitArguments,
} from "jsr:@shougo/ddu-vim@^5.0.0/source";
import type { Item } from "jsr:@shougo/ddu-vim@^5.0.0/types";

type Params = Record<string, never>;

export type ActionData = {
  text: string;
  regType?: string;
};

// deno-fmt-ignore
const VIM_REGISTERS = [
  '"',
  "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
  "a", "b", "c", "d", "e", "f", "g", "h", "i", "j",
  "k", "l", "m", "n", "o", "p", "q", "r", "s", "t",
  "u", "v", "w", "x", "y", "z",
  "-", ".", ":", "#", "%", "/", "=",
] as const;
const VIM_CLIPBOARD_REGISTERS = ["+", "*"] as const;

export class Source extends BaseSource<Params> {
  override kind = "word";
  #hasClipboard = false;

  override async onInit(args: OnInitArguments<Params>): Promise<void> {
    const { denops } = args;
    this.#hasClipboard = await fn.has(denops, "clipboard");
  }

  override gather(
    args: GatherArguments<Params>,
  ): ReadableStream<Item<ActionData>[]> {
    const { denops } = args;
    const registers = [
      ...(this.#hasClipboard ? VIM_CLIPBOARD_REGISTERS : []),
      ...VIM_REGISTERS,
    ];

    const createItem = async (
      denops: Denops,
      regname: string,
    ): Promise<Item<ActionData> | undefined> => {
      const reginfo = await fn.getreginfo(denops, regname);
      const contents = reginfo.regcontents?.join("\n").replaceAll(
        /[\xfd\x80]/g,
        "",
      );
      if (!contents) return;
      return {
        word: `${regname}: ${contents.replaceAll(/\n/g, "\\n").slice(0, 200)}`,
        action: {
          text: contents,
          regType: reginfo.regtype,
        },
        highlights: [
          {
            name: "header",
            hl_group: "Special",
            col: 1,
            width: 2,
          },
        ],
      };
    };

    return new ReadableStream({
      async start(controller) {
        const items = await accumulate(denops, async (helper) => {
          const items = await Promise.all(
            registers.map((regname) => createItem(helper, regname)),
          );
          return items.filter((item) => item != null);
        });

        controller.enqueue(items);
        controller.close();
      },
    });
  }

  override params(): Params {
    return {};
  }
}
