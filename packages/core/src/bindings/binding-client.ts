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

import { Form } from "wot-typescript-definitions";
import { Content } from "../content";
import { BindingSubscription } from "./binding-subscription";

export interface BindingClient {
    /** Read a resource. The form carries the full URI. */
    readResource(form: Form): Promise<Content>;

    writeResource(form: Form, content: Content): Promise<void>;

    invokeResource(form: Form, content?: Content): Promise<Content>;

    subscribeResource(
        form: Form,
        next: (content: Content) => void,
        error?: (err: Error) => void,
        complete?: () => void
    ): Promise<BindingSubscription>;

    unlinkResource(form: Form): Promise<void>;
}
