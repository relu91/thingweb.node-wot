/********************************************************************************
 * Copyright (c) 2026 Contributors to the Eclipse Foundation
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
import { BindingClient, BindingClientFactory } from "@node-wot/core";
import { SecurityScheme } from "wot-thing-description-types";
import { Agent as HttpAgent } from "http";
import { Agent as HttpsAgent } from "https";
import { HttpConfig } from "../http";
import HttpClient from "./http-client";

const baseSchemes = ["http", "https"];
const schemes = baseSchemes.flatMap((s) => [`${s}+longpolling`]);
// For http we don't need any particular connection handling as it is done by
// the underlying agent implementation. In the future we might optimize clients
// for sse or longpoll.
export default class HttpClientFactory implements BindingClientFactory {
    private readonly httpAgent: HttpAgent;
    private readonly httpsAgent: HttpsAgent;

    constructor(private readonly config: HttpConfig) {
        this.httpAgent = new HttpAgent({});
        this.httpsAgent = new HttpsAgent({
            rejectUnauthorized: !config.allowSelfSigned,
        });
    }
    public async getClient(form: WoT.Form, security: SecurityScheme[], credentials: unknown): Promise<BindingClient> {
        // if https -> use https else use http agent.
        const client = new HttpClient(
            {
                proxy: this.config.proxy,
            },
            this.httpAgent
        );

        client.setSecurity(security, credentials);
        return client;
    }
    public async destroy(): Promise<void> {
        this.httpAgent.destroy();
        this.httpsAgent.destroy();
    }
    public schemes: string[] = schemes;
}
