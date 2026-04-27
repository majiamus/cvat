// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Popover from 'antd/lib/popover';
import Icon from '@ant-design/icons';

import { Canvas } from 'cvat-canvas-wrapper';
import { RectangleIcon } from 'icons';
import { ShapeType } from 'cvat-core-wrapper';

import DrawShapePopoverContainer from 'containers/annotation-page/standard-workspace/controls-side-bar/draw-shape-popover';
import withVisibilityHandling from './handle-popover-visibility';

/**
 * 矩形绘制控制组件的属性接口
 */
export interface Props {
    /** 画布实例，用于控制绘制操作 */
    canvasInstance: Canvas;
    /** 当前是否正在绘制矩形 */
    isDrawing: boolean;
    /** 是否禁用控件，可选参数 */
    disabled?: boolean;
}

// 创建带有可见性处理的自定义弹出框组件
const CustomPopover = withVisibilityHandling(Popover, 'draw-rectangle');

/**
 * 矩形绘制控制组件
 * 提供用户界面控件用于在画布上绘制矩形标注
 * 根据当前状态显示不同的UI：禁用状态、绘制中状态或正常状态
 * 
 * @param {Props} props - 组件属性
 * @returns {JSX.Element} 矩形绘制控制组件的JSX元素
 */
function DrawRectangleControl(props: Props): JSX.Element {
    // 解构获取组件属性
    const { canvasInstance, isDrawing, disabled } = props;
    
    // 根据是否正在绘制动态设置弹出框属性
    // 绘制时隐藏弹出框，避免干扰绘制操作
    const dynamicPopoverProps = isDrawing ? {
        overlayStyle: {
            display: 'none',
        },
    } : {};

    // 根据是否正在绘制动态设置图标属性
    // 绘制时添加激活样式并设置点击事件为停止绘制
    const dynamicIconProps = isDrawing ? {
        className: 'cvat-draw-rectangle-control cvat-active-canvas-control',
        onClick: (): void => {
            // 停止绘制模式
            canvasInstance.draw({ enabled: false });
        },
    } : {
        className: 'cvat-draw-rectangle-control',
    };

    // 根据禁用状态渲染不同UI
    return disabled ? (
        // 禁用状态：显示灰色图标，无交互功能
        <Icon className='cvat-draw-rectangle-control cvat-disabled-canvas-control' component={RectangleIcon} />
    ) : (
        // 正常状态：显示可点击的图标，带有弹出框
        <CustomPopover
            {...dynamicPopoverProps}
            overlayClassName='cvat-draw-shape-popover'
            placement='right'
            // 弹出框内容为绘制形状配置容器
            content={<DrawShapePopoverContainer shapeType={ShapeType.RECTANGLE} />}
        >
            <Icon {...dynamicIconProps} component={RectangleIcon} />
        </CustomPopover>
    );
}

export default React.memo(DrawRectangleControl);
