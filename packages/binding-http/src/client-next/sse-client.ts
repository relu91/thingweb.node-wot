import { BindingClient, BindingSubscription, Content } from "@node-wot/core";
import { SSESubscription } from "../subscription-protocols";
import { HttpForm } from "../http";
import { SSEConnection } from "./sse-connection";

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
export default class SSEClient implements BindingClient {
    public constructor(private connection: SSEConnection) {}
    readResource(form: WoT.Form): Promise<Content> {
        throw new Error("Method not implemented.");
    }
    writeResource(form: WoT.Form, content: Content): Promise<void> {
        throw new Error("Method not implemented.");
    }
    invokeResource(form: WoT.Form, content?: Content): Promise<Content> {
        throw new Error("Method not implemented.");
    }
    async subscribeResource(
        form: HttpForm,
        next: (content: Content) => void,
        error?: (err: Error) => void,
        complete?: () => void
    ): Promise<BindingSubscription> {
        if (form.subprotocol !== "sse") {
            throw new Error("Exepected sub-protocol for SSEClient");
        }
        const listner = (data) => {
            // decode data and cal next
            // what about error? idk
        };
        this.connection.subscribe("message", listner);
        return {
            close: () => this.connection.unsubscribe("message", listner),
        };
    }
    async unlinkResource(): Promise<void> {
        // No operations for SSE subscriptions.
    }
}
