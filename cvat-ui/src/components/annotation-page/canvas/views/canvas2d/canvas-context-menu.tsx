// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import ReactDOM from 'react-dom';
import Menu from 'antd/lib/menu';
// eslint-disable-next-line import/no-extraneous-dependencies
import { MenuInfo } from 'rc-menu/lib/interface';

import ObjectItemElementComponent from 'components/annotation-page/standard-workspace/objects-side-bar/object-item-element';
import ObjectItemContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/object-item';
import { Workspace } from 'reducers';
import { rotatePoint } from 'utils/math';
import config from 'config';
import {
    AnnotationConflict, ObjectState, ShapeType, QualityConflict,
} from 'cvat-core-wrapper';

/**
 * 画布右键菜单组件的属性接口
 * 定义了CanvasContextMenu组件接收的所有属性
 */
interface Props {
    /** 是否只读模式，控制菜单项的交互状态 */
    readonly: boolean;
    /** 当前工作空间类型（标准/审核） */
    workspace: Workspace;
    /** 父对象的客户端ID，用于处理分组对象 */
    contextMenuParentID: number | null;
    /** 当前右键菜单对象的客户端ID */
    contextMenuClientID: number | null;
    /** 当前帧的所有对象状态数组 */
    objectStates: any[];
    /** 当前帧的质量冲突数组 */
    frameConflicts: QualityConflict[];
    /** 控制右键菜单的显示/隐藏状态 */
    visible: boolean;
    /** 右键菜单的左侧位置坐标 */
    left: number;
    /** 右键菜单的顶部位置坐标 */
    top: number;
    /** 最新的评论列表，用于快速创建问题 */
    latestComments: string[];
    /** 开始创建问题的回调函数，传入位置参数 */
    onStartIssue(position: number[]): void;
    /** 打开问题的回调函数，传入位置和消息 */
    openIssue(position: number[], message: string): void;
    /** 复制对象的回调函数 */
    onCopyObject(objectState: ObjectState): void;
}

/**
 * 审核模式右键菜单组件的属性接口
 * 定义了ReviewContextMenu组件接收的所有属性
 */
interface ReviewContextMenuProps {
    /** 菜单顶部位置坐标 */
    top: number;
    /** 菜单左侧位置坐标 */
    left: number;
    /** 最新评论列表 */
    latestComments: string[];
    /** 可选的质量冲突信息 */
    conflict?: QualityConflict;
    /** 可复制的对象，为null时隐藏复制选项 */
    copyObject: ObjectState | null;
    /** 菜单项点击事件处理函数 */
    onClick: (param: MenuInfo) => void;
}

/**
 * 审核模式右键菜单项的键值枚举
 * 定义了所有可用的菜单项操作类型
 */
enum ReviewContextMenuKeys {
    /** 打开问题对话框 */
    OPEN_ISSUE = 'open_issue',
    /** 快速创建位置问题 */
    QUICK_ISSUE_POSITION = 'quick_issue_position',
    /** 快速创建属性问题 */
    QUICK_ISSUE_ATTRIBUTE = 'quick_issue_attribute',
    /** 从最新评论创建问题 */
    QUICK_ISSUE_FROM_LATEST = 'quick_issue_from_latest',
    /** 从冲突信息创建问题 */
    QUICK_ISSUE_FROM_CONFLICT = 'quick_issue_from_conflict',
    /** 复制对象 */
    COPY_OBJECT = 'copy_object',
}

/**
 * 审核模式右键菜单组件
 * 渲染审核工作空间下的右键菜单项
 * 
 * @param props - 组件属性
 * @returns 审核模式下的右键菜单JSX元素
 */
function ReviewContextMenu({
    top, left, latestComments, conflict, copyObject, onClick,
}: ReviewContextMenuProps): JSX.Element {
    return (
        <Menu onClick={onClick} selectable={false} className='cvat-canvas-context-menu' style={{ top, left }}>
            {/* 打开问题对话框菜单项 */}
            <Menu.Item className='cvat-context-menu-item' key={ReviewContextMenuKeys.OPEN_ISSUE}>
                Open an issue ...
            </Menu.Item>
            
            {/* 显示质量冲突信息，如果存在冲突 */}
            {conflict ? (
                <Menu.Item
                    className='cvat-context-menu-item cvat-quick-issue-from-conflict'
                    key={ReviewContextMenuKeys.QUICK_ISSUE_FROM_CONFLICT}
                >
                    {`Quick issue: ${conflict.description}`}
                </Menu.Item>
            ) : null}
            
            {/* 快速创建位置问题的菜单项 */}
            <Menu.Item className='cvat-context-menu-item' key={ReviewContextMenuKeys.QUICK_ISSUE_POSITION}>
                Quick issue: incorrect position
            </Menu.Item>
            
            {/* 快速创建属性问题的菜单项 */}
            <Menu.Item className='cvat-context-menu-item' key={ReviewContextMenuKeys.QUICK_ISSUE_ATTRIBUTE}>
                Quick issue: incorrect attribute
            </Menu.Item>
            
            {/* 从最新评论创建问题的子菜单，当存在评论时显示 */}
            {latestComments.length ? (
                <Menu.SubMenu
                    title='Quick issue ...'
                    className='cvat-context-menu-item'
                    key={ReviewContextMenuKeys.QUICK_ISSUE_FROM_LATEST}
                >
                    {/* 渲染每个评论作为子菜单项 */}
                    {latestComments.map(
                        (comment: string, id: number): JSX.Element => (
                            <Menu.Item
                                className='cvat-context-menu-item cvat-quick-issue-from-latest-item'
                                key={`${id}`}
                            >
                                {comment}
                            </Menu.Item>
                        ),
                    )}
                </Menu.SubMenu>
            ) : null}
            
            {/* 复制对象菜单项，当存在可复制的对象时显示 */}
            {copyObject ? (
                <Menu.Item
                    className='cvat-context-menu-item cvat-quick-copy-object'
                    key={ReviewContextMenuKeys.COPY_OBJECT}
                >
                    Copy annotation
                </Menu.Item>
            ) : null}
        </Menu>
    );
}

/**
 * 画布右键菜单主组件
 * 根据工作空间类型和上下文条件渲染不同的右键菜单
 * 
 * @param props - 组件属性
 * @returns 右键菜单组件或null（当不满足显示条件时）
 */
export default function CanvasContextMenu(props: Props): JSX.Element | null {
    const {
        contextMenuClientID,
        contextMenuParentID,
        objectStates,
        frameConflicts,
        visible,
        left,
        top,
        readonly,
        workspace,
        latestComments,
        onStartIssue,
        openIssue,
        onCopyObject,
    } = props;

    // 当菜单不可见或没有选中对象时，不渲染任何内容
    if (!visible || contextMenuClientID === null) {
        return null;
    }

    // 查找当前右键菜单对应的对象状态
    let state = objectStates
        .find((_state: ObjectState) => _state.clientID === (contextMenuParentID || contextMenuClientID));
    
    // 如果是子对象，从父对象的elements中找到对应的子对象
    if (contextMenuParentID !== null) {
        state = state.elements.find((_state: ObjectState) => _state.clientID === contextMenuClientID);
    }

    // 只有当对象是GroundTruth时才能复制
    const copyObject = state?.isGroundTruth ? state : null;
    
    // 审核工作空间：渲染审核模式的右键菜单
    if (workspace === Workspace.REVIEW) {
        // 查找与当前对象相关的质量冲突
        const conflict = frameConflicts
            .find((qualityConflict: QualityConflict) => qualityConflict.annotationConflicts.some(
                (annotationConflict: AnnotationConflict) => (
                    state && annotationConflict.serverID === state.serverID &&
                    annotationConflict.type === state.objectType
                ),
            ));

        return ReactDOM.createPortal(
            <ReviewContextMenu
                key={contextMenuClientID}
                top={top}
                left={left}
                conflict={conflict}
                copyObject={copyObject}
                latestComments={latestComments}
                onClick={(param: MenuInfo) => {
                    if (state) {
                        let { points } = state;
                        
                        // 处理椭圆和矩形形状：计算边界框点
                        if ([ShapeType.ELLIPSE, ShapeType.RECTANGLE].includes(state.shapeType)) {
                            const [cx, cy] = state.shapeType === 'ellipse' ? state.points : [
                                (state.points[0] + state.points[2]) / 2,
                                (state.points[1] + state.points[3]) / 2,
                            ];
                            const [rx, ry] = [state.points[2] - cx, cy - state.points[3]];
                            points = state.shapeType === 'ellipse' ? [
                                state.points[0] - rx,
                                state.points[1] - ry,
                                state.points[0] + rx,
                                state.points[1] + ry,
                            ] : state.points;

                            // 应用旋转变换
                            points = [
                                [points[0], points[1]],
                                [points[2], points[1]],
                                [points[2], points[3]],
                                [points[0], points[3]],
                            ].map(([x, y]: number[]) => rotatePoint(x, y, state.rotation, cx, cy)).flat();
                        } else if (state.shapeType === ShapeType.MASK) {
                            // 处理遮罩形状：使用最后4个点作为边界框
                            points = state.points.slice(-4);
                            points = [
                                points[0], points[1],
                                points[2], points[1],
                                points[2], points[3],
                                points[0], points[3],
                            ];
                        }

                        // 根据菜单项类型执行相应操作
                        if (param.key === ReviewContextMenuKeys.OPEN_ISSUE) {
                            onStartIssue(points);
                        } else if (param.key === ReviewContextMenuKeys.QUICK_ISSUE_POSITION) {
                            openIssue(points, config.QUICK_ISSUE_INCORRECT_POSITION_TEXT);
                        } else if (param.key === ReviewContextMenuKeys.QUICK_ISSUE_ATTRIBUTE) {
                            openIssue(points, config.QUICK_ISSUE_INCORRECT_ATTRIBUTE_TEXT);
                        } else if (param.key === ReviewContextMenuKeys.QUICK_ISSUE_FROM_CONFLICT) {
                            if (conflict) openIssue(points, conflict.description);
                        } else if (param.key === ReviewContextMenuKeys.COPY_OBJECT) {
                            if (copyObject) onCopyObject(copyObject);
                        } else if (
                            // 处理从最新评论创建问题的情况
                            param.keyPath.length === 2 &&
                            param.keyPath[1] === ReviewContextMenuKeys.QUICK_ISSUE_FROM_LATEST
                        ) {
                            openIssue(points, latestComments[+param.keyPath[0]]);
                        }
                    }
                }}
            />,
            window.document.body,
        );
    }

    // 标准工作空间且存在父对象：渲染对象编辑菜单
    if (Number.isInteger(contextMenuParentID)) {
        return ReactDOM.createPortal(
            <div className='cvat-canvas-context-menu' style={{ top, left }}>
                <ObjectItemElementComponent
                    readonly={readonly}
                    key={contextMenuClientID}
                    clientID={contextMenuClientID}
                    parentID={contextMenuParentID as number}
                />
            </div>,
            window.document.body,
        );
    }

    return ReactDOM.createPortal(
        <div className='cvat-canvas-context-menu' style={{ top, left }}>
            <ObjectItemContainer
                readonly={readonly}
                key={contextMenuClientID}
                clientID={contextMenuClientID}
                objectStates={objectStates}
            />
        </div>,
        window.document.body,
    );
}
