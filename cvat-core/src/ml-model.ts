// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import PluginRegistry from './plugins';
import {
    LabelType, ModelProviders, ModelKind, ShapeType,
} from './enums';
import {
    SerializedModel, ModelParams, MLModelTip, MLModelLabel,
} from './core-types';

/**
 * 机器学习模型类
 * 用于表示和管理机器学习模型，提供模型信息的访问和操作接口
 */
export default class MLModel {
    private serialized: SerializedModel;

    /**
     * 构造函数
     * @param serialized - 序列化的模型数据
     */
    constructor(serialized: SerializedModel) {
        // 创建序列化数据的副本，避免直接修改原始数据
        this.serialized = { ...serialized };
    }

    /**
     * 获取模型ID
     * @returns 模型的唯一标识符
     */
    public get id(): string | number {
        return this.serialized.id;
    }

    /**
     * 获取模型名称
     * @returns 模型的名称
     */
    public get name(): string {
        return this.serialized.name;
    }

    /**
     * 获取模型标签列表
     * @returns 模型支持的标签数组，如果labels_v2不存在则返回空数组
     */
    public get labels(): MLModelLabel[] {
        return Array.isArray(this.serialized.labels_v2) ? [...this.serialized.labels_v2] : [];
    }

    /**
     * 获取支持的形状类型
     * @returns 模型支持的形状类型数组，如果没有定义则返回undefined
     */
    public get supportedShapeTypes(): ShapeType[] | undefined {
        return this.serialized.supported_shape_types;
    }

    /**
     * 获取模型版本
     * @returns 模型的版本号
     */
    public get version(): number {
        return this.serialized.version;
    }

    /**
     * 获取模型描述
     * @returns 模型的描述信息
     */
    public get description(): string {
        return this.serialized.description;
    }

    /**
     * 获取模型类型
     * @returns 模型的类型（检测器、分类器等）
     */
    public get kind(): ModelKind {
        return this.serialized.kind;
    }

    /**
     * 获取显示类型
     * 根据模型类型和返回类型提供更友好的显示名称
     * @returns 用于显示的类型名称
     */
    public get displayKind(): string {
        if (this.kind === ModelKind.DETECTOR) {
            switch (this.returnType) {
                case LabelType.TAG: return 'classifier';  // 分类器
                case LabelType.MASK: return 'segmenter';  // 分割器
                default: // 回退到原始类型
            }
        }
        return this.kind;
    }

    /**
     * 获取模型参数
     * @returns 模型的参数配置对象
     */
    public get params(): ModelParams {
        const result: ModelParams = {
            canvas: {
                minPosVertices: this.serialized.min_pos_points,      // 最小正样本顶点数
                minNegVertices: this.serialized.min_neg_points,      // 最小负样本顶点数
                startWithBox: this.serialized.startswith_box,        // 是否从框开始
                startWithBoxOptional: this.serialized.startswith_box_optional,  // 是否可选从框开始
            },
        };

        return result;
    }

    /**
     * 获取模型提示信息
     * @returns 包含提示消息和GIF动画的对象
     */
    public get tip(): MLModelTip {
        return {
            message: this.serialized.help_message,  // 帮助消息
            gif: this.serialized.animated_gif,      // 动画GIF
        };
    }

    /**
     * 获取模型所有者
     * @returns 模型所有者的用户名，如果没有则返回空字符串
     */
    public get owner(): string {
        return this.serialized?.owner?.username || '';
    }

    /**
     * 获取模型提供者
     * @returns 模型的提供者，如果没有则返回默认的CVAT提供者
     */
    public get provider(): string {
        return this.serialized?.provider || ModelProviders.CVAT;
    }

    /**
     * 判断模型是否可删除
     * @returns 如果提供者不是CVAT则返回true（可删除），否则返回false
     */
    public get isDeletable(): boolean {
        return this.provider !== ModelProviders.CVAT;
    }

    /**
     * 获取创建日期
     * @returns 模型的创建日期，如果没有则返回undefined
     */
    public get createdDate(): string | undefined {
        return this.serialized?.created_date;
    }

    /**
     * 获取更新日期
     * @returns 模型的更新日期，如果没有则返回undefined
     */
    public get updatedDate(): string | undefined {
        return this.serialized?.updated_date;
    }

    /**
     * 获取模型URL
     * @returns 模型的URL地址，如果没有则返回undefined
     */
    public get url(): string | undefined {
        return this.serialized?.url;
    }

    /**
     * 获取返回类型
     * 分析模型标签的类型，如果所有标签类型一致则返回该类型，否则返回ANY
     * @returns 模型的标签类型
     */
    public get returnType(): LabelType {
        // 获取所有标签类型的唯一值
        const uniqueLabelTypes = new Set(this.labels.map((label) => label.type));

        // 如果标签类型不统一，返回ANY类型
        if (uniqueLabelTypes.size !== 1) return LabelType.ANY;

        // 返回唯一的标签类型
        const [labelType] = uniqueLabelTypes;
        return labelType;
    }

    /**
     * 获取模型预览
     * @returns 预览结果的Promise
     */
    public async preview(): Promise<string> {
        // 通过插件注册表调用预览实现
        const result = await PluginRegistry.apiWrapper.call(this, MLModel.prototype.preview);
        return result;
    }
}

/**
 * 定义preview方法的实现属性
 * 设置preview方法的默认实现，返回null表示没有预览
 */
Object.defineProperties(MLModel.prototype.preview, {
    implementation: {
        writable: false,      // 不可写
        enumerable: false,      // 不可枚举
        value: async function implementation(): Promise<string | null> {
            return null;  // 默认返回null，表示没有预览
        },
    },
});
