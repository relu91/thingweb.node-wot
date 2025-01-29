/********************************************************************************
 * Copyright (c) 2025 Contributors to the Eclipse Foundation
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
import { ErrorObject, ValidateFunction } from "ajv";
import { InvalidArgumentError } from "commander";
import _ from "lodash";

export function parseConfigParams(param: string, previous: unknown, validator: ValidateFunction<unknown>) {
    // Validate key-value pair
    if (!/^([a-zA-Z0-9_.]+):=([a-zA-Z0-9_]+)$/.test(param)) {
        throw new InvalidArgumentError("Invalid key-value pair");
    }
    const fieldNamePath = param.split(":=")[0];
    const fieldNameValue = param.split(":=")[1];
    let fieldNameValueCast;
    if (Number(fieldNameValue)) {
        fieldNameValueCast = +fieldNameValue;
    } else if (fieldNameValue === "true" || fieldNameValue === "false") {
        fieldNameValueCast = Boolean(fieldNameValue);
    } else {
        fieldNameValueCast = fieldNamePath;
    }

    // Build object using dot-notation JSON path
    const obj = _.set({}, fieldNamePath, fieldNameValueCast);
    if (!validator(obj)) {
        throw new InvalidArgumentError(
            `Config parameter '${param}' is not valid: ${(validator.errors ?? [])
                .map((o: ErrorObject) => o.message)
                .join("\n")}`
        );
    }
    // Concatenate validated parameters
    let result = previous ?? {};
    result = _.merge(result, obj);
    return result;
}
