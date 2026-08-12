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

/**
 * Protocol test suite to test protocol implementations
 */

import { AbstractBindingClientFactory, BindingClient, BindingConnection, createLoggers } from "@node-wot/core";
import { SecurityScheme } from "wot-thing-description-types";
import MQTTConnection from "./mqtt-connection";
import MqttClient from "./mqtt-client";
import { MqttClientConfig } from "../mqtt";

const {warn, debug} = createLoggers("binding-mqtt", "mqtt-client-factory")

export default class MqttClientFactory extends AbstractBindingClientFactory {
    public  get schemes(): string[] {
        const secureSchemes = ['mqtts', 'mqtt+wss']
        return ['mqtt', 'mqtt+ws', ...(this.allowMqtts ? secureSchemes: [])]
    }
    public constructor(private readonly allowMqtts: boolean){
        super();
    }

    protected computePoolKey(
            form: WoT.Form,
            security: SecurityScheme[],
            credentials: unknown
        ): string {
            return `${form.href}${credentials.username}`;
        }

    protected async createConnection(poolKey: string, form: WoT.Form, security: SecurityScheme[], credentials: unknown): Promise<BindingConnection> {
        debug('creating connection for key %s to %s', poolKey, form.href);
        const mqttConfig: MqttClientConfig = {}
        if (security === undefined || !Array.isArray(security) || security.length === 0) {
            warn(`received empty security metadata`);
        }

        if(security.length > 1){
            throw new Error("binding-mqtt: does not support multiple selected security schemes")
        }

        const selectedSecurity = security[0];
        if(selectedSecurity.scheme != 'basic' && selectedSecurity.scheme != 'no_sec'){
            throw new Error(`binding-mqtt: unsupported security scheme: ${selectedSecurity.scheme}`)
        }

        if(selectedSecurity.scheme != 'basic'){
            if(credentials == null){
                throw new Error("binding-mqtt: security wants to be basic but you have provided no credentials");
            }
            mqttConfig.username = credentials.username
            mqttConfig.password = credentials.username
        }

        const connection =  new MQTTConnection(poolKey, form.href, mqttConfig);
        await connection.connect();
        debug('connected to %s', form.href);
        return connection;
    }

    protected createClient(connection: BindingConnection, form: WoT.Form): BindingClient {
        return new MqttClient(connection as MQTTConnection);
    }

}
