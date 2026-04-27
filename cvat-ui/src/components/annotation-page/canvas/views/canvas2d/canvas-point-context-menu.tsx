// Copyright (C) 2020-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/**
 * Canvas点右键菜单组件
 * 
 * 该组件提供多边形、折线和点集标注中控制点的右键菜单功能，包括：
 * - 删除控制点（适用于多边形、折线、点集）
 * - 设置起点（仅适用于多边形）
 * 
 * 组件通过React Portal渲染到body元素，确保菜单显示在最上层
 * 使用Redux连接管理状态，支持撤销/重做操作
 */

import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import Button from 'antd/lib/button';
import { DeleteOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { connect } from 'react-redux';

import { CombinedState, ContextMenuType } from 'reducers';
import { updateAnnotationsAsync, updateCanvasContextMenu } from 'actions/annotation-actions';
import CVATTooltip from 'components/common/cvat-tooltip';
import { ShapeType } from 'cvat-core-wrapper';

/**
 * 组件状态属性接口
 * 从Redux store映射到组件的属性
 */
interface StateToProps {
    /** 当前激活的标注状态对象 */
    activatedState: any | null;
    /** 选中的控制点索引（从0开始） */
    selectedPoint: number | null;
    /** 菜单是否可见 */
    visible: boolean;
    /** 菜单位置的top坐标 */
    top: number;
    /** 菜单位置的left坐标 */
    left: number;
    /** 菜单类型 */
    type: ContextMenuType;
}

/**
 * 将Redux状态映射到组件属性
 * @param state - 应用的全局状态
 * @returns 组件需要的状态属性
 */
function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            annotations: { states, activatedStateID },
            canvas: {
                contextMenu: {
                    visible, top, left, type, pointID: selectedPoint,
                },
            },
        },
    } = state;

    return {
        activatedState:
            activatedStateID === null ?
                null :
                // 从所有标注状态中筛选出当前激活的标注
                states.filter((_state) => _state.clientID === activatedStateID)[0] || null,
        selectedPoint,
        visible,
        left,
        top,
        type,
    };
}

/**
 * 组件派发属性接口
 * 组件可以派发的Redux action
 */
interface DispatchToProps {
    /** 更新标注状态 */
    onUpdateAnnotations(states: any[]): void;
    /** 关闭上下文菜单 */
    onCloseContextMenu(): void;
}

/**
 * 将派发函数映射到组件属性
 * @param dispatch - Redux的dispatch函数
 * @returns 组件可以使用的派发函数
 */
function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onUpdateAnnotations(states: any[]): void {
            // 异步更新标注状态，支持撤销/重做
            dispatch(updateAnnotationsAsync(states));
        },
        onCloseContextMenu(): void {
            // 隐藏上下文菜单并重置位置
            dispatch(updateCanvasContextMenu(false, 0, 0));
        },
    };
}

type Props = StateToProps & DispatchToProps;

/**
 * Canvas点右键菜单组件
 * 
 * @param props - 组件属性
 * @returns React Portal或null
 */
function CanvasPointContextMenu(props: Props): React.ReactPortal | null {
    const {
        onCloseContextMenu, onUpdateAnnotations, activatedState, visible, type, top, left,
    } = props;

    // 跟踪当前菜单对应的激活状态，用于处理状态变化时的清理
    const [contextMenuFor, setContextMenuFor] = useState(activatedState);

    // 当激活状态变化时，更新本地状态
    // 如果当前显示的是点菜单，则关闭菜单以避免状态不一致
    if (activatedState !== contextMenuFor) {
        setContextMenuFor(activatedState);
        if (visible && type === ContextMenuType.CANVAS_SHAPE_POINT) {
            onCloseContextMenu();
        }
    }

    /**
     * 删除控制点的处理函数
     * 从点数组中移除选中的控制点，保持坐标对的完整性
     */
    const onPointDelete = (): void => {
        const { selectedPoint } = props;
        if (contextMenuFor && selectedPoint !== null) {
            // 从点数组中移除选中的控制点
            // 每个点由x,y两个坐标组成，所以索引需要乘以2
            contextMenuFor.points = contextMenuFor.points
                .slice(0, selectedPoint * 2)  // 选中点之前的所有坐标
                .concat(contextMenuFor.points.slice(selectedPoint * 2 + 2)); // 选中点之后的所有坐标
            
            // 更新标注状态并关闭菜单
            onUpdateAnnotations([contextMenuFor]);
            onCloseContextMenu();
        }
    };

    /**
     * 设置起点的处理函数
     * 仅适用于多边形，将选中的控制点设置为多边形的起始点
     * 通过重新排列点数组实现，保持多边形的几何形状不变
     */
    const onSetStartPoint = (): void => {
        const { selectedPoint } = props;
        if (contextMenuFor && selectedPoint !== null && contextMenuFor.shapeType === 'polygon') {
            // 重新排列点数组，将选中点作为起点
            // 先取选中点及其后的所有坐标，再拼接选中点前的所有坐标
            contextMenuFor.points = contextMenuFor.points
                .slice(selectedPoint * 2)  // 选中点及之后的所有坐标
                .concat(contextMenuFor.points.slice(0, selectedPoint * 2)); // 选中点之前的所有坐标
            
            // 更新标注状态并关闭菜单
            onUpdateAnnotations([contextMenuFor]);
            onCloseContextMenu();
        }
    };

    /**
     * 渲染点右键菜单
     * 条件：菜单可见、有激活状态、菜单类型为点菜单
     * 使用React Portal渲染到body元素，确保显示在最上层
     */
    return visible && contextMenuFor && type === ContextMenuType.CANVAS_SHAPE_POINT ?
        ReactDOM.createPortal(
            <div className='cvat-canvas-point-context-menu' style={{ top, left }}>
                {/* 删除点按钮：根据形状类型和最小点数要求显示 */}
                {contextMenuFor && (
                    // 多边形：至少需要3个点（6个坐标）
                    (contextMenuFor.shapeType === ShapeType.POLYGON && contextMenuFor.points.length > 6) ||
                    // 折线：至少需要2个点（4个坐标）
                    (contextMenuFor.shapeType === ShapeType.POLYLINE && contextMenuFor.points.length > 4) ||
                    // 点集：至少需要2个点（2个坐标）
                    (contextMenuFor.shapeType === ShapeType.POINTS && contextMenuFor.points.length > 2)) &&
                (
                    <CVATTooltip title='Delete point [Alt + dblclick]'>
                        <Button
                            type='link'
                            icon={<DeleteOutlined />}
                            onClick={onPointDelete}
                            className='cvat-canvas-point-context-menu-delete'
                        >
                            Delete point
                        </Button>
                    </CVATTooltip>
                )}

                {/* 设置起点按钮：仅适用于多边形 */}
                {contextMenuFor && contextMenuFor.shapeType === 'polygon' && (
                    <Button
                        type='link'
                        icon={<EnvironmentOutlined />}
                        onClick={onSetStartPoint}
                        className='cvat-canvas-point-context-menu-set-start'
                    >
                        Set start point
                    </Button>
                )}
            </div>,
            window.document.body,
        ) :
        null;
}

/**
 * 连接Redux的Canvas点右键菜单组件
 * 使用connect高阶组件将Redux状态和派发函数映射到组件属性
 */
export default connect(mapStateToProps, mapDispatchToProps)(CanvasPointContextMenu);
