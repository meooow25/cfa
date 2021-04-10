// @deno-types="https://unpkg.com/rollup@2.42.3/dist/rollup.d.ts"
import { rollup } from "https://unpkg.com/rollup@2.42.3/dist/es/rollup.browser.js";
import { parse } from "https://deno.land/std@0.92.0/flags/mod.ts";
import { assert } from "./assert.ts";

const header = `
// ==UserScript==
// @name        [WIP] Codeforces Achievements (generated)
// @namespace   https://github.com/meooow25
// @match       *://*.codeforces.com/*
// @grant       GM.xmlHttpRequest
// @grant       GM.setValue
// @grant       GM.getValue
// @grant       GM_xmlhttpRequest
// @grant       GM_setValue
// @grant       GM_getValue
// @version     0.1.0
// @author      meooow
// @description Shows unofficial Codeforces achievements
// ==/UserScript==
`.trim();

const localApiUrlBase = "http://localhost:4908/ach/";
const runFile = "./run.ts";

const emitOptions: Deno.EmitOptions = {
  compilerOptions: {
    target: "es2020",
    lib: [
      "dom",
      "es2020",
    ],
    sourceMap: false,
    removeComments: false,
  },
};

function getRemoteApiUrlBase(): string {
  const url = Deno.env.get("ACHIEVEMENT_API_URL_BASE");
  assert(url, "Missing env var ACHIEVEMENT_API_URL_BASE");
  return url;
}

async function typeCheck() {
  const { diagnostics } = await Deno.emit(runFile, emitOptions);
  if (diagnostics.length) {
    console.warn(Deno.formatDiagnostics(diagnostics));
  }
}

async function bundle(config: Record<string, string>): Promise<string> {
  const entryFileUrl = new URL("entry.ts", import.meta.url).toString();
  const entryFileSrc = `
    import { run } from "${runFile}";
    run(${JSON.stringify(config)});
  `;

  // Resolves the entry point for the script
  const entryPlugin = {
    name: "entry",
    resolveId(id: string, importer: string | undefined): string | null {
      if (id !== entryFileUrl) {
        return null;
      }
      assert(!importer, "No importer expected for entry point");
      return id;
    },
    load(id: string): string | null {
      if (id !== entryFileUrl) {
        return null;
      }
      return entryFileSrc;
    },
  };

  // Fetches JS files if they are imported from URLs.
  // Compiles TS files using Deno.emit.
  //
  // This is very similar to https://deno.land/x/drollup, but simpler and does
  // Deno.emit with check true, without which the output is ugly for some
  // reason.
  //
  // TODO: Use Deno.emit directly instead of rollup when
  // https://github.com/denoland/deno/issues/9998 is fixed. I like comments :(
  //
  const compiledCache: Record<string, string> = {};
  const denoPluginFilter = (id: string) => {
    const isJs = id.endsWith(".js") || id.endsWith(".mjs");
    const isTs = id.endsWith(".ts");
    const isHttps = id.startsWith("https://");
    const isFile = id.startsWith("file://");
    return { isJs, isHttps, ok: (isJs || isTs) && (isHttps || isFile) };
  };
  const denoAndRemotePlugin = {
    name: "deno-and-remote",
    resolveId(id: string, importer: string | undefined): string | null {
      try {
        id = new URL(id, importer).toString();
        const { ok } = denoPluginFilter(id);
        if (ok) {
          return id;
        }
      } catch (e) {
        // pass
      }
      return null;
    },
    async load(id: string): Promise<string | null> {
      const { isJs, isHttps, ok } = denoPluginFilter(id);
      if (!ok) {
        return null;
      }

      if (isJs) {
        if (compiledCache[id]) {
          return compiledCache[id];
        }
        if (isHttps) {
          return await fetch(id).then((resp) => resp.text());
        } else { // file
          return await Deno.readTextFile(id);
        }
      }

      // TS file
      const jsId = id + ".js";
      if (compiledCache[jsId]) {
        return compiledCache[jsId];
      }
      const { diagnostics, files } = await Deno.emit(id, emitOptions);
      if (diagnostics.length) {
        console.warn(Deno.formatDiagnostics(diagnostics));
      }
      Object.assign(compiledCache, files);
      return files[jsId];
    },
  };

  const inputOptions = {
    input: entryFileUrl,
    plugins: [entryPlugin, denoAndRemotePlugin],
  };
  const outputOptions = {
    format: "iife" as const,
    exports: "none" as const,
  };
  const bundle = await rollup(inputOptions);

  const { output } = await bundle.generate(outputOptions);
  assert(output.length === 1, "Expected single chunk");
  const bundledSrc = output[0];
  assert(!bundledSrc.imports.length, "Expected no imports");
  return bundledSrc.code;
}

async function main() {
  const { local, debug } = parse(Deno.args);
  const config = {
    local,
    apiUrlBase: local ? localApiUrlBase : getRemoteApiUrlBase(),
    debug,
  };

  await typeCheck();
  console.log("Type check complete");

  let src = await bundle(config);
  src = header + "\n\n" + src;
  const distDir = new URL("dist/", import.meta.url);
  await Deno.mkdir(distDir, { recursive: true });
  const bundleFile = new URL("cfa.user.js", distDir);
  await Deno.writeTextFile(bundleFile, src);
  console.log("Bundle written to", bundleFile.pathname);
}

if (import.meta.main) {
  main();
}
