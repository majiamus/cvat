// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import Layout from 'antd/lib/layout';

import {
    ActiveControl, Rotation, CombinedState,
} from 'reducers';
import GlobalHotKeys, { KeyMap } from 'utils/mousetrap-react';
import { Canvas, CanvasMode } from 'cvat-canvas-wrapper';
import { LabelType } from 'cvat-core-wrapper';

import { ShortcutScope } from 'utils/enums';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import { subKeyMap } from 'utils/component-subkeymap';
import ControlVisibilityObserver, { ExtraControlsControl } from './control-visibility-observer';
import RotateControl, { Props as RotateControlProps } from './rotate-control';
import CursorControl, { Props as CursorControlProps } from './cursor-control';
import MoveControl, { Props as MoveControlProps } from './move-control';
import FitControl, { Props as FitControlProps } from './fit-control';
import ResizeControl, { Props as ResizeControlProps } from './resize-control';
import ToolsControl from './tools-control';
import OpenCVControl from './opencv-control';
import DrawRectangleControl, { Props as DrawRectangleControlProps } from './draw-rectangle-control';
import DrawPolygonControl, { Props as DrawPolygonControlProps } from './draw-polygon-control';
import DrawPolylineControl, { Props as DrawPolylineControlProps } from './draw-polyline-control';
import DrawPointsControl, { Props as DrawPointsControlProps } from './draw-points-control';
import DrawEllipseControl, { Props as DrawEllipseControlProps } from './draw-ellipse-control';
import DrawCuboidControl, { Props as DrawCuboidControlProps } from './draw-cuboid-control';
import DrawMaskControl, { Props as DrawMaskControlProps } from './draw-mask-control';
import DrawSkeletonControl, { Props as DrawSkeletonControlProps } from './draw-skeleton-control';
import SetupTagControl, { Props as SetupTagControlProps } from './setup-tag-control';
import MergeControl, { Props as MergeControlProps } from './merge-control';
import GroupControl, { Props as GroupControlProps } from './group-control';
import JoinControl, { Props as JoinControlProps } from './join-control';
import SplitControl, { Props as SplitControlProps } from './split-control';
import SliceControl, { Props as SliceControlProps } from './slice-control';

type Label = CombinedState['annotation']['job']['labels'][0];

interface Props {
    canvasInstance: Canvas;
    activeControl: ActiveControl;
    keyMap: KeyMap;
    normalizedKeyMap: Record<string, string>;
    labels: Label[];
    frameData: any;

    updateActiveControl(activeControl: ActiveControl): void;
    rotateFrame(rotation: Rotation): void;
    repeatDrawShape(): void;
    pasteShape(): void;
    resetGroup(): void;
    redrawShape(): void;
}

const componentShortcuts = {
    CLOCKWISE_ROTATION_STANDARD_CONTROLS: {
        name: 'Rotate clockwise',
        description: 'Change image angle (add 90 degrees)',
        sequences: ['ctrl+r'],
        scope: ShortcutScope.STANDARD_WORKSPACE_CONTROLS,
    },
    ANTICLOCKWISE_ROTATION_STANDARD_CONTROLS: {
        name: 'Rotate anticlockwise',
        description: 'Change image angle (subtract 90 degrees)',
        sequences: ['ctrl+shift+r'],
        scope: ShortcutScope.STANDARD_WORKSPACE_CONTROLS,
    },
    PASTE_SHAPE: {
        name: 'Paste shape',
        description: 'Paste a shape from internal CVAT clipboard',
        sequences: ['ctrl+v'],
        scope: ShortcutScope.OBJECTS_SIDEBAR,
    },
    SWITCH_DRAW_MODE_STANDARD_CONTROLS: {
        name: 'Draw mode',
        description:
            'Repeat the latest procedure of drawing with the same parameters',
        sequences: ['n'],
        scope: ShortcutScope.STANDARD_WORKSPACE_CONTROLS,
    },
    SWITCH_REDRAW_MODE_STANDARD_CONTROLS: {
        name: 'Redraw shape',
        description: 'Remove selected shape and redraw it from scratch',
        sequences: ['shift+n'],
        scope: ShortcutScope.STANDARD_WORKSPACE_CONTROLS,
    },
    SWITCH_GROUP_MODE_STANDARD_CONTROLS: {
        name: 'Group mode',
        description: 'Activate or deactivate mode to grouping shapes',
        sequences: ['g'],
        scope: ShortcutScope.STANDARD_WORKSPACE_CONTROLS,
    },
    RESET_GROUP_STANDARD_CONTROLS: {
        name: 'Reset group',
        description: 'Reset group for selected shapes (in group mode)',
        sequences: ['shift+g'],
        scope: ShortcutScope.STANDARD_WORKSPACE_CONTROLS,
    },
    SWITCH_MERGE_MODE_STANDARD_CONTROLS: {
        name: 'Merge mode',
        description: 'Activate or deactivate mode to merging shapes',
        sequences: ['m'],
        scope: ShortcutScope.STANDARD_WORKSPACE_CONTROLS,
    },
    SWITCH_SPLIT_MODE_STANDARD_CONTROLS: {
        name: 'Split mode',
        description: 'Activate or deactivate mode to splitting shapes',
        sequences: ['alt+m'],
        scope: ShortcutScope.STANDARD_WORKSPACE_CONTROLS,
    },
};

registerComponentShortcuts(componentShortcuts);

// We use the observer to see if these controls are in the scopeport
// They automatically put to extra if not
const ObservedCursorControl = ControlVisibilityObserver<CursorControlProps>(CursorControl);
const ObservedMoveControl = ControlVisibilityObserver<MoveControlProps>(MoveControl);
const ObservedRotateControl = ControlVisibilityObserver<RotateControlProps>(RotateControl);
const ObservedFitControl = ControlVisibilityObserver<FitControlProps>(FitControl);
const ObservedResizeControl = ControlVisibilityObserver<ResizeControlProps>(ResizeControl);
const ObservedToolsControl = ControlVisibilityObserver(ToolsControl);
const ObservedOpenCVControl = ControlVisibilityObserver(OpenCVControl);
const ObservedDrawRectangleControl = ControlVisibilityObserver<DrawRectangleControlProps>(DrawRectangleControl);
const ObservedDrawPolygonControl = ControlVisibilityObserver<DrawPolygonControlProps>(DrawPolygonControl);
const ObservedDrawPolylineControl = ControlVisibilityObserver<DrawPolylineControlProps>(DrawPolylineControl);
const ObservedDrawPointsControl = ControlVisibilityObserver<DrawPointsControlProps>(DrawPointsControl);
const ObservedDrawEllipseControl = ControlVisibilityObserver<DrawEllipseControlProps>(DrawEllipseControl);
const ObservedDrawCuboidControl = ControlVisibilityObserver<DrawCuboidControlProps>(DrawCuboidControl);
const ObservedDrawMaskControl = ControlVisibilityObserver<DrawMaskControlProps>(DrawMaskControl);
const ObservedDrawSkeletonControl = ControlVisibilityObserver<DrawSkeletonControlProps>(DrawSkeletonControl);
const ObservedSetupTagControl = ControlVisibilityObserver<SetupTagControlProps>(SetupTagControl);
const ObservedMergeControl = ControlVisibilityObserver<MergeControlProps>(MergeControl);
const ObservedGroupControl = ControlVisibilityObserver<GroupControlProps>(GroupControl);
const ObservedJoinControl = ControlVisibilityObserver<JoinControlProps>(JoinControl);
const ObservedSplitControl = ControlVisibilityObserver<SplitControlProps>(SplitControl);
const ObservedSliceControl = ControlVisibilityObserver<SliceControlProps>(SliceControl);

export default function ControlsSideBarComponent(props: Props): JSX.Element {
    const {
        activeControl,
        canvasInstance,
        normalizedKeyMap,
        keyMap,
        labels,
        updateActiveControl,
        rotateFrame,
        repeatDrawShape,
        pasteShape,
        resetGroup,
        redrawShape,
        frameData,
    } = props;

    const controlsDisabled = !labels.length || frameData.deleted;
    const withUnspecifiedType = labels.some((label: any) => label.type === 'any' && !label.hasParent);
    let rectangleControlVisible = withUnspecifiedType;
    let polygonControlVisible = withUnspecifiedType;
    let polylineControlVisible = withUnspecifiedType;
    let pointsControlVisible = withUnspecifiedType;
    let ellipseControlVisible = withUnspecifiedType;
    let cuboidControlVisible = withUnspecifiedType;
    let maskControlVisible = withUnspecifiedType;
    let tagControlVisible = withUnspecifiedType;
    const skeletonControlVisible = labels.some((label: Label) => label.type === 'skeleton');
    labels.forEach((label: Label) => {
        rectangleControlVisible = rectangleControlVisible || label.type === LabelType.RECTANGLE;
        polygonControlVisible = polygonControlVisible || label.type === LabelType.POLYGON;
        polylineControlVisible = polylineControlVisible || label.type === LabelType.POLYLINE;
        pointsControlVisible = pointsControlVisible || label.type === LabelType.POINTS;
        ellipseControlVisible = ellipseControlVisible || label.type === LabelType.ELLIPSE;
        cuboidControlVisible = cuboidControlVisible || label.type === LabelType.CUBOID;
        maskControlVisible = maskControlVisible || label.type === LabelType.MASK;
        tagControlVisible = tagControlVisible || label.type === LabelType.TAG;
    });

    const preventDefault = (event: KeyboardEvent | undefined): void => {
        if (event) {
            event.preventDefault();
        }
    };

    const dynamicMergeIconProps =
        activeControl === ActiveControl.MERGE ?
            {
                className: 'cvat-merge-control cvat-active-canvas-control',
                onClick: (): void => {
                    canvasInstance.merge({ enabled: false });
                    updateActiveControl(ActiveControl.CURSOR);
                },
            } :
            {
                className: 'cvat-merge-control',
                onClick: (): void => {
                    canvasInstance.cancel();
                    canvasInstance.merge({ enabled: true });
                    updateActiveControl(ActiveControl.MERGE);
                },
            };

    const dynamicGroupIconProps =
    activeControl === ActiveControl.GROUP ?
        {
            className: 'cvat-group-control cvat-active-canvas-control',
            onClick: (): void => {
                canvasInstance.group({ enabled: false });
                updateActiveControl(ActiveControl.CURSOR);
            },
        } :
        {
            className: 'cvat-group-control',
            onClick: (): void => {
                canvasInstance.cancel();
                canvasInstance.group({ enabled: true });
                updateActiveControl(ActiveControl.GROUP);
            },
        };

    const dynamicTrackIconProps = activeControl === ActiveControl.SPLIT ?
        {
            className: 'cvat-split-track-control cvat-active-canvas-control',
            onClick: (): void => {
                canvasInstance.split({ enabled: false });
            },
        } :
        {
            className: 'cvat-split-track-control',
            onClick: (): void => {
                canvasInstance.cancel();
                canvasInstance.split({ enabled: true });
                updateActiveControl(ActiveControl.SPLIT);
            },
        };

    let handlers: Partial<Record<keyof typeof componentShortcuts, (event?: KeyboardEvent) => void>> = {
        CLOCKWISE_ROTATION_STANDARD_CONTROLS: (event: KeyboardEvent | undefined) => {
            preventDefault(event);
            rotateFrame(Rotation.CLOCKWISE90);
        },
        ANTICLOCKWISE_ROTATION_STANDARD_CONTROLS: (event: KeyboardEvent | undefined) => {
            preventDefault(event);
            rotateFrame(Rotation.ANTICLOCKWISE90);
        },
        SWITCH_GROUP_MODE_STANDARD_CONTROLS: (event: KeyboardEvent | undefined): void => {
            if (event) event.preventDefault();
            dynamicGroupIconProps.onClick();
        },
        RESET_GROUP_STANDARD_CONTROLS: (event: KeyboardEvent | undefined): void => {
            if (event) event.preventDefault();
            const grouping = activeControl === ActiveControl.GROUP;
            if (!grouping) {
                return;
            }
            resetGroup();
            canvasInstance.group({ enabled: false });
            updateActiveControl(ActiveControl.CURSOR);
        },
        SWITCH_MERGE_MODE_STANDARD_CONTROLS: (event: KeyboardEvent | undefined): void => {
            if (event) event.preventDefault();
            dynamicMergeIconProps.onClick();
        },
        SWITCH_SPLIT_MODE_STANDARD_CONTROLS: (event: KeyboardEvent | undefined) => {
            if (event) event.preventDefault();
            dynamicTrackIconProps.onClick();
        },
    };

    /**
     * 处理绘制模式切换的核心函数
     * 响应快捷键 'N' 的按下事件，根据当前画布状态执行不同操作：
     * - 绘制状态下：结束当前绘制操作
     * - 编辑状态下：结束当前编辑操作
     * - 其他状态下：取消当前操作并根据action参数重试绘制
     *
     * @param event - 键盘事件对象（可选），用于阻止默认行为
     * @param action - 操作类型，'draw' 表示重新开始绘制，'redraw' 表示重新绘制
     */
    const handleDrawMode = (event: KeyboardEvent | undefined, action: 'draw' | 'redraw'): void => {
        // 阻止事件的默认行为，防止浏览器默认快捷键冲突
        preventDefault(event);

        // 定义所有绘制相关的控件类型，用于判断当前是否处于绘制状态
        const drawing = [
            ActiveControl.DRAW_POINTS,      // 点绘制
            ActiveControl.DRAW_POLYGON,     // 多边形绘制
            ActiveControl.DRAW_POLYLINE,    // 折线绘制
            ActiveControl.DRAW_RECTANGLE,   // 矩形绘制
            ActiveControl.DRAW_CUBOID,      // 立方体绘制
            ActiveControl.DRAW_ELLIPSE,     // 椭圆绘制
            ActiveControl.DRAW_SKELETON,    // 骨骼绘制
            ActiveControl.DRAW_MASK,        // 遮罩绘制
            ActiveControl.AI_TOOLS,         // AI工具
            ActiveControl.OPENCV_TOOLS,     // OpenCV工具
        ].includes(activeControl);

        // 检查画布是否处于编辑模式
        const editing = canvasInstance.mode() === CanvasMode.EDIT;

        // 如果当前不处于绘制状态
        if (!drawing) {
            // 如果处于编辑状态，结束编辑模式
            if (editing) {
                // 用户可能习惯按 N 键来结束编辑，特别是编辑遮罩或折线时
                // 在这种情况下，我们应该先完成编辑操作
                canvasInstance.edit({ enabled: false });
                return;
            }

            // 取消当前所有操作
            canvasInstance.cancel();

            // repeatDrawShape 会获取最新的参数并调用 canvasInstance.draw() 重新开始绘制
            if (action === 'draw') {
                repeatDrawShape();  // 重新开始绘制
            } else {
                redrawShape();      // 重新绘制
            }
        } else {
            // 如果当前处于 AI 工具或 OpenCV 工具的绘制状态
            if ([ActiveControl.AI_TOOLS, ActiveControl.OPENCV_TOOLS].includes(activeControl)) {
                // 使用专门的 API 方法来结束交互模式
                canvasInstance.interact({ enabled: false });
                return;
            }

            // 结束当前绘制操作，这是快捷键 'N' 的核心功能
            canvasInstance.draw({ enabled: false });
        }
    };

    if (!controlsDisabled) {
        handlers = {
            ...handlers,
            PASTE_SHAPE: (event: KeyboardEvent | undefined) => {
                preventDefault(event);
                canvasInstance.cancel();
                pasteShape();
            },
            SWITCH_DRAW_MODE_STANDARD_CONTROLS: (event: KeyboardEvent | undefined) => {
                handleDrawMode(event, 'draw');
            },
            SWITCH_REDRAW_MODE_STANDARD_CONTROLS: (event: KeyboardEvent | undefined) => {
                handleDrawMode(event, 'redraw');
            },
        };
    }

    return (
        <Layout.Sider className='cvat-canvas-controls-sidebar' theme='light' width={44}>
            <GlobalHotKeys keyMap={subKeyMap(componentShortcuts, keyMap)} handlers={handlers} />
            <ObservedCursorControl
                cursorShortkey={normalizedKeyMap.CANCEL}
                canvasInstance={canvasInstance}
                activeControl={activeControl}
            />
            <ObservedMoveControl canvasInstance={canvasInstance} activeControl={activeControl} />
            <ObservedRotateControl
                anticlockwiseShortcut={normalizedKeyMap.ANTICLOCKWISE_ROTATION_STANDARD_CONTROLS}
                clockwiseShortcut={normalizedKeyMap.CLOCKWISE_ROTATION_STANDARD_CONTROLS}
                rotateFrame={rotateFrame}
            />

            <hr />

            <ObservedFitControl canvasInstance={canvasInstance} />
            <ObservedResizeControl canvasInstance={canvasInstance} activeControl={activeControl} />

            <hr />
            <ObservedToolsControl />
            <ObservedOpenCVControl />
            {
                rectangleControlVisible && (
                    <ObservedDrawRectangleControl
                        canvasInstance={canvasInstance}
                        isDrawing={activeControl === ActiveControl.DRAW_RECTANGLE}
                        disabled={controlsDisabled}
                    />
                )
            }
            {
                polygonControlVisible && (
                    <ObservedDrawPolygonControl
                        canvasInstance={canvasInstance}
                        isDrawing={activeControl === ActiveControl.DRAW_POLYGON}
                        disabled={controlsDisabled}
                    />
                )
            }
            {
                polylineControlVisible && (
                    <ObservedDrawPolylineControl
                        canvasInstance={canvasInstance}
                        isDrawing={activeControl === ActiveControl.DRAW_POLYLINE}
                        disabled={controlsDisabled}
                    />
                )
            }
            {
                pointsControlVisible && (
                    <ObservedDrawPointsControl
                        canvasInstance={canvasInstance}
                        isDrawing={activeControl === ActiveControl.DRAW_POINTS}
                        disabled={controlsDisabled}
                    />
                )
            }
            {
                ellipseControlVisible && (
                    <ObservedDrawEllipseControl
                        canvasInstance={canvasInstance}
                        isDrawing={activeControl === ActiveControl.DRAW_ELLIPSE}
                        disabled={controlsDisabled}
                    />
                )
            }
            {
                cuboidControlVisible && (
                    <ObservedDrawCuboidControl
                        canvasInstance={canvasInstance}
                        isDrawing={activeControl === ActiveControl.DRAW_CUBOID}
                        disabled={controlsDisabled}
                    />
                )
            }
            {
                maskControlVisible && (
                    <ObservedDrawMaskControl
                        canvasInstance={canvasInstance}
                        isDrawing={activeControl === ActiveControl.DRAW_MASK}
                        disabled={controlsDisabled}
                    />
                )
            }
            {
                skeletonControlVisible && (
                    <ObservedDrawSkeletonControl
                        canvasInstance={canvasInstance}
                        isDrawing={activeControl === ActiveControl.DRAW_SKELETON}
                        disabled={controlsDisabled}
                    />
                )
            }
            {
                tagControlVisible && (
                    <ObservedSetupTagControl
                        canvasInstance={canvasInstance}
                        disabled={controlsDisabled}
                    />
                )
            }
            <hr />

            <ObservedMergeControl
                canvasInstance={canvasInstance}
                dynamicIconProps={dynamicMergeIconProps}
                disabled={controlsDisabled}
            />
            <ObservedGroupControl
                canvasInstance={canvasInstance}
                dynamicIconProps={dynamicGroupIconProps}
                disabled={controlsDisabled}
            />
            <ObservedSplitControl
                canvasInstance={canvasInstance}
                dynamicIconProps={dynamicTrackIconProps}
                disabled={controlsDisabled}
            />
            <ObservedJoinControl
                updateActiveControl={updateActiveControl}
                canvasInstance={canvasInstance}
                activeControl={activeControl}
                disabled={controlsDisabled}
            />
            <ObservedSliceControl
                updateActiveControl={updateActiveControl}
                canvasInstance={canvasInstance}
                activeControl={activeControl}
                disabled={controlsDisabled}
            />

            <ExtraControlsControl />
        </Layout.Sider>
    );
}
