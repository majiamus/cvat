// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import {
    Canvas,
    CanvasMode,
    RectDrawingMethod,
    CuboidDrawingMethod,
    CanvasHint as _CanvasHint,
    InteractionData as _InteractionData,
    InteractionResult as _InteractionResult,
    HighlightSeverity as _HighlightSeverity,
} from 'cvat-canvas/src/typescript/canvas';

/**
 * 转换图形数据为交互器所需的格式
 * 将交互结果数组转换为二维坐标点数组，用于交互器处理
 * @param shapes - 交互结果数组，包含图形类型、鼠标按钮和坐标点信息
 * @param type - 要过滤的图形类型：'points'（点）或'rectangle'（矩形）
 * @param button - 要过滤的鼠标按钮编号（0=左键，1=中键，2=右键等）
 * @returns 二维坐标点数组，每个元素是[x, y]格式的坐标对
 */
export function convertShapesForInteractor(shapes: InteractionResult[], type: 'points' | 'rectangle', button: number): number[][] {
    /**
     * 数组归约函数，将一维坐标数组转换为二维坐标点数组
     * 将[x1, y1, x2, y2, ...]格式转换为[[x1, y1], [x2, y2], ...]格式
     * @param acc - 累积器，存储转换后的二维坐标点数组
     * @param _ - 当前元素值（未使用）
     * @param index - 当前元素索引
     * @param array - 原始一维坐标数组
     * @returns 累积器，包含所有转换后的二维坐标点
     */
    const reducer = (acc: number[][], _: number, index: number, array: number[]): number[][] => {
        // 只处理偶数索引（0, 2, 4, ...），每个偶数索引与下一个奇数索引组成一个坐标对
        if (!(index % 2)) {
            // 将当前偶数索引元素和下一个奇数索引元素组成坐标对[x, y]
            acc.push([array[index], array[index + 1]]);
        }
        return acc;
    };

    // 处理流程：
    // 1. 过滤出匹配指定鼠标按钮和图形类型的交互结果
    // 2. 提取每个交互结果的坐标点数组
    // 3. 将所有坐标点数组合并为一个一维数组
    // 4. 使用归约函数将一维坐标数组转换为二维坐标点数组
    return shapes
        .filter((shape: InteractionResult): boolean => shape.button === button && shape.shapeType === type)
        .map((shape: InteractionResult): number[] => shape.points)
        .flat()
        .reduce(reducer, []);
}

export type InteractionData = _InteractionData;
export type InteractionResult = _InteractionResult;
export type HighlightSeverity = _HighlightSeverity;
export type CanvasHint = _CanvasHint;

export {
    Canvas, CanvasMode, RectDrawingMethod, CuboidDrawingMethod,
};
