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

import {
    Content,
    DefaultContent,
    createLoggers,
    ContentSerdes,
    Form,
    BindingClient,
    BindingSubscription,
} from "@node-wot/core";
import { MqttForm } from "../mqtt";
import * as url from "url";
import { Readable } from "stream";
import MQTTConnection from "./mqtt-connection";
import { mapQoS } from "../util";

const { debug } = createLoggers("binding-mqtt", "mqtt-client");

const NO_OP_SUBSCRIPTION = { close: async () => {} };
export default class MqttClient implements BindingClient {
    constructor(private connection: MQTTConnection) {}

    public async subscribeResource(
        form: MqttForm,
        next: (value: Content) => void,
        error?: (error: Error) => void,
        complete?: () => void
    ): Promise<BindingSubscription> {
        const contentType = form.contentType ?? ContentSerdes.DEFAULT;
        const requestUri = new url.URL(form.href);
        // Keeping the path as the topic for compatibility reasons.
        // Current specification allows only form["mqv:filter"]
        const filter = requestUri.pathname.slice(1) ?? form["mqv:filter"];

        await this.connection.subscribe(
            filter,
            (topic: string, message: Buffer) => {
                next(new Content(contentType, Readable.from(message)));
            },
            (e: Error) => {
                if (error) error(e);
            }
        );

        return NO_OP_SUBSCRIPTION;
    }

    public async readResource(form: MqttForm): Promise<Content> {
        const contentType = form.contentType ?? ContentSerdes.DEFAULT;
        const requestUri = new url.URL(form.href);
        // Keeping the path as the topic for compatibility reasons.
        // Current specification allows only form["mqv:filter"]
        const filter = requestUri.pathname.slice(1) ?? form["mqv:filter"];

        const result = await new Promise<Content>((resolve, reject) => {
            this.connection.subscribe(
                filter,
                (topic: string, message: Buffer) => {
                    resolve(new Content(contentType, Readable.from(message)));
                },
                (e: Error) => {
                    reject(e);
                }
            );
        });
        //TODO: if result throws we don't usubscribe
        await this.connection.unsubscribe(filter);
        return result;
    }

    public async writeResource(form: MqttForm, content: Content): Promise<void> {
        const requestUri = new url.URL(form.href);
        const topic = requestUri.pathname.slice(1) ?? form["mqv:topic"];

        // if not input was provided, set up an own body otherwise take input as body
        const buffer = content === undefined ? Buffer.from("") : await content.toBuffer();
        await this.connection.publish(topic, buffer, {
            retain: form["mqv:retain"],
            qos: mapQoS(form["mqv:qos"]),
        });
    }

    public async invokeResource(form: MqttForm, content: Content): Promise<Content> {
        const requestUri = new url.URL(form.href);
        const topic = requestUri.pathname.slice(1);

        // if not input was provided, set up an own body otherwise take input as body
        const buffer = content === undefined ? Buffer.from("") : await content.toBuffer();
        await this.connection.publish(topic, buffer, {
            retain: form["mqv:retain"],
            qos: mapQoS(form["mqv:qos"]),
        });
        // there will be no response
        return new DefaultContent(Readable.from([]));
    }

    public async unlinkResource(form: Form): Promise<void> {
        const requestUri = new url.URL(form.href);
        const topic = requestUri.pathname.slice(1);

        await this.connection.unsubscribe(topic);
        debug(`MqttClient unsubscribed from topic '${topic}'`);
    }

    /**
     * @inheritdoc
     */
    public async requestThingDescription(uri: string): Promise<Content> {
        return this.readResource({ href: uri });
    }
}
