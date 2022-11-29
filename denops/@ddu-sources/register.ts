import {
  BaseSource,
  Context,
  Item,
} from "https://deno.land/x/ddu_vim@v2.0.0/types.ts";
import { Denops, fn } from "https://deno.land/x/ddu_vim@v2.0.0/deps.ts";
import { defer } from "https://deno.land/x/denops_defer@v0.4.0/batch/defer.ts";

type Params = Record<never, never>;

export type ActionData = {
  text: string;
  regType?: string;
};

export class Source extends BaseSource<Params> {
  override kind = "word";

  override gather(args: {
    denops: Denops;
    context: Context;
    sourceParams: Params;
  }): ReadableStream<Item<ActionData>[]> {
    return new ReadableStream({
      async start(controller) {
        // deno-fmt-ignore
        const registers = (await fn.has(args.denops, "clipboard") ?
                           ['+', '*'] : []).concat([
           '"',
           '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
           'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
           'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
           'u', 'v', 'w', 'x', 'y', 'z',
           '-', '.', ':', '#', '%', '/', '=',
        ]);

        const reginfos = await defer(
          args.denops,
          (helper) =>
            registers.map((regname) => ({
              regname,
              regcontents: fn.getreg(helper, regname, 1).then((s) =>
                fn.substitute(helper, s, "[\\xfd\\x80]", "", "g")
              ) as Promise<string>,
              regtype: fn.getregtype(helper, regname) as Promise<string>,
            })),
        );

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
                "hl_group": "Special",
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
