/********************************************************************************
 * Copyright (c) 2025 Contributors to the Eclipse Foundation
 *
 * See the NOTICE file(s) distributed with this work for additional
 * information regarding copyright ownership.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0, or the W3C Software Notice and
 * Document License (2015-05-13) which is available at
 * https://www.w3.org/Consortium/Legal/2015/copyright-software-and-document.
 *
 * SPDX-License-Identifier: EPL-2.0 OR W3C-20150513
 ********************************************************************************/

import { createLoggers, Helpers } from "@node-wot/core";
import { createContext, Script } from "vm";
import { ThingModelHelpers } from "@thingweb/thing-model";
import { CompilerFunction } from "./compiler-function";
import path from "path";
const { debug, error, info } = createLoggers("cli", "executor");

export interface ScriptOptions {
    argv?: Array<string>;
    transpiler?: {
        register?: () => void;
        compiler: CompilerFunction;
    };
    env?: Record<string, string>;
}

export interface ScriptSource {
    code: string;
    filename: string;
}

export interface WoTContext {
    runtime: typeof WoT;
    helpers: Helpers;
}

export class Executor {
    private uncaughtListeners: Array<NodeJS.UncaughtExceptionListener> = [];

    public exec(scriptSource: ScriptSource, wotContext: WoTContext, options: ScriptOptions = {}): unknown {
        const compiler = options.transpiler?.compiler ?? ((code: string) => code);
        const compiledCode = compiler(scriptSource.code, scriptSource.filename);
        const script = new Script(compiledCode, scriptSource.filename);

        process.argv = options.argv ?? [];
        process.env = options.env ?? process.env;

        options.transpiler?.register?.();
        const context = createContext({
            process,
            global,
            require: this.createCustomRequire(scriptSource.filename, compiler, wotContext),
            console,
            exports: {},
            WoT: wotContext.runtime,
            WoTHelpers: wotContext.helpers,
            ModelHelpers: new ThingModelHelpers(wotContext.helpers),
        });

        const listener = (err: Error) => {
            this.logScriptError(`Asynchronous script error '${scriptSource.filename}'`, err);
            // TODO: clean up script resources
            process.exit(1);
        };

        process.prependListener("uncaughtException", listener);
        this.uncaughtListeners.push(listener);

        try {
            return script.runInContext(context, { displayErrors: true });
        } catch (err) {
            if (err instanceof Error) {
                this.logScriptError(`Servient found error in privileged script '${scriptSource.filename}'`, err);
            } else {
                error(`Servient found error in privileged script '${scriptSource.filename}' %O`, err);
            }
            return undefined;
        }
    }

    private createCustomRequire(
        scriptFilename: string,
        compiler: (code: string, filename: string) => string,
        wotContext: WoTContext
    ): NodeRequire {
        // Base directory for resolving modules
        const baseDir = path.dirname(path.resolve(scriptFilename));

        // Custom require function
        const customRequire = (moduleName: string) => {
            // Handle relative and absolute paths
            let resolvedPath: string;
            if (moduleName.startsWith("./") || moduleName.startsWith("../") || path.isAbsolute(moduleName)) {
                resolvedPath = path.resolve(baseDir, moduleName);
            } else {
                try {
                    resolvedPath = require.resolve(moduleName);
                } catch (err) {
                    throw new Error(`Cannot find module '${moduleName}'`);
                }
            }
            global.WoT = wotContext.runtime;
            return require(resolvedPath);
        };

        // Add module resolution methods
        const _resolve = require.resolve;

        // Implement cache and extensions similar to Node.js require
        customRequire.cache = require.cache;
        // eslint-disable-next-line n/no-deprecated-api
        customRequire.extensions = require.extensions;
        customRequire.resolve = _resolve;
        customRequire.main = require.main;

        return customRequire;
    }

    private logScriptError(description: string, err: Error): void {
        let message: string;
        if (typeof err === "object" && err.stack != null) {
            const match = err.stack.match(/evalmachine\.<anonymous>:([0-9]+:[0-9]+)/);
            if (Array.isArray(match)) {
                message = `and halted at line ${match[1]}\n    ${err}`;
            } else {
                message = `and halted with ${err.stack}`;
            }
        } else {
            message = `that threw ${typeof err} instead of Error\n    ${err}`;
        }
        error(`Servient caught ${description} ${message}`);
    }
}
