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

const baseSchemes = ['http', 'https']
const schemes = baseSchemes.flatMap((s)=> [`${s}+longpolling`, `${s}+sse`])
export default class HttpClientFactory implements BindingClientFactory {
    getClient(form: WoT.Form, security: SecurityScheme[], credentials: unknown): Promise<BindingClient> {
        throw new Error("Method not implemented.");
    }
    destroy(): Promise<void> {
        throw new Error("Method not implemented.");
    }
    public schemes: string[] = schemes;
}
