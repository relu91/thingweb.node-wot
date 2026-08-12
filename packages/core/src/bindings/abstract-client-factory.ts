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
import { BindingClientFactory } from "./binding-client-factory";
import { BindingConnection } from "./binding-connection";
import { BindingClient } from "./binding-client";

export abstract class AbstractBindingClientFactory implements BindingClientFactory {

    abstract readonly schemes: string[];

    private pool = new Map<string, BindingConnection>();

    /**
     * Compute the pool key for a given form + security context.
     *
     * Default implementation uses origin only (suitable for HTTP, Modbus).
     * Override for protocols where credentials affect connection identity (MQTT).
     */
    protected computePoolKey(
        form: Form,
        security: SecurityScheme[],
        credentials: unknown
    ): string {
        return new URL(form.href).origin;
    }

    /**
     * Create a new protocol-specific connection.
     * Called only on cache miss — guaranteed not to be called
     * if a connection for this poolKey already exists.
     */
    protected abstract createConnection(
        poolKey: string,
        form: Form,
        security: SecurityScheme[],
        credentials: unknown
    ): Promise<BindingConnection>;

    /**
     * Wrap a pooled connection in a lightweight, stateless client handle.
     * The form carries per-interaction addressing (topic, unit ID, path).
     */
    protected abstract createClient(
        connection: BindingConnection,
        form: Form
    ): BindingClient;

    /**
     * Final — not overridable. All pool logic lives here.
     */
    async getClient(
        form: Form,
        security: SecurityScheme[],
        credentials: unknown
    ): Promise<BindingClient> {
        const poolKey = this.computePoolKey(form, security, credentials);

        if (!this.pool.has(poolKey)) {
            const conn = await this.createConnection(poolKey, form, security, credentials);
            this.pool.set(poolKey, conn);
        }

        return this.createClient(this.pool.get(poolKey)!, form);
    }

    /**
     * Final — not overridable. Guaranteed cleanup of all connections.
     */
    async destroy(): Promise<void> {
        await Promise.all([...this.pool.values()].map(c => c.disconnect()));
        this.pool.clear();
    }
}
