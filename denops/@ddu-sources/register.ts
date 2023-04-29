import { Context, Item } from "https://deno.land/x/ddu_vim@v2.8.3/types.ts";
import {
  BaseSource,
  OnInitArguments,
} from "https://deno.land/x/ddu_vim@v2.8.3/base/source.ts";
import { Denops, fn } from "https://deno.land/x/ddu_vim@v2.8.3/deps.ts";
import { defer } from "https://deno.land/x/denops_defer@v0.6.0/batch/defer.ts";

type Params = Record<never, never>;

export type ActionData = {
  text: string;
  regType?: string;
};

type RegInfo = {
  regname: string;
  regcontents: string;
  regtype: string;
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

  override gather(args: {
    denops: Denops;
    context: Context;
    sourceParams: Params;
  }): ReadableStream<Item<ActionData>[]> {
    const registers = [
      ...(this.#hasClipboard ? VIM_CLIPBOARD_REGISTERS : []),
      ...VIM_REGISTERS,
    ];

    return new ReadableStream({
      async start(controller) {
        const reginfos = await defer(
          args.denops,
          (helper: Denops) =>
            registers.map((regname) => ({
              regname,
              regcontents: fn.getreg(helper, regname, 1).then((s) =>
                fn.substitute(helper, s, "[\\xfd\\x80]", "", "g")
              ) as Promise<string>,
              regtype: fn.getregtype(helper, regname) as Promise<string>,
            })),
        ) as RegInfo[];

        const items: Item<ActionData>[] = reginfos
          .filter(({ regcontents }) => regcontents)
          .map(({ regname, regcontents, regtype }) => ({
            word: `${regname}: ${
              regcontents.replace(/\n/g, "\\n").slice(0, 200)
            }`,
            action: {
              text: regcontents,
              regType: regtype,
            },
            highlights: [
              {
                name: "header",
                hl_group: "Special",
                col: 1,
                width: 2,
              },
            ],
          }));

        controller.enqueue(items);
        controller.close();
      },
    });
  }

  override params(): Params {
    return {};
  }
}
