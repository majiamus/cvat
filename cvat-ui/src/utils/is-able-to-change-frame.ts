// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { getCVATStore } from 'cvat-store';
import { CombinedState } from 'reducers';

/**
 * 检查是否可以切换到指定帧
 * 综合考虑画布状态、作业范围和导航阻塞状态
 * 
 * @param frame - 目标帧号（可选），如果提供则检查该帧是否在作业范围内
 * @returns 如果可以切换到该帧返回true，否则返回false
 * 
 * @private
 */
export default function isAbleToChangeFrame(frame?: number): boolean {
    // 获取Redux store实例以访问应用状态
    const store = getCVATStore();

    // 从store中获取当前应用状态
    const state: CombinedState = store.getState();
    
    // 解构获取作业元数据、作业实例和画布实例
    const { meta, instance: job } = state.annotation.job;
    const { instance: canvas } = state.annotation.canvas;

    // 检查必要组件是否可用：元数据、画布实例和作业实例必须存在
    if (meta === null || canvas === null || !job) {
        return false;
    }

    // 初始化帧范围检查标志，默认可用
    let frameInTheJob = true;
    
    // 如果指定了帧号，进行帧范围检查
    if (typeof frame === 'number') {
        // 检查帧是否包含在作业的包含帧列表中（如果存在该列表）
        if (meta.includedFrames) {
            // 注意：frame参数使用作业坐标系
            // 但includedFrames包含绝对数据值，需要转换
            frameInTheJob = meta.includedFrames.includes(meta.getDataFrameNumber(frame - job.startFrame));
        }

        // 检查帧号是否在作业的有效范围内（startFrame到stopFrame）
        frameInTheJob = frame >= job.startFrame && frame <= job.stopFrame;
    }

    // 综合判断：画布允许切换 && 帧在有效范围内 && 导航未被阻塞
    return canvas.isAbleToChangeFrame() && frameInTheJob && !state.annotation.player.navigationBlocked;
}
