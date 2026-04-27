// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import {
    AttrInputType, SerializedAttribute, SerializedLabel,
} from './server-response-types';
import { ShapeType, AttributeType, LabelType } from './enums';
import { ArgumentError } from './exceptions';

/**
 * 属性类，用于表示标注对象的属性
 * 属性包括名称、类型、默认值、可变性和可能的值列表
 */
export class Attribute {
    /** 属性ID，可选 */
    public id?: number;
    /** 属性的默认值 */
    public defaultValue: string;
    /** 属性的输入类型（如文本、数字、选择等） */
    public inputType: AttrInputType;
    /** 属性是否可变 */
    public mutable: boolean;
    /** 属性名称 */
    public name: string;
    /** 属性的可能值列表（用于选择类型） */
    public values: string[];

    /**
     * 创建一个属性实例
     * @param initialData 从服务器获取的序列化属性数据
     */
    constructor(initialData: SerializedAttribute) {
        // 创建内部数据对象，使用下划线命名以避免与属性名冲突
        const data = {
            id: undefined,
            default_value: undefined,
            input_type: undefined,
            mutable: undefined,
            name: undefined,
            values: undefined,
        };

        // 遍历初始数据，将值复制到内部数据对象
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                if (Object.prototype.hasOwnProperty.call(initialData, key)) {
                    // 如果是数组，创建副本以避免引用问题
                    if (Array.isArray(initialData[key])) {
                        data[key] = [...initialData[key]];
                    } else {
                        data[key] = initialData[key];
                    }
                }
            }
        }

        // 验证属性类型是否有效
        if (!Object.values(AttributeType).includes(data.input_type)) {
            throw new ArgumentError(`Got invalid attribute type ${data.input_type}`);
        }

        // 使用Object.defineProperties定义只读属性
        // 这种方式确保了数据的封装性和不可变性
        Object.defineProperties(
            this,
            Object.freeze({
                id: {
                    /** 获取属性ID */
                    get: () => data.id,
                },
                defaultValue: {
                    /** 获取属性默认值 */
                    get: () => data.default_value,
                },
                inputType: {
                    /** 获取属性输入类型 */
                    get: () => data.input_type,
                },
                mutable: {
                    /** 获取属性是否可变 */
                    get: () => data.mutable,
                },
                name: {
                    /** 获取属性名称 */
                    get: () => data.name,
                },
                values: {
                    /** 获取属性的可能值列表（返回副本以避免外部修改） */
                    get: () => [...data.values],
                },
            }),
        );
    }

    /**
     * 将属性对象序列化为服务器兼容格式
     * @returns 返回序列化后的属性数据
     */
    toJSON(): SerializedAttribute {
        // 创建序列化对象，使用下划线命名以匹配服务器格式
        const object: SerializedAttribute = {
            name: this.name,
            mutable: this.mutable,
            input_type: this.inputType,
            default_value: this.defaultValue,
            values: this.values,
        };

        // 如果ID存在，则添加到序列化对象中
        if (typeof this.id !== 'undefined') {
            object.id = this.id;
        }

        return object;
    }
}

/**
 * 标签类，用于表示标注对象的标签
 * 标签包含名称、颜色、属性、类型等信息，支持骨架结构的子标签
 */
export class Label {
    /** 标签名称 */
    public name: string;
    /** 标签ID，可选 */
    public readonly id?: number;
    /** 标签颜色，可选 */
    public readonly color?: string;
    /** 标签属性列表 */
    public readonly attributes: Attribute[];
    /** 标签类型 */
    public readonly type: LabelType;
    /** 标签结构，用于骨架类型标签 */
    public structure: {
        /** 子标签列表 */
        sublabels: Label[];
        /** SVG结构定义 */
        svg: string;
    } | null;
    /** 标签是否已删除 */
    public deleted: boolean;
    /** 标签是否已修改（用于同步到服务器） */
    public patched: boolean;
    /** 标签是否有父标签（用于骨架结构的子标签） */
    public readonly hasParent?: boolean;

    /**
     * 创建一个标签实例
     * @param initialData 从服务器获取的序列化标签数据
     */
    constructor(initialData: Readonly<SerializedLabel>) {
        // 创建内部数据对象，使用下划线命名以避免与属性名冲突
        const data = {
            id: undefined,
            name: undefined,
            color: undefined,
            type: undefined,
            structure: undefined,
            has_parent: false,
            deleted: false,
            patched: false,
            svg: undefined,
            elements: undefined,
            sublabels: undefined,
            attributes: [],
        };

        // 遍历初始数据，将值复制到内部数据对象
        for (const key of Object.keys(data)) {
            if (Object.prototype.hasOwnProperty.call(initialData, key)) {
                data[key] = initialData[key];
            }
        }

        // 初始化属性列表为空数组
        data.attributes = [];

        // 如果初始数据中包含属性，则创建Attribute实例
        if (
            Object.prototype.hasOwnProperty.call(initialData, 'attributes') &&
            Array.isArray(initialData.attributes)
        ) {
            for (const attrData of initialData.attributes) {
                data.attributes.push(new Attribute(attrData));
            }
        }

        // 如果是骨架类型标签，处理子标签
        if (data.type === 'skeleton') {
            // 为每个子标签创建Label实例，并标记为有父标签
            data.sublabels = data.sublabels.map((internalLabel) => new Label({ ...internalLabel, has_parent: true }));
        }

        // 使用Object.defineProperties定义属性
        // 这种方式确保了数据的封装性和可控的访问性
        Object.defineProperties(
            this,
            Object.freeze({
                id: {
                    /** 获取标签ID */
                    get: () => data.id,
                },
                name: {
                    /** 获取标签名称 */
                    get: () => data.name,
                    /** 设置标签名称 */
                    set: (name) => {
                        // 验证名称是否为字符串
                        if (typeof name !== 'string') {
                            throw new ArgumentError(`Name must be a string, but ${typeof name} was given`);
                        }
                        data.name = name;
                        // 如果标签已存在（有ID），则标记为已修改
                        if (Number.isInteger(data.id)) {
                            data.patched = true;
                        }
                    },
                },
                color: {
                    /** 获取标签颜色 */
                    get: () => data.color,
                    /** 设置标签颜色 */
                    set: (color) => {
                        // 验证颜色格式是否为有效的十六进制颜色值或空字符串
                        if (typeof color === 'string' && color.match(/^#[0-9a-f]{6}$|^$/)) {
                            data.color = color;
                            // 如果标签已存在（有ID），则标记为已修改
                            if (Number.isInteger(data.id)) {
                                data.patched = true;
                            }
                        } else {
                            throw new ArgumentError('Trying to set wrong color format');
                        }
                    },
                },
                attributes: {
                    /** 获取标签属性列表（返回副本以避免外部修改） */
                    get: () => [...data.attributes],
                },
                type: {
                    /** 获取标签类型 */
                    get: () => data.type,
                },
                structure: {
                    /** 获取标签结构（仅骨架类型有值） */
                    get: () => {
                        // 如果是骨架类型，返回包含SVG和子标签的结构
                        if (data.type === ShapeType.SKELETON) {
                            return {
                                svg: data.svg,
                                sublabels: [...data.sublabels],
                            };
                        }

                        // 非骨架类型返回null
                        return null;
                    },
                },
                deleted: {
                    /** 获取标签是否已删除 */
                    get: () => data.deleted,
                    /** 设置标签是否已删除 */
                    set: (value) => {
                        data.deleted = value;
                    },
                },
                patched: {
                    /** 获取标签是否已修改 */
                    get: () => data.patched,
                    /** 设置标签是否已修改 */
                    set: (value) => {
                        data.patched = value;
                    },
                },
                hasParent: {
                    /** 获取标签是否有父标签 */
                    get: () => data.has_parent,
                },
            }),
        );
    }

    /**
     * 将标签对象序列化为服务器兼容格式
     * @returns 返回序列化后的标签数据
     */
    toJSON(): SerializedLabel {
        // 创建序列化对象，包含基本属性
        const object: SerializedLabel = {
            name: this.name,
            // 将每个属性序列化
            attributes: [...this.attributes.map((el) => el.toJSON())],
            type: this.type,
        };

        // 如果颜色存在，则添加到序列化对象中
        if (typeof this.color !== 'undefined') {
            object.color = this.color;
        }

        // 如果ID存在，则添加到序列化对象中
        if (typeof this.id !== 'undefined') {
            object.id = this.id;
        }

        // 如果类型存在，则添加到序列化对象中
        if (this.type) {
            object.type = this.type;
        }

        // 处理结构化数据（骨架类型）
        const { structure } = this;
        if (structure) {
            // 添加SVG定义
            object.svg = structure.svg;
            // 序列化所有子标签
            object.sublabels = structure.sublabels.map((internalLabel) => internalLabel.toJSON());
        }

        return object;
    }
}