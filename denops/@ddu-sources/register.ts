import {
  BaseSource,
  Context,
  Item,
} from "https://deno.land/x/ddu_vim@v2.0.0/types.ts";
import { Denops, fn } from "https://deno.land/x/ddu_vim@v2.0.0/deps.ts";

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
        const registers = (await fn.has(args.denops, "clipboard") ?
                           ['+', '*'] : []).concat([
           '"',
           '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
           'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
           'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
           'u', 'v', 'w', 'x', 'y', 'z',
           '-', '.', ':', '#', '%', '/', '=',
        ]);

        const items: Item<ActionData>[] = [];
        for (const name of registers) {
            const register = await fn.substitute(
              args.denops,
              await fn.getreg(args.denops, name, 1),
              "[\\xfd\\x80]", '', 'g') as string;
            if (!register){
                continue;
            }

            items.push({
                word: `${name}: ${register.replace(/\n/g, "\\n").slice(0, 200)}`,
                action: {
                  text: register,
                  regType: await fn.getregtype(args.denops, name) as string,
                },
                highlights: [
                  {
                    name: "header",
                    "hl_group": "Special",
                    col: 1,
                    width: 2,
                  },
                ],
            })
        }
        controller.enqueue(items);
        controller.close();
      },
    });
  }

  override params(): Params {
    return {};
  }
}
