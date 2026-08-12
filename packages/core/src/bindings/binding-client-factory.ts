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

import { SecurityScheme } from "wot-thing-description-types";
import { Form } from "wot-typescript-definitions";
import { BindingClient } from "./binding-client";

export interface BindingClientFactory {
    /** URI scheme(s) this factory handles, e.g. ["mqtt", "mqtt+ws"] */
    readonly schemes: string[];

    /**
     * Returns a ProtocolClient handle for the given form and credentials.
     *
     * The factory:
     * 1. Extracts the pool key from form.href + security identity
     * 2. Returns existing connection from pool if available
     * 3. Otherwise creates, configures, and connects a new connection
     * 4. Returns a client handle bound to that connection
     *
     * Security is resolved HERE, before connection, not after.
     */
    getClient(form: Form, security: SecurityScheme[], credentials: unknown): Promise<BindingClient>;

    /**
     * Destroy all pooled connections.
     * Called by Servient.shutdown() — guaranteed.
     */
    destroy(): Promise<void>;
}
