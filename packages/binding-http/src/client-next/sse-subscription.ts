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
import { BindingSubscription } from "@node-wot/core";
import { SSEConnection } from "./sse-connection";

export class SSESubscription implements BindingSubscription {
    constructor(private readonly connection: SSEConnection) {}

    open(next: (value: Content) => void, error?: (error: Error) => void, complete?: () => void): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.eventSource = new EventSource(this.form.href);

            this.eventSource.onopen = (event) => {
                debug(`HttpClient (subscribeResource) Server-Sent Event connection is opened to ${this.form.href}`);
                resolve();
            };
            this.eventSource.onmessage = (event) => {
                debug(`HttpClient received ${JSON.stringify(event)} from ${this.form.href}`);
                const output = new Content(this.form.contentType ?? ContentSerdes.DEFAULT, Readable.from(event.data));
                next(output);
            };
            this.eventSource.onerror = function (event) {
                error?.(new Error(event.toString()));
                complete && complete();
                reject(event.toString());
            };
        });
    }

    close(): void {
        this.eventSource?.close();
    }
}
