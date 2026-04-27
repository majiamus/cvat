// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { snakeCase } from 'lodash';
import { ArgumentError } from './exceptions';

export function isBoolean(value): boolean {
    return typeof value === 'boolean';
}

export function isInteger(value): boolean {
    return typeof value === 'number' && Number.isInteger(value);
}

export function isEmail(value): boolean {
    return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// Called with specific Enum context
/**
 * 检查给定值是否为枚举中的有效值
 * 该函数通过遍历枚举对象的所有属性来验证值是否存在
 * 
 * @param {any} value - 要检查的值
 * @returns {boolean} - 如果值存在于枚举中返回true，否则返回false
 * @example
 * const Color = { RED: 'red', BLUE: 'blue' };
 * Color.isEnum('red'); // true
 * Color.isEnum('green'); // false
 */
export function isEnum(value): boolean {
    // 遍历枚举对象的所有属性
    for (const key in this) {
        // 只检查对象自身的属性（不包括原型链上的属性）
        if (Object.prototype.hasOwnProperty.call(this, key)) {
            // 如果找到匹配的值，返回true
            if (this[key] === value) {
                return true;
            }
        }
    }

    // 遍历完所有属性后仍未找到匹配值，返回false
    return false;
}

export function isString(value): boolean {
    return typeof value === 'string';
}

export function checkFilter(filter, fields): void {
    for (const prop in filter) {
        if (Object.prototype.hasOwnProperty.call(filter, prop)) {
            if (!(prop in fields)) {
                throw new ArgumentError(`Unsupported filter property has been received: "${prop}"`);
            } else if (!fields[prop](filter[prop])) {
                throw new ArgumentError(`Received filter property "${prop}" does not satisfy API`);
            }
        }
    }
}

export function checkExclusiveFields(obj, exclusive, ignore): void {
    const fields = {
        exclusive: [],
        other: [],
    };
    for (const field in obj) {
        if (!(ignore.includes(field))) {
            if (exclusive.includes(field)) {
                if (fields.other.length || fields.exclusive.length) {
                    throw new ArgumentError(`Do not use the filter field "${field}" with others`);
                }
                fields.exclusive.push(field);
            } else {
                fields.other.push(field);
            }
        }
    }
}

export function checkObjectType(name, value, type, instance?): boolean {
    if (type) {
        if (typeof value !== type) {
            // specific case for integers which aren't native type in JS
            if (type === 'integer' && Number.isInteger(value)) {
                return true;
            }

            throw new ArgumentError(`"${name}" is expected to be "${type}", but "${typeof value}" received.`);
        }
    } else if (instance) {
        if (!(value instanceof instance)) {
            if (value !== undefined) {
                throw new ArgumentError(
                    `"${name}" is expected to be ${instance.name}, but ` +
                        `"${value.constructor.name}" received`,
                );
            }

            throw new ArgumentError(`"${name}" is expected to be ${instance.name}, but "undefined" received`);
        }
    }

    return true;
}

export function checkInEnum<T>(name: string, value: T, values: T[]): boolean {
    const possibleValues = Object.values(values);
    if (!possibleValues.includes(value)) {
        throw new ArgumentError(`Value ${name} must be on of [${possibleValues.join(', ')}]`);
    }

    return true;
}

export class FieldUpdateTrigger {
    #updatedFlags: Record<string, boolean> = {};

    get(key: string): boolean {
        return this.#updatedFlags[key] || false;
    }

    resetField(key: string): void {
        delete this.#updatedFlags[key];
    }

    reset(): void {
        this.#updatedFlags = {};
    }

    update(name: string): void {
        this.#updatedFlags[name] = true;
    }

    getUpdated(data: object, propMap: Record<string, string> = {}): Record<string, unknown> {
        const result = {};
        for (const updatedField of Object.keys(this.#updatedFlags)) {
            result[propMap[updatedField] || updatedField] = data[updatedField];
        }
        return result;
    }
}

export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

export function camelToSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, (letter: string) => `_${letter.toLowerCase()}`);
}

export function isResourceURL(url: string): boolean {
    return /\/([0-9]+)$/.test(url);
}

export function isPageSize(value: number | 'all'): boolean {
    return isInteger(value) || value === 'all';
}

export function fieldsToSnakeCase(params: Record<string, any>): Record<string, any> {
    const result = {};
    for (const [k, v] of Object.entries(params)) {
        result[snakeCase(k)] = v;
    }
    return result;
}

export function filterFieldsToSnakeCase(
    filter: Record<string, string | number>,
    keysToSnake: string[],
): Record<string, string | number> {
    let searchParams: Record<string, string | number> = {};
    for (const key of Object.keys(filter)) {
        if (!keysToSnake.includes(key)) {
            searchParams[key] = filter[key];
        }
    }
    searchParams = fieldsToSnakeCase(searchParams);

    const filtersGroup = [];
    for (const key of keysToSnake) {
        if (filter[key]) {
            filtersGroup.push({ '==': [{ var: camelToSnakeCase(key) }, filter[key]] });
        }
    }

    if (searchParams.filter) {
        const parsed = JSON.parse(searchParams.filter);
        searchParams.filter = JSON.stringify({ and: [parsed, ...filtersGroup] });
    } else if (filtersGroup.length) {
        searchParams.filter = JSON.stringify({ and: [...filtersGroup] });
    }
    return searchParams;
}
