// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { SerializedAnnotationConflictData, SerializedQualityConflictData } from './server-response-types';
import { ObjectType } from './enums';

/**
 * 质量冲突类型枚举
 * 定义了标注质量检查中可能发现的不同类型冲突
 */
export enum QualityConflictType {
    /** 额外标注 - 存在不应出现的标注对象 */
    EXTRA = 'extra_annotation',
    /** 标签不匹配 - 标注对象的标签与预期不符 */
    MISMATCHING = 'mismatching_label',
    /** 缺失标注 - 缺少应有的标注对象 */
    MISSING = 'missing_annotation',
}

/**
 * 冲突严重程度枚举
 * 定义了质量冲突的严重级别，用于区分错误和警告
 */
export enum ConflictSeverity {
    /** 错误级别 - 严重问题，需要修复 */
    ERROR = 'error',
    /** 警告级别 - 次要问题，建议检查 */
    WARNING = 'warning',
}

/**
 * 标注冲突类
 * 表示单个标注对象的质量冲突信息，包含标注的基本属性和冲突详情
 */
export class AnnotationConflict {
    /** 关联的作业ID */
    #jobID: number;
    /** 标注对象在服务器上的唯一ID */
    #serverID: number;
    /** 标注对象的类型（如矩形、多边形等） */
    #type: ObjectType;
    /** 标注形状的具体类型，可能为null */
    #shapeType: string | null;
    /** 冲突类型，引用QualityConflictType枚举 */
    #conflictType: QualityConflictType;
    /** 冲突严重程度，引用ConflictSeverity枚举 */
    #severity: ConflictSeverity;
    /** 冲突描述信息，由冲突类型自动生成 */
    #description: string;

    /**
     * 创建标注冲突实例
     * @param initialData - 从服务器获取的序列化标注冲突数据
     */
    constructor(initialData: SerializedAnnotationConflictData) {
        // 初始化基本属性
        this.#jobID = initialData.job_id;
        this.#serverID = initialData.obj_id;
        this.#type = initialData.type;
        this.#shapeType = initialData.shape_type;
        this.#conflictType = initialData.conflict_type as QualityConflictType;
        this.#severity = initialData.severity as ConflictSeverity;

        // 根据冲突类型生成描述文本：将下划线替换为空格并首字母大写
        const desc = this.#conflictType.split('_').join(' ');
        this.#description = desc.charAt(0).toUpperCase() + desc.slice(1);
    }

    /** 获取关联的作业ID */
    get jobID(): number {
        return this.#jobID;
    }

    /** 获取标注对象在服务器上的唯一ID */
    get serverID(): number {
        return this.#serverID;
    }

    /** 获取标注对象的类型 */
    get type(): ObjectType {
        return this.#type;
    }

    /** 获取标注形状的具体类型 */
    get shapeType(): string | null {
        return this.#shapeType;
    }

    /** 获取冲突类型 */
    get conflictType(): QualityConflictType {
        return this.#conflictType;
    }

    /** 获取冲突严重程度 */
    get severity(): ConflictSeverity {
        return this.#severity;
    }

    /** 获取冲突描述 */
    get description(): string {
        return this.#description;
    }
}

/**
 * 质量冲突类
 * 用于表示标注质量检查中发现的冲突问题，包含冲突的基本信息和相关标注冲突详情
 */
export default class QualityConflict {
    /** 冲突的唯一标识符 */
    #id: number;
    /** 冲突所在帧的编号 */
    #frame: number;
    /** 冲突类型，表示质量检查中发现的具体问题类型 */
    #type: QualityConflictType;
    /** 与此冲突相关的标注冲突列表 */
    #annotationConflicts: AnnotationConflict[];
    /** 冲突严重程度，用于区分错误和警告级别 */
    #severity: ConflictSeverity;
    /** 冲突的描述信息，由类型自动生成并支持自定义修改 */
    #description: string;

    /**
     * 创建质量冲突实例
     * @param initialData - 从服务器获取的序列化冲突数据
     */
    constructor(initialData: SerializedQualityConflictData) {
        // 初始化基本属性
        this.#id = initialData.id;
        this.#frame = initialData.frame;
        this.#type = initialData.type as QualityConflictType;
        this.#severity = initialData.severity as ConflictSeverity;
        
        // 创建标注冲突对象列表
        this.#annotationConflicts = initialData.annotation_ids
            .map((rawData: SerializedAnnotationConflictData) => new AnnotationConflict({
                ...rawData,
                conflict_type: initialData.type,
                severity: initialData.severity,
            }));

        // 根据冲突类型生成描述文本：将下划线替换为空格并首字母大写
        const desc = initialData.type.split('_').join(' ');
        this.#description = desc.charAt(0).toUpperCase() + desc.slice(1);
    }

    /** 获取冲突ID */
    get id(): number {
        return this.#id;
    }

    /** 获取冲突所在帧 */
    get frame(): number {
        return this.#frame;
    }

    /** 获取冲突类型 */
    get type(): QualityConflictType {
        return this.#type;
    }

    /** 获取标注冲突列表 */
    get annotationConflicts(): AnnotationConflict[] {
        return this.#annotationConflicts;
    }

    /** 获取冲突严重程度 */
    get severity(): ConflictSeverity {
        return this.#severity;
    }

    /** 获取冲突描述 */
    get description(): string {
        return this.#description;
    }

    /**
     * 设置冲突描述
     * @param newDescription - 新的描述文本
     */
    set description(newDescription: string) {
        this.#description = newDescription;
    }
}
