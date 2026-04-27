// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { Source, ShapeType, ObjectType } from './enums';
import PluginRegistry from './plugins';
import { ArgumentError } from './exceptions';
import { Label } from './labels';
import { isEnum } from './common';
import { SerializedShape, SerializedTag, SerializedTrack } from './server-response-types';

/**
 * 对象状态更新标志接口
 * 用于跟踪标注对象各个属性是否自初始化以来被修改过
 * 这些标志在对象状态管理和同步过程中起到关键作用
 */
interface UpdateFlags {
    /** 标签是否已更新 */
    label: boolean;
    /** 属性是否已更新 */
    attributes: boolean;
    /** 描述是否已更新 */
    description: boolean;
    /** 点坐标是否已更新 */
    points: boolean;
    /** 旋转角度是否已更新 */
    rotation: boolean;
    /** 对象是否在图像边界外 */
    outside: boolean;
    /** 对象是否被遮挡 */
    occluded: boolean;
    /** 是否为关键帧 */
    keyframe: boolean;
    /** Z轴顺序是否已更新 */
    zOrder: boolean;
    /** 对象是否已固定 */
    pinned: boolean;
    /** 对象是否已锁定 */
    lock: boolean;
    /** 颜色是否已更新 */
    color: boolean;
    /** 对象是否已隐藏 */
    hidden: boolean;
    /** 多个描述是否已更新 */
    descriptions: boolean;
    /** 重置所有更新标志的方法 */
    reset: () => void;
}

/**
 * 序列化数据接口
 * 定义了标注对象在序列化时的数据结构
 * 用于对象的持久化存储、网络传输和状态恢复
 */
export interface SerializedData {
    /** 对象类型（形状、标签或轨道） */
    objectType: ObjectType;
    /** 关联的标签对象 */
    label: Label;
    /** 对象所在的帧号 */
    frame: number;

    /** 形状类型（矩形、多边形等） */
    shapeType?: ShapeType;
    /** 客户端分配的唯一ID */
    clientID?: number;
    /** 服务器分配的唯一ID */
    serverID?: number;
    /** 父对象的ID（用于嵌套对象） */
    parentID?: number;
    /** 对象是否被锁定（禁止编辑） */
    lock?: boolean;
    /** 对象是否隐藏 */
    hidden?: boolean;
    /** 对象是否固定（显示在顶层） */
    pinned?: boolean;
    /** 对象属性集合（属性ID到值的映射） */
    attributes?: Record<number, string>;
    /** 对象所属组的信息 */
    group?: { color: string; id: number; };
    /** 对象显示颜色 */
    color?: string;
    /** 最后更新时间戳 */
    updated?: number;
    /** 对象来源（手动、自动等） */
    source?: Source;
    /** Z轴顺序（控制对象重叠时的显示顺序） */
    zOrder?: number;
    /** 形状点坐标数组 */
    points?: number[];
    /** 对象是否被遮挡 */
    occluded?: boolean;
    /** 对象是否在图像边界外 */
    outside?: boolean;
    /** 是否为关键帧（用于跟踪对象） */
    keyframe?: boolean;
    /** 对象旋转角度（度数） */
    rotation?: number;
    /** 对象描述文本数组 */
    descriptions?: string[];
    /** 关键帧信息（用于跟踪对象） */
    keyframes?: {
        /** 前一个关键帧的帧号 */
        prev: number | null;
        /** 下一个关键帧的帧号 */
        next: number | null;
        /** 第一个关键帧的帧号 */
        first: number | null;
        /** 最后一个关键帧的帧号 */
        last: number | null;
    };
    /** 子元素数组（用于组合对象） */
    elements?: SerializedData[];
    /** 内部方法（不用于序列化） */
    __internal?: {
        /** 保存对象状态的方法 */
        save: (objectState: ObjectState) => ObjectState;
        /** 删除对象的方法 */
        delete: (frame: number, force: boolean) => boolean;
    };
}

/**
 * 表示标注对象状态的类，包含对象的所有属性和行为
 * 这是CVAT标注系统中的核心数据结构，用于管理形状、标签、属性等信息
 */
export default class ObjectState {
    /** 内部方法，用于保存和删除对象状态 */
    private readonly __internal: {
        save: (objectState: ObjectState) => ObjectState;
        delete: (frame: number, force: boolean) => boolean;
    };

    /** 更新标志，用于跟踪哪些属性已被修改 */
    public readonly updateFlags: UpdateFlags;
    /** 对象所属的帧号 */
    public readonly frame: number;
    /** 对象类型（形状、轨道或标签） */
    public readonly objectType: ObjectType;
    /** 形状类型（矩形、多边形、点等） */
    public readonly shapeType: ShapeType;
    /** 对象来源（手动、自动、半自动或文件导入） */
    public readonly source: Source;
    /** 客户端ID，用于前端标识 */
    public readonly clientID: number | null;
    /** 服务器端ID，用于后端标识 */
    public readonly serverID: number | null;
    /** 父对象ID，用于层次结构 */
    public readonly parentID: number | null;
    /** 最后更新时间戳 */
    public readonly updated: number;
    /** 分组信息，包含颜色和ID */
    public readonly group: { color: string; id: number; } | null;
    /** 是否为真值标注对象 */
    public readonly isGroundTruth: boolean;
    /** 关键帧信息，用于轨道对象 */
    public readonly keyframes: {
        first: number | null;
        prev: number | null;
        next: number | null;
        last: number | null;
    } | null;
    /** 对象的标签 */
    public label: Label;
    /** 对象的显示颜色 */
    public color: string;
    /** 是否隐藏对象 */
    public hidden: boolean;
    /** 是否固定对象 */
    public pinned: boolean;
    /** 对象的点坐标数组 */
    public points: number[] | null;
    /** 对象的旋转角度 */
    public rotation: number | null;
    /** Z轴顺序，用于控制对象重叠时的显示顺序 */
    public zOrder: number;
    /** 是否在图像边界外 */
    public outside: boolean;
    /** 是否被遮挡 */
    public occluded: boolean;
    /** 是否为关键帧 */
    public keyframe: boolean;
    /** 是否锁定对象 */
    public lock: boolean;
    /** 对象属性，键为属性ID，值为属性值 */
    public attributes: Record<number, string>;
    /** 对象描述文本数组 */
    public descriptions: string[];
    /** 子元素数组，用于骨架等复合对象 */
    public elements: ObjectState[];

    /**
     * 创建ObjectState实例
     * @param serialized 序列化的对象数据，用于初始化对象状态
     * @throws {ArgumentError} 当提供的序列化数据无效时抛出错误
     */
    constructor(serialized: SerializedData) {
        // 验证对象类型是否有效
        if (!isEnum.call(ObjectType, serialized.objectType)) {
            throw new ArgumentError(
                `ObjectState must be provided its objectType, got wrong value ${serialized.objectType}`,
            );
        }

        // 验证标签是否为Label实例
        if (!(serialized.label instanceof Label)) {
            throw new ArgumentError(
                `ObjectState must be provided correct Label, got wrong value ${serialized.label}`,
            );
        }

        // 验证帧号是否为整数
        if (!Number.isInteger(serialized.frame)) {
            throw new ArgumentError(
                `ObjectState must be provided correct frame, got wrong value ${serialized.frame}`,
            );
        }

        // 创建更新标志对象
        const updateFlags: UpdateFlags = {} as UpdateFlags;
        // 显示自对象初始化以来是否有任何属性被更新
        Object.defineProperty(updateFlags, 'reset', {
            value: function reset() {
                // 重置所有更新标志为false
                this.label = false;
                this.attributes = false;
                this.descriptions = false;

                this.points = false;
                this.rotation = false;
                this.outside = false;
                this.occluded = false;
                this.keyframe = false;

                this.zOrder = false;
                this.pinned = false;
                this.lock = false;
                this.color = false;
                this.hidden = false;
                this.descriptions = false;

                return reset;
            },
            writable: false,
            enumerable: false,
        });

        // 初始化数据对象，存储所有属性值
        const data = {
            label: serialized.label,
            attributes: {},
            descriptions: [],
            // 如果有序列化元素，则递归创建ObjectState实例
            elements: Array.isArray(serialized.elements) ?
                serialized.elements.map((element) => new ObjectState(element)) : null,

            points: null,
            rotation: null,
            outside: false,
            occluded: false,
            keyframe: true,

            zOrder: 0,
            lock: serialized.lock || false,
            color: '#000000',
            hidden: false,
            pinned: false,
            source: serialized.source || Source.MANUAL,
            keyframes: serialized.keyframes || null,
            group: serialized.group || null,
            updated: serialized.updated || Date.now(),

            clientID: serialized.clientID || null,
            serverID: serialized.serverID || null,
            parentID: serialized.parentID || null,

            frame: serialized.frame,
            objectType: serialized.objectType,
            shapeType: serialized.shapeType || null,
            updateFlags,
        };

        // 定义对象属性，使用getter和setter控制访问
        Object.defineProperties(
            this,
            Object.freeze({
                // 内部属性，不需要文档化
                updateFlags: {
                    get: () => data.updateFlags,
                },
                frame: {
                    get: () => data.frame,
                },
                objectType: {
                    get: () => data.objectType,
                },
                shapeType: {
                    get: () => data.shapeType,
                },
                source: {
                    get: () => data.source,
                },
                isGroundTruth: {
                    get: () => data.source === Source.GT,
                },
                clientID: {
                    get: () => data.clientID,
                },
                serverID: {
                    get: () => data.serverID,
                },
                parentID: {
                    get: () => data.parentID,
                },
                label: {
                    get: () => data.label,
                    set: (labelInstance) => {
                        // 标记标签属性已更新
                        data.updateFlags.label = true;
                        data.label = labelInstance;
                    },
                },
                color: {
                    get: () => data.color,
                    set: (color) => {
                        // 标记颜色属性已更新
                        data.updateFlags.color = true;
                        data.color = color;
                    },
                },
                hidden: {
                    get: () => {
                        // 对于骨架类型，只有当所有元素都隐藏时才认为隐藏
                        if (data.shapeType === ShapeType.SKELETON) {
                            return data.elements.every((element: ObjectState) => element.hidden);
                        }

                        return data.hidden;
                    },
                    set: (hidden) => {
                        // 对于骨架类型，设置所有元素的隐藏状态
                        if (data.shapeType === ShapeType.SKELETON) {
                            data.elements.forEach((element: ObjectState) => {
                                element.hidden = hidden;
                            });
                        } else {
                            // 标记隐藏属性已更新
                            data.updateFlags.hidden = true;
                            data.hidden = hidden;
                        }
                    },
                },
                points: {
                    get: () => {
                        // 对于骨架类型，返回所有元素点的扁平化数组
                        if (data.shapeType === ShapeType.SKELETON) {
                            return data.elements.map((element) => element.points).flat();
                        }

                        // 如果点数组存在则返回，否则返回空数组
                        if (Array.isArray(data.points)) {
                            return data.points;
                        }

                        return [];
                    },
                    set: (points) => {
                        // 验证点数组格式
                        if (!Array.isArray(points) || points.some((coord) => typeof coord !== 'number')) {
                            throw new ArgumentError(
                                'Points are expected to be an array of numbers ' +
                                    `but got ${
                                        typeof points === 'object' ? points.constructor.name : typeof points
                                    }`,
                            );
                        }

                        // 对于骨架类型，需要将点分配给各个元素
                        if (data.shapeType === ShapeType.SKELETON) {
                            const { points: currentPoints } = this;
                            // 验证点数量是否匹配
                            if (points.length !== currentPoints.length) {
                                throw new ArgumentError(
                                    'Tried to set wrong number of points for a skeleton' +
                                    `(${points.length} vs ${currentPoints.length}})`,
                                );
                            }

                            // 创建点数组的副本并分配给各个元素
                            const copy = points;
                            for (const element of this.elements) {
                                element.points = copy.splice(0, element.points.length);
                            }
                        } else {
                            // 标记点属性已更新
                            data.updateFlags.points = true;
                        }

                        // 保存点数组的副本
                        data.points = points.slice();
                    },
                },
                rotation: {
                    get: () => data.rotation,
                    set: (rotation) => {
                        // 验证旋转角度是否为数字
                        if (typeof rotation === 'number') {
                            // 如果值未变化则直接返回
                            if (rotation === data.rotation) return;
                            // 标记旋转属性已更新
                            data.updateFlags.rotation = true;
                            data.rotation = rotation;
                        } else {
                            throw new ArgumentError(
                                `Rotation is expected to be a number, but got ${
                                    typeof rotation === 'object' ? rotation.constructor.name : typeof rotation
                                }`,
                            );
                        }
                    },
                },
                group: {
                    get: () => data.group,
                },
                zOrder: {
                    get: () => data.zOrder,
                    set: (zOrder) => {
                        // 标记Z轴顺序已更新
                        data.updateFlags.zOrder = true;
                        data.zOrder = zOrder;
                    },
                },
                outside: {
                    get: () => {
                        // 对于骨架类型，只有当所有元素都在边界外时才认为在边界外
                        if (data.shapeType === ShapeType.SKELETON) {
                            return data.elements.every((el) => el.outside);
                        }
                        return data.outside;
                    },
                    set: (outside) => {
                        // 对于骨架类型，设置所有元素的边界外状态
                        if (data.shapeType === ShapeType.SKELETON) {
                            for (const element of this.elements) {
                                element.outside = outside;
                            }
                        } else {
                            data.outside = outside;
                            // 标记边界外属性已更新
                            data.updateFlags.outside = true;
                        }
                    },
                },
                keyframe: {
                    get: () => {
                        // 对于骨架类型，如果骨架本身是关键帧或任何元素是关键帧则认为是关键帧
                        if (data.shapeType === ShapeType.SKELETON) {
                            return data.keyframe || data.elements.some((el) => el.keyframe);
                        }

                        return data.keyframe;
                    },
                    set: (keyframe) => {
                        // 对于骨架类型，设置所有元素的关键帧状态
                        if (data.shapeType === ShapeType.SKELETON) {
                            for (const element of this.elements) {
                                element.keyframe = keyframe;
                            }
                        }

                        // 标记关键帧属性已更新
                        data.updateFlags.keyframe = true;
                        data.keyframe = keyframe;
                    },
                },
                keyframes: {
                    get: () => {
                        // 返回关键帧信息的副本
                        if (typeof data.keyframes === 'object') {
                            return { ...data.keyframes };
                        }

                        return null;
                    },
                },
                occluded: {
                    get: () => {
                        // 对于骨架类型，只有当所有元素都被遮挡时才认为被遮挡
                        if (data.shapeType === ShapeType.SKELETON) {
                            return data.elements.every((el) => el.occluded);
                        }
                        return data.occluded;
                    },
                    set: (occluded) => {
                        // 对于骨架类型，设置所有元素的遮挡状态
                        if (data.shapeType === ShapeType.SKELETON) {
                            for (const element of this.elements) {
                                element.occluded = occluded;
                            }
                        } else {
                            data.occluded = occluded;
                            // 标记遮挡属性已更新
                            data.updateFlags.occluded = true;
                        }
                    },
                },
                lock: {
                    get: () => {
                        // 对于骨架类型，只有当所有元素都被锁定时才认为被锁定
                        if (data.shapeType === ShapeType.SKELETON) {
                            return data.elements.every((el) => el.lock);
                        }
                        return data.lock;
                    },
                    set: (lock) => {
                        // 对于骨架类型，设置所有元素的锁定状态
                        if (data.shapeType === ShapeType.SKELETON) {
                            for (const element of this.elements) {
                                element.lock = lock;
                            }
                        } else {
                            // 标记锁定属性已更新
                            data.updateFlags.lock = true;
                            data.lock = lock;
                        }
                    },
                },
                pinned: {
                    get: () => {
                        // 返回固定状态，如果未定义则返回null
                        if (typeof data.pinned === 'boolean') {
                            return data.pinned;
                        }

                        return null;
                    },
                    set: (pinned) => {
                        // 标记固定属性已更新
                        data.updateFlags.pinned = true;
                        data.pinned = pinned;
                    },
                },
                updated: {
                    get: () => data.updated,
                },
                attributes: {
                    get: () => data.attributes,
                    set: (attributes) => {
                        // 验证属性是否为对象
                        if (typeof attributes !== 'object') {
                            throw new ArgumentError(
                                'Attributes are expected to be an object ' +
                                    `but got ${
                                        typeof attributes === 'object' ?
                                            attributes.constructor.name :
                                            typeof attributes
                                    }`,
                            );
                        }

                        // 更新每个属性并标记更新标志
                        for (const attrID of Object.keys(attributes)) {
                            data.updateFlags.attributes = true;
                            data.attributes[attrID] = attributes[attrID];
                        }
                    },
                },
                descriptions: {
                    get: () => [...data.descriptions],
                    set: (descriptions) => {
                        // 验证描述是否为字符串数组
                        if (
                            !Array.isArray(descriptions) ||
                            descriptions.some((description) => typeof description !== 'string')
                        ) {
                            throw new ArgumentError(
                                `Descriptions are expected to be an array of strings but got ${data.descriptions}`,
                            );
                        }

                        // 标记描述属性已更新
                        data.updateFlags.descriptions = true;
                        // 保存描述数组的副本
                        data.descriptions = [...descriptions];
                    },
                },
                elements: {
                    get: () => {
                        // 返回元素数组的副本
                        if (data.elements) {
                            return [...data.elements];
                        }
                        return [];
                    },
                },
            }),
        );

        // 根据序列化数据设置可选属性
        if ([Source.MANUAL, Source.SEMI_AUTO, Source.AUTO, Source.FILE].includes(serialized.source)) {
            data.source = serialized.source;
        }
        if (typeof serialized.zOrder === 'number') {
            data.zOrder = serialized.zOrder;
        }
        if (typeof serialized.occluded === 'boolean') {
            data.occluded = serialized.occluded;
        }
        if (typeof serialized.outside === 'boolean') {
            data.outside = serialized.outside;
        }
        if (typeof serialized.keyframe === 'boolean') {
            data.keyframe = serialized.keyframe;
        }
        if (typeof serialized.pinned === 'boolean') {
            data.pinned = serialized.pinned;
        }
        if (typeof serialized.hidden === 'boolean') {
            data.hidden = serialized.hidden;
        }
        if (typeof serialized.color === 'string') {
            data.color = serialized.color;
        }
        if (typeof serialized.rotation === 'number') {
            data.rotation = serialized.rotation;
        }
        if (Array.isArray(serialized.points)) {
            data.points = serialized.points;
        }
        if (
            Array.isArray(serialized.descriptions) &&
            serialized.descriptions.every((desc) => typeof desc === 'string')
        ) {
            data.descriptions = serialized.descriptions;
        }
        if (typeof serialized.attributes === 'object') {
            data.attributes = serialized.attributes;
        }

        // 重置所有更新标志
        data.updateFlags.reset();

        // 如果有序列化的内部方法，则复制到当前实例
        /* eslint-disable-next-line no-underscore-dangle */
        if (serialized.__internal) {
            /* eslint-disable-next-line no-underscore-dangle */
            this.__internal = serialized.__internal;
        }
    }

    /**
     * 保存对象状态到服务器
     * @returns 返回保存后的对象状态
     */
    async save(): Promise<ObjectState> {
        const result = await PluginRegistry.apiWrapper.call(this, ObjectState.prototype.save);
        return result;
    }

    /**
     * 删除指定帧的对象状态
     * @param frame 要删除的帧号
     * @param force 是否强制删除，即使对象被锁定
     * @returns 返回删除是否成功
     */
    async delete(frame, force = false): Promise<boolean> {
        const result = await PluginRegistry.apiWrapper.call(this, ObjectState.prototype.delete, frame, force);
        return result;
    }

    /**
     * 导出对象状态为序列化格式
     * @returns 返回序列化后的对象数据
     */
    async export(): Promise<SerializedShape | SerializedTrack | SerializedTag> {
        const result = await PluginRegistry.apiWrapper.call(this, ObjectState.prototype.export);
        return result;
    }
}

/**
 * 为ObjectState的save方法定义实现属性
 * 该实现通过内部__internal对象调用实际的保存逻辑
 * 如果没有内部实现，则直接返回当前对象
 */
Object.defineProperty(ObjectState.prototype.save, 'implementation', {
    /**
     * 保存对象状态的实际实现函数
     * @returns 返回保存后的对象状态
     */
    value: function saveImplementation(): ObjectState {
        // 检查是否存在内部实现和保存方法
        if (this.__internal && this.__internal.save) {
            // 调用内部保存方法并返回结果
            return this.__internal.save(this);
        }

        // 如果没有内部实现，直接返回当前对象
        return this;
    },
    // 设置属性为不可写，防止外部修改
    writable: false,
});

/**
 * 为ObjectState的export方法定义实现属性
 * 该实现通过内部__internal对象调用实际的导出逻辑
 * 如果没有内部实现，则直接返回当前对象
 */
Object.defineProperty(ObjectState.prototype.export, 'implementation', {
    /**
     * 导出对象状态的实际实现函数
     * @returns 返回导出后的对象状态
     */
    value: function exportImplementation(): ObjectState {
        // 检查是否存在内部实现和导出方法
        if (this.__internal && this.__internal.export) {
            // 调用内部导出方法并返回结果
            return this.__internal.export(this);
        }

        // 如果没有内部实现，直接返回当前对象
        return this;
    },
    // 设置属性为不可写，防止外部修改
    writable: false,
});

/**
 * 为ObjectState的delete方法定义实现属性
 * 该实现通过内部__internal对象调用实际的删除逻辑
 * 如果没有内部实现，则返回false表示删除失败
 */
Object.defineProperty(ObjectState.prototype.delete, 'implementation', {
    /**
     * 删除对象状态的实际实现函数
     * @param frame 要删除的帧号
     * @param force 是否强制删除，即使对象被锁定
     * @returns 返回删除是否成功
     */
    value: function deleteImplementation(frame: number, force: boolean): boolean {
        // 检查是否存在内部实现和删除方法
        if (this.__internal && this.__internal.delete) {
            // 验证帧号参数是否为非负整数
            if (!Number.isInteger(+frame) || +frame < 0) {
                // 如果帧号无效，抛出参数错误
                throw new ArgumentError('Frame argument must be a non negative integer');
            }

            // 调用内部删除方法并返回结果
            return this.__internal.delete(frame, force);
        }

        // 如果没有内部实现，返回false表示删除失败
        return false;
    },
    // 设置属性为不可写，防止外部修改
    writable: false,
});