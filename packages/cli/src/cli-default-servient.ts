/********************************************************************************
 * Copyright (c) 2018 Contributors to the Eclipse Foundation
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

// global W3C WoT Scripting API definitions
import * as WoT from "wot-typescript-definitions";
// node-wot implementation of W3C WoT Servient
import { Servient, Helpers, createLoggers } from "@node-wot/core";
// protocols used
import { HttpServer, HttpClientFactory, HttpsClientFactory } from "@node-wot/binding-http";
// import { WebSocketServer } from "@node-wot/binding-websockets";
import { CoapServer, CoapClientFactory, CoapsClientFactory } from "@node-wot/binding-coap";
import { MqttBrokerServer, MqttClientFactory } from "@node-wot/binding-mqtt";
import { FileClientFactory } from "@node-wot/binding-file";
import { LogLevel, setLogLevel } from "./utils/set-log-level";
import { ConfigurationAfterDefaults } from "./configuration";
import { Executor, ScriptOptions } from "./executor";

const { debug, info } = createLoggers("cli", "cli-default-servient");

export default class DefaultServient extends Servient {
    private uncaughtListeners: Array<NodeJS.UncaughtExceptionListener> = [];
    private runtime: typeof WoT | undefined;
    private executor = new Executor();
    public readonly config: ConfigurationAfterDefaults;
    // current log level
    public logLevel = "info";

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    public constructor(config: ConfigurationAfterDefaults) {
        super();

        this.config = config;

        // load credentials from config
        this.addCredentials(this.config.credentials);

        // display
        debug("DefaultServient configured with");
        // remove secrets from original for displaying config
        debug(`%O`, { ...this.config, credentials: null });

        // apply config
        if (typeof this.config.servient.staticAddress === "string") {
            Helpers.setStaticAddress(this.config.servient.staticAddress);
        }

        let coapServer: CoapServer | undefined;
        if (this.config.servient.clientOnly === false) {
            if (this.config.http != null) {
                const httpServer = new HttpServer(this.config.http);
                this.addServer(httpServer);

                // re-use httpServer (same port)
                // this.addServer(new WebSocketServer(httpServer));
            }
            const coapConfig = this.config.coap;
            if (coapConfig != null) {
                coapServer = new CoapServer(coapConfig);
                this.addServer(coapServer);
            }
            if (this.config.mqtt != null) {
                const mqttBrokerServer = new MqttBrokerServer({
                    uri: this.config.mqtt.broker,
                    user: typeof this.config.mqtt.username === "string" ? this.config.mqtt.username : undefined,
                    psw: typeof this.config.mqtt.password === "string" ? this.config.mqtt.password : undefined,
                    clientId: typeof this.config.mqtt.clientId === "string" ? this.config.mqtt.clientId : undefined,
                    protocolVersion:
                        typeof this.config.mqtt.protocolVersion === "number"
                            ? this.config.mqtt.protocolVersion
                            : undefined,
                });
                this.addServer(mqttBrokerServer);
            }
        }

        this.addClientFactory(new FileClientFactory());
        this.addClientFactory(new HttpClientFactory(this.config.http));
        this.addClientFactory(new HttpsClientFactory(this.config.http));
        this.addClientFactory(new CoapClientFactory(coapServer));
        this.addClientFactory(new CoapsClientFactory());
        this.addClientFactory(new MqttClientFactory());
    }

    /**
     * Runs the script in privileged context (dangerous). In practice, this means that the script can
     * require system modules.
     * @param {string} code - the script to run
     * @param {string} filename - the filename of the script
     * @param {object} options - pass cli variables or envs to the script
     */
    public runScript(code: string, filename = "script", options: ScriptOptions = {}): unknown {
        if (!this.runtime) {
            throw new Error("WoT runtime not loaded; have you called start()?");
        }

        return this.executor.exec({ code, filename }, { runtime: this.runtime, helpers: new Helpers(this) }, options);
    }

    /**
     * start
     */
    public async start(): Promise<typeof WoT> {
        const superWoT = await super.start();
        this.runtime = superWoT;

        info("DefaultServient started");

        const servientProducedThing = await superWoT.produce({
            title: "servient",
            description: "node-wot CLI Servient",
            properties: {
                things: {
                    type: "object",
                    description: "Get things",
                    observable: false,
                    readOnly: true,
                },
            },
            actions: {
                setLogLevel: {
                    description: "Set log level",
                    input: {
                        type: "string",
                        enum: ["debug", "info", "warn", "error"],
                    },
                    output: { type: "string" },
                },
                shutdown: {
                    description: "Stop servient",
                    output: { type: "string" },
                },
                ...(this.config.servient.scriptAction === true
                    ? {
                          runScript: {
                              description: "Run script",
                              input: { type: "string" },
                              output: { type: "string" },
                          },
                      }
                    : {}),
            },
        });

        servientProducedThing.setActionHandler("setLogLevel", async (payload) => {
            const level = (await Helpers.parseInteractionOutput(payload)) as LogLevel;
            setLogLevel(level);
            this.logLevel = level;
            return `Log level set to '${this.logLevel}'`;
        });
        servientProducedThing.setActionHandler("shutdown", async () => {
            debug("shutting down by remote");
            await this.shutdown();
            return undefined;
        });
        if (this.config.servient.scriptAction === true) {
            servientProducedThing.setActionHandler("runScript", async (script) => {
                const scriptv = await Helpers.parseInteractionOutput(script);
                debug("running script", scriptv);
                this.runScript(scriptv as string);
                return undefined;
            });
        }
        servientProducedThing.setPropertyReadHandler("things", async () => {
            debug("returning things");
            return this.getThings();
        });

        await servientProducedThing.expose();

        return superWoT;
    }

    public async shutdown(): Promise<void> {
        await super.shutdown();

        this.uncaughtListeners.forEach((listener) => {
            process.removeListener("uncaughtException", listener);
        });
    }
}
