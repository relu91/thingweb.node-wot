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
import { BindingConnection } from "@node-wot/core";

export class SSEConnection implements BindingConnection {
    public isConnected: boolean;
    private source?: EventSource;
    public constructor(
        public readonly poolKey: string,
        private endpoint: string
    ) {
        this.isConnected = false;
    }
    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.source = new EventSource(this.endpoint);
            this.source.onopen = () => {
                //debug(`HttpClient (subscribeResource) Server-Sent Event connection is opened to ${this.form.href}`);
                resolve();
            };

            this.source.onerror = function (event) {
                reject(new Error(event.toString()));
            };
        });
    }

    subscribe(event: "message" | string, callback: (data: unknown) => void) {
        if (this.source == null) {
            throw new Error();
        }
        this.source?.addEventListener(event, callback);
    }

    unsubscribe(event: "message" | string, callback: (data: unknown) => void) {
        if (this.source == null) {
            throw new Error();
        }
        this.source?.removeEventListener(event, callback);
    }

    async disconnect(): Promise<void> {
        this.source?.close();
    }
}
