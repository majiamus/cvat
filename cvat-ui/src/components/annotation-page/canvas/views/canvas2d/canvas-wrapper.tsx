// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';

import React from 'react';
import { connect } from 'react-redux';
import Slider from 'antd/lib/slider';
import Spin from 'antd/lib/spin';
import Popover from 'antd/lib/popover';
import { PlusCircleOutlined, UpOutlined } from '@ant-design/icons';
import notification from 'antd/lib/notification';
import debounce from 'lodash/debounce';

import GlobalHotKeys, { KeyMap } from 'utils/mousetrap-react';
import {
    ColorBy, GridColor, Workspace, ActiveControl, CombinedState,
} from 'reducers';
import { EventScope } from 'cvat-logger';
import { Canvas, HighlightSeverity, CanvasHint } from 'cvat-canvas-wrapper';
import { Canvas3d } from 'cvat-canvas3d-wrapper';
import {
    AnnotationConflict, ObjectState, ObjectType, ShapeType, QualityConflict, getCore,
} from 'cvat-core-wrapper';
import config from 'config';
import CVATTooltip from 'components/common/cvat-tooltip';
import FrameTags from 'components/annotation-page/tag-annotation-workspace/frame-tags';
import {
    confirmCanvasReadyAsync,
    resetCanvas,
    updateActiveControl as updateActiveControlAction,
    updateAnnotationsAsync,
    createAnnotationsAsync,
    mergeAnnotationsAsync,
    groupAnnotationsAsync,
    joinAnnotationsAsync,
    sliceAnnotationsAsync,
    splitAnnotationsAsync,
    activateObject,
    updateCanvasContextMenu,
    addZLayer,
    switchZLayer,
    fetchAnnotationsAsync,
    getDataFailed,
    canvasErrorOccurred,
    updateEditedStateAsync,
} from 'actions/annotation-actions';
import {
    switchGrid,
    changeGridColor,
    changeGridOpacity,
    changeBrightnessLevel,
    changeContrastLevel,
    changeSaturationLevel,
    switchAutomaticBordering,
} from 'actions/settings-actions';
import { reviewActions } from 'actions/review-actions';

import { filterAnnotations } from 'utils/filter-annotations';
import { ImageFilter } from 'utils/image-processing';
import { ShortcutScope } from 'utils/enums';
import { registerComponentShortcuts } from 'actions/shortcuts-actions';
import { subKeyMap } from 'utils/component-subkeymap';
import ImageSetupsContent from './image-setups-content';
import CanvasTipsComponent from './canvas-hints';

// 获取CVAT核心模块实例，用于访问画布相关的核心功能
const cvat = getCore();
// 定义打开图形的最大距离阈值（像素），用于判断用户是否意图打开图形
const MAX_DISTANCE_TO_OPEN_SHAPE = 50;

/**
 * Redux状态到组件属性的映射接口
 * 定义了从Redux store中映射到CanvasWrapper组件的所有状态属性
 */
interface StateToProps {
    /** 画布实例，可以是2D画布(Canvas)或3D画布(Canvas3d) */
    canvasInstance: Canvas | Canvas3d | null;
    /** 当前任务实例，包含任务相关信息 */
    jobInstance: any;
    /** 当前激活的状态ID，用于标识选中的标注状态 */
    activatedStateID: number | null;
    /** 当前激活的元素ID，用于标识选中的图形元素 */
    activatedElementID: number | null;
    /** 当前激活的属性ID，用于标识选中的标注属性 */
    activatedAttributeID: number | null;
    /** 当前帧的所有标注对象状态数组 */
    annotations: ObjectState[];
    /** 当前帧的数据，包含图像、元数据等信息 */
    frameData: any;
    /** 当前帧的旋转角度 */
    frameAngle: number;
    /** 画布是否已准备就绪的标志 */
    canvasIsReady: boolean;
    /** 当前帧的序号 */
    frame: number;
    /** 画布整体不透明度 */
    opacity: number;
    /** 标注对象的着色方案 */
    colorBy: ColorBy;
    /** 选中对象的不透明度 */
    selectedOpacity: number;
    /** 是否显示对象轮廓 */
    outlined: boolean;
    /** 对象轮廓的颜色 */
    outlineColor: string;
    /** 是否显示位图图像 */
    showBitmap: boolean;
    /** 是否显示投影（3D相关） */
    showProjections: boolean;
    /** 是否显示网格 */
    grid: boolean;
    /** 网格大小 */
    gridSize: number;
    /** 网格颜色配置 */
    gridColor: GridColor;
    /** 网格不透明度 */
    gridOpacity: number;
    /** 当前激活的标签ID */
    activeLabelID: number;
    /** 当前激活的对象类型 */
    activeObjectType: ObjectType;
    /** 图像亮度级别 */
    brightnessLevel: number;
    /** 图像对比度级别 */
    contrastLevel: number;
    /** 图像饱和度级别 */
    saturationLevel: number;
    /** 是否重置缩放 */
    resetZoom: boolean;
    /** 是否启用图像平滑 */
    smoothImage: boolean;
    /** 自适应缩放边距 */
    aamZoomMargin: number;
    /** 是否始终显示对象文本 */
    showObjectsTextAlways: boolean;
    /** 文本字体大小 */
    textFontSize: number;
    /** 控制点大小 */
    controlPointsSize: number;
    /** 文本位置配置 */
    textPosition: 'auto' | 'center';
    /** 文本内容配置 */
    textContent: string;
    /** 是否显示所有插值轨迹 */
    showAllInterpolationTracks: boolean;
    /** 当前工作空间类型 */
    workspace: Workspace;
    /** 最小Z层级（用于3D） */
    minZLayer: number;
    /** 最大Z层级（用于3D） */
    maxZLayer: number;
    /** 当前Z层级（用于3D） */
    curZLayer: number;
    /** 是否启用自动边界 */
    automaticBordering: boolean;
    /** 是否启用自适应缩放 */
    adaptiveZoom: boolean;
    /** 是否启用智能多边形裁剪 */
    intelligentPolygonCrop: boolean;
    /** 是否可切换自动边界 */
    switchableAutomaticBordering: boolean;
    /** 键盘映射配置 */
    keyMap: KeyMap;
    /** 是否在帧上显示标签 */
    showTagsOnFrame: boolean;
    /** 质量冲突列表 */
    conflicts: QualityConflict[];
    /** 是否显示真实数据 */
    showGroundTruth: boolean;
    /** 当前高亮的冲突 */
    highlightedConflict: QualityConflict | null;
    /** 应用于图像的滤镜列表 */
    imageFilters: ImageFilter[];
    /** 当前激活的控制工具 */
    activeControl: ActiveControl;
    /** 激活对象是否隐藏 */
    activeObjectHidden: boolean;
}

/**
 * Redux dispatch到组件方法的映射接口
 * 定义了从Redux dispatch映射到CanvasWrapper组件的所有方法，用于触发状态更新
 */
interface DispatchToProps {
    /** 设置画布，初始化画布实例 */
    onSetupCanvas(): void;
    /** 重置画布，清除当前画布状态 */
    onResetCanvas: () => void;
    /** 更新当前激活的控制工具 */
    updateActiveControl: (activeControl: ActiveControl) => void;
    /** 更新标注对象状态 */
    onUpdateAnnotations(states: ObjectState[]): void;
    /** 创建新的标注对象 */
    onCreateAnnotations(states: ObjectState[]): void;
    /** 合并多个标注对象 */
    onMergeAnnotations(states: ObjectState[]): void;
    /** 分割标注对象 */
    onSplitAnnotations(state: ObjectState): void;
    /** 将多个标注对象组合成组 */
    onGroupAnnotations(states: ObjectState[]): void;
    /** 连接多个标注对象，通过指定点进行连接 */
    onJoinAnnotations(states: ObjectState[], points: number[]): void;
    /** 切割标注对象，根据指定的切割结果 */
    onSliceAnnotations(state: ObjectState, results: number[][]): void;
    /** 激活指定的对象，设置激活状态ID和元素ID */
    onActivateObject: (activatedStateID: number | null, activatedElementID: number | null) => void;
    /** 添加新的Z层级（用于3D场景） */
    onAddZLayer(): void;
    /** 切换到指定的Z层级 */
    onSwitchZLayer(cur: number): void;
    /** 调整图像亮度级别 */
    onChangeBrightnessLevel(level: number): void;
    /** 调整图像对比度级别 */
    onChangeContrastLevel(level: number): void;
    /** 调整图像饱和度级别 */
    onChangeSaturationLevel(level: number): void;
    /** 调整网格不透明度 */
    onChangeGridOpacity(opacity: number): void;
    /** 更改网格颜色 */
    onChangeGridColor(color: GridColor): void;
    /** 切换网格显示状态 */
    onSwitchGrid(enabled: boolean): void;
    /** 切换自动边界功能 */
    onSwitchAutomaticBordering(enabled: boolean): void;
    /** 获取标注数据 */
    onFetchAnnotation(): void;
    /** 处理数据获取失败 */
    onGetDataFailed(error: Error): void;
    /** 处理画布错误 */
    onCanvasErrorOccurred(error: Error): void;
    /** 开始问题报告，记录问题位置 */
    onStartIssue(position: number[]): void;
    /** 更新编辑后的对象状态 */
    onUpdateEditedObject(editedState: ObjectState | null): void;
}

/**
 * Redux状态映射函数
 * 将全局Redux状态映射到CanvasWrapper组件的props属性
 * @param state 全局Redux状态对象
 * @returns 返回符合StateToProps接口的属性对象
 */
function mapStateToProps(state: CombinedState): StateToProps {
    // 从全局状态中解构获取各个模块的状态
    const {
        // 标注相关状态
        annotation: {
            // 画布相关状态
            canvas: {
                activeControl,        // 当前激活的控制工具
                instance: canvasInstance,  // 画布实例
                ready: canvasIsReady,      // 画布是否准备就绪
                activeObjectHidden,        // 激活对象是否隐藏
            },
            // 绘图相关状态
            drawing: { 
                activeLabelID,       // 当前激活的标签ID
                activeObjectType,    // 当前激活的对象类型
            },
            // 任务相关状态
            job: { 
                instance: jobInstance,  // 任务实例
            },
            // 播放器相关状态
            player: {
                frame: { 
                    data: frameData,    // 当前帧数据
                    number: frame,      // 当前帧序号
                },
                frameAngles,            // 所有帧的旋转角度数组
            },
            // 标注对象相关状态
            annotations: {
                states: annotations,    // 标注对象状态数组
                activatedStateID,       // 激活的状态ID
                activatedElementID,     // 激活的元素ID
                activatedAttributeID,   // 激活的属性ID
                zLayer: { 
                    cur: curZLayer,     // 当前Z层级
                    min: minZLayer,     // 最小Z层级
                    max: maxZLayer,     // 最大Z层级
                },
                highlightedConflict,    // 高亮的冲突
            },
            workspace,                  // 工作空间类型
        },
        // 设置相关状态
        settings: {
            // 播放器设置
            player: {
                grid,                   // 是否显示网格
                gridSize,               // 网格大小
                gridColor,              // 网格颜色
                gridOpacity,            // 网格不透明度(0-100)
                brightnessLevel,         // 亮度级别(0-100)
                contrastLevel,          // 对比度级别(0-100)
                saturationLevel,        // 饱和度级别(0-100)
                resetZoom,              // 是否重置缩放
                smoothImage,            // 是否平滑图像
            },
            // 工作空间设置
            workspace: {
                aamZoomMargin,          // 自适应缩放边距
                showObjectsTextAlways,  // 是否始终显示对象文本
                showAllInterpolationTracks,  // 是否显示所有插值轨迹
                showTagsOnFrame,        // 是否在帧上显示标签
                automaticBordering,     // 是否启用自动边界
                adaptiveZoom,           // 是否启用自适应缩放
                intelligentPolygonCrop, // 是否启用智能多边形裁剪
                textFontSize,           // 文本字体大小
                controlPointsSize,      // 控制点大小
                textPosition,           // 文本位置
                textContent,            // 文本内容
            },
            // 图形设置
            shapes: {
                opacity,                // 不透明度(0-100)
                colorBy,                // 着色方案
                selectedOpacity,        // 选中对象不透明度(0-100)
                outlined,               // 是否显示轮廓
                outlineColor,           // 轮廓颜色
                showBitmap,             // 是否显示位图
                showProjections,        // 是否显示投影
                showGroundTruth,        // 是否显示真实数据
            },
            imageFilters,                // 图像滤镜列表
        },
        // 快捷键相关状态
        shortcuts: { 
            keyMap,                 // 键盘映射
        },
        // 审查相关状态
        review: { 
            conflicts,              // 质量冲突列表
        },
    } = state;

    // 返回映射后的属性对象
    return {
        // 基础属性
        canvasInstance,            // 画布实例
        jobInstance,                // 任务实例
        frameData,                  // 当前帧数据
        // 计算当前帧的旋转角度，基于帧序号和任务起始帧
        frameAngle: frameAngles[frame - jobInstance.startFrame],
        canvasIsReady,             // 画布是否准备就绪
        frame,                      // 当前帧序号
        
        // 激活状态相关
        activatedStateID,           // 激活的状态ID
        activatedElementID,         // 激活的元素ID
        activatedAttributeID,       // 激活的属性ID
        annotations,                // 标注对象状态数组
        
        // 图形显示相关（将百分比转换为小数）
        opacity: opacity / 100,                     // 不透明度
        colorBy,                                      // 着色方案
        selectedOpacity: selectedOpacity / 100,      // 选中对象不透明度
        outlined,                                     // 是否显示轮廓
        outlineColor,                                 // 轮廓颜色
        showBitmap,                                   // 是否显示位图
        showProjections,                              // 是否显示投影
        
        // 网格相关
        grid,                                         // 是否显示网格
        gridSize,                                     // 网格大小
        gridColor,                                    // 网格颜色
        gridOpacity: gridOpacity / 100,               // 网格不透明度
        
        // 绘图相关
        activeLabelID,                                // 当前激活的标签ID
        activeObjectType,                             // 当前激活的对象类型
        
        // 图像调整相关（将百分比转换为小数）
        brightnessLevel: brightnessLevel / 100,       // 亮度级别
        contrastLevel: contrastLevel / 100,          // 对比度级别
        saturationLevel: saturationLevel / 100,      // 饱和度级别
        resetZoom,                                    // 是否重置缩放
        smoothImage,                                  // 是否平滑图像
        
        // 工作空间设置相关
        aamZoomMargin,                                // 自适应缩放边距
        showObjectsTextAlways,                        // 是否始终显示对象文本
        textFontSize,                                 // 文本字体大小
        controlPointsSize,                            // 控制点大小
        textPosition,                                 // 文本位置
        textContent,                                  // 文本内容
        showAllInterpolationTracks,                   // 是否显示所有插值轨迹
        showTagsOnFrame,                              // 是否在帧上显示标签
        
        // Z层级相关
        curZLayer,                                    // 当前Z层级
        minZLayer,                                    // 最小Z层级
        maxZLayer,                                    // 最大Z层级
        
        // 高级功能相关
        automaticBordering,                           // 是否启用自动边界
        adaptiveZoom,                                 // 是否启用自适应缩放
        intelligentPolygonCrop,                      // 是否启用智能多边形裁剪
        workspace,                                    // 工作空间类型
        keyMap,                                       // 键盘映射
        activeControl,                                // 当前激活的控制工具
        
        // 计算是否可切换自动边界（特定控制工具下才可切换）
        switchableAutomaticBordering:
            activeControl === ActiveControl.DRAW_POLYGON ||
            activeControl === ActiveControl.DRAW_POLYLINE ||
            activeControl === ActiveControl.DRAW_MASK ||
            activeControl === ActiveControl.EDIT,
        
        // 质量控制相关
        conflicts,                                    // 质量冲突列表
        showGroundTruth,                              // 是否显示真实数据
        highlightedConflict,                          // 高亮的冲突
        imageFilters,                                 // 图像滤镜列表
        activeObjectHidden,                           // 激活对象是否隐藏
    };
}

/**
 * 组件快捷键配置对象
 * 定义了画布组件中可用的快捷键及其行为
 */
const componentShortcuts = {
    // 切换自动边界功能快捷键
    SWITCH_AUTOMATIC_BORDERING: {
        name: 'Switch automatic bordering',
        description: 'Switch automatic bordering for polygons and polylines during drawing/editing',
        sequences: ['ctrl+a'],
        scope: ShortcutScope.STANDARD_WORKSPACE,
    },
};

// 注册组件快捷键到全局快捷键系统
registerComponentShortcuts(componentShortcuts);

/**
 * 将Redux dispatch操作映射为组件props
 * 提供了画布组件中所有需要与Redux状态交互的操作方法
 * 
 * @param dispatch - Redux store的dispatch方法
 * @returns 包含所有操作方法的对象
 */
function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        // 设置画布，确认画布已准备就绪
        onSetupCanvas(): void {
            dispatch(confirmCanvasReadyAsync());
        },
        // 重置画布状态
        onResetCanvas(): void {
            dispatch(resetCanvas());
        },
        // 更新当前激活的控制工具
        updateActiveControl(activeControl: ActiveControl): void {
            dispatch(updateActiveControlAction(activeControl));
        },
        // 更新现有标记对象
        onUpdateAnnotations(states: ObjectState[]): void {
            dispatch(updateAnnotationsAsync(states));
        },
        // 创建新的标记对象
        onCreateAnnotations(states: ObjectState[]): void {
            dispatch(createAnnotationsAsync(states));
        },
        // 合并选中的标记对象
        onMergeAnnotations(states: ObjectState[]): void {
            dispatch(mergeAnnotationsAsync(states));
        },
        // 将选中的标记对象分组
        onGroupAnnotations(states: ObjectState[]): void {
            dispatch(groupAnnotationsAsync(states));
        },
        // 连接选中的标记对象，使用指定的连接点
        onJoinAnnotations(states: ObjectState[], points: number[]): void {
            dispatch(joinAnnotationsAsync(states, points));
        },
        // 切片标记对象，根据指定的分割结果
        onSliceAnnotations(state: ObjectState, results: number[][]): void {
            dispatch(sliceAnnotationsAsync(state, results));
        },
        // 分割标记对象
        onSplitAnnotations(state: ObjectState): void {
            dispatch(splitAnnotationsAsync(state));
        },
        // 激活指定的对象或元素
        onActivateObject(activatedStateID: number | null, activatedElementID: number | null = null): void {
            // 如果没有激活对象，隐藏上下文菜单
            if (activatedStateID === null) {
                dispatch(updateCanvasContextMenu(false, 0, 0));
            }

            dispatch(activateObject(activatedStateID, activatedElementID, null));
        },
        // 添加新的Z轴图层
        onAddZLayer(): void {
            dispatch(addZLayer());
        },
        // 切换到指定的Z轴图层
        onSwitchZLayer(cur: number): void {
            dispatch(switchZLayer(cur));
        },
        // 更改亮度级别
        onChangeBrightnessLevel(level: number): void {
            dispatch(changeBrightnessLevel(level));
        },
        // 更改对比度级别
        onChangeContrastLevel(level: number): void {
            dispatch(changeContrastLevel(level));
        },
        // 更改饱和度级别
        onChangeSaturationLevel(level: number): void {
            dispatch(changeSaturationLevel(level));
        },
        // 更改网格不透明度
        onChangeGridOpacity(opacity: number): void {
            dispatch(changeGridOpacity(opacity));
        },
        // 更改网格颜色
        onChangeGridColor(color: GridColor): void {
            dispatch(changeGridColor(color));
        },
        // 切换网格显示/隐藏
        onSwitchGrid(enabled: boolean): void {
            dispatch(switchGrid(enabled));
        },
        // 切换自动边界功能
        onSwitchAutomaticBordering(enabled: boolean): void {
            dispatch(switchAutomaticBordering(enabled));
        },
        // 获取标记数据
        onFetchAnnotation(): void {
            dispatch(fetchAnnotationsAsync());
        },
        // 处理数据获取失败
        onGetDataFailed(error: Error): void {
            dispatch(getDataFailed(error));
        },
        // 处理画布错误
        onCanvasErrorOccurred(error: Error): void {
            dispatch(canvasErrorOccurred(error));
        },
        // 开始问题报告流程
        onStartIssue(position: number[]): void {
            dispatch(reviewActions.startIssue(position));
        },
        // 更新正在编辑的对象
        onUpdateEditedObject(editedState: ObjectState | null): void {
            dispatch(updateEditedStateAsync(editedState));
        },
    };
}

type Props = StateToProps & DispatchToProps;

/**
 * 画布包装器组件
 * 
 * 该组件作为React和cvat-canvas之间的桥梁，负责：
 * 1. 将React的props传递给画布实例
 * 2. 处理画布事件并转换为Redux操作
 * 3. 管理画布的生命周期（初始化、更新、销毁）
 * 4. 提供画布配置和状态管理
 * 
 * 继承自React.PureComponent以优化性能，避免不必要的重新渲染
 */
class CanvasWrapperComponent extends React.PureComponent<Props> {
    /**
     * 防抖处理的画布更新方法
     * 使用250毫秒的延迟和立即执行选项，避免频繁更新画布导致的性能问题
     * 在用户快速操作（如缩放、平移）时，只执行最后一次更新请求
     */
    private debouncedUpdate = debounce(this.updateCanvas.bind(this), 250, { leading: true });
    
    /**
     * 画布提示组件的引用
     * 用于访问和控制CanvasTipsComponent实例，显示操作提示和帮助信息
     */
    private canvasTipsRef = React.createRef<CanvasTipsComponent>();

    /**
     * React组件生命周期方法：组件挂载后执行
     * 初始化画布实例，配置画布属性，并设置初始状态
     * 
     * @returns {void}
     */
    public componentDidMount(): void {
        // 从props中解构出画布配置所需的参数
        const {
            automaticBordering,
            adaptiveZoom,
            intelligentPolygonCrop,
            showObjectsTextAlways,
            workspace,
            showProjections,
            selectedOpacity,
            opacity,
            smoothImage,
            textFontSize,
            controlPointsSize,
            textPosition,
            textContent,
            colorBy,
            outlined,
            outlineColor,
            showGroundTruth,
            resetZoom,
        } = this.props;
        // 获取画布实例
        const { canvasInstance } = this.props as { canvasInstance: Canvas };

        // 获取画布容器元素并添加画布HTML元素
        // 注意：从React的角度来看，这不是最佳实践，但cvat-canvas返回的是常规DOM元素
        // 因此需要直接操作DOM来将画布添加到容器中
        const [wrapper] = window.document.getElementsByClassName('cvat-canvas-container');
        wrapper.appendChild(canvasInstance.html());

        // 配置画布实例的各种属性和行为
        canvasInstance.configure({
            // 根据工作空间类型决定是否强制禁用编辑功能（审核模式下禁用）
            forceDisableEditing: workspace === Workspace.REVIEW,
            // 设置未定义属性值的显示文本
            undefinedAttrValue: config.UNDEFINED_ATTRIBUTE_VALUE,
            // 控制是否始终显示对象文本
            displayAllText: showObjectsTextAlways,
            // 启用自动边界功能
            autoborders: automaticBordering,
            // 启用自适应缩放功能
            adaptiveZoom,
            // 显示投影
            showProjections,
            // 显示真实标注与预测标注之间的冲突
            showConflicts: showGroundTruth,
            // 启用智能多边形裁剪功能
            intelligentPolygonCrop,
            // 设置选中图形的不透明度
            selectedShapeOpacity: selectedOpacity,
            // 设置控制点的大小
            controlPointsSize,
            // 设置图形的不透明度
            shapeOpacity: opacity,
            // 启用图像平滑处理
            smoothImage,
            // 设置图形颜色的依据（如按类别、按ID等）
            colorBy,
            // 设置轮廓边框颜色，如果未启用轮廓则为false
            outlinedBorders: outlined ? outlineColor || 'black' : false,
            // 设置文本字体大小
            textFontSize,
            // 设置文本位置
            textPosition,
            // 设置文本内容格式
            textContent,
            // 设置重置缩放行为
            resetZoom,
        });

        // 执行初始设置（网格、事件监听器等）
        this.initialSetup();
        // 更新画布内容（加载图像、标记等）
        this.updateCanvas();
    }

    /**
     * React组件生命周期方法：组件更新后执行
     * 检测props变化并相应地更新画布配置、显示状态和交互行为
     * @param prevProps 组件更新前的props对象
     * @returns void
     */
    public componentDidUpdate(prevProps: Props): void {
        // 从当前props中解构所需的属性
        const {
            opacity,                    // 对象透明度
            selectedOpacity,            // 选中对象透明度
            outlined,                   // 是否显示轮廓
            outlineColor,               // 轮廓颜色
            showBitmap,                 // 是否显示位图
            frameData,                  // 当前帧数据
            frameAngle,                 // 帧旋转角度
            annotations,                // 标注数据
            activatedStateID,           // 激活的状态ID
            curZLayer,                  // 当前Z轴层级
            resetZoom,                  // 是否重置缩放
            smoothImage,                // 是否平滑图像
            grid,                       // 是否显示网格
            gridSize,                   // 网格大小
            gridOpacity,                // 网格透明度
            gridColor,                  // 网格颜色
            brightnessLevel,            // 亮度级别
            contrastLevel,              // 对比度级别
            saturationLevel,            // 饱和度级别
            workspace,                  // 工作空间类型
            showObjectsTextAlways,      // 是否始终显示对象文本
            textFontSize,               // 文本字体大小
            controlPointsSize,          // 控制点大小
            textPosition,               // 文本位置
            textContent,                // 文本内容
            showAllInterpolationTracks, // 是否显示所有插值轨迹
            automaticBordering,         // 是否自动边框
            adaptiveZoom,               // 是否自适应缩放
            intelligentPolygonCrop,     // 是否智能多边形裁剪
            showProjections,            // 是否显示投影
            colorBy,                    // 颜色分组依据
            onFetchAnnotation,          // 获取标注的回调函数
            showGroundTruth,            // 是否显示真实数据
            highlightedConflict,        // 高亮冲突
            imageFilters,               // 图像滤镜
        } = this.props;
        // 获取画布实例
        const { canvasInstance } = this.props as { canvasInstance: Canvas };

        // 检查显示和样式相关属性的变化，更新画布配置
        if (
            prevProps.showObjectsTextAlways !== showObjectsTextAlways ||
            prevProps.automaticBordering !== automaticBordering ||
            prevProps.adaptiveZoom !== adaptiveZoom ||
            prevProps.showProjections !== showProjections ||
            prevProps.intelligentPolygonCrop !== intelligentPolygonCrop ||
            prevProps.opacity !== opacity ||
            prevProps.selectedOpacity !== selectedOpacity ||
            prevProps.smoothImage !== smoothImage ||
            prevProps.textFontSize !== textFontSize ||
            prevProps.controlPointsSize !== controlPointsSize ||
            prevProps.textPosition !== textPosition ||
            prevProps.textContent !== textContent ||
            prevProps.colorBy !== colorBy ||
            prevProps.outlineColor !== outlineColor ||
            prevProps.outlined !== outlined ||
            prevProps.showGroundTruth !== showGroundTruth ||
            prevProps.resetZoom !== resetZoom
        ) {
            // 配置画布的各种显示和行为选项
            canvasInstance.configure({
                undefinedAttrValue: config.UNDEFINED_ATTRIBUTE_VALUE,
                displayAllText: showObjectsTextAlways,
                autoborders: automaticBordering,
                adaptiveZoom,
                showProjections,
                intelligentPolygonCrop,
                selectedShapeOpacity: selectedOpacity,
                shapeOpacity: opacity,
                smoothImage,
                colorBy,
                outlinedBorders: outlined ? outlineColor || 'black' : false,
                textFontSize,
                controlPointsSize,
                textPosition,
                textContent,
                showConflicts: showGroundTruth,
                resetZoom,
            });
        }

        // 当插值轨迹显示状态改变时，重新获取标注数据
        if (prevProps.showAllInterpolationTracks !== showAllInterpolationTracks) {
            onFetchAnnotation();
        }

        // 当激活状态ID变化时，取消当前激活状态
        if (prevProps.activatedStateID !== null && prevProps.activatedStateID !== activatedStateID) {
            canvasInstance.activate(null);
        }

        // 处理高亮冲突的变化
        if (prevProps.highlightedConflict !== highlightedConflict) {
            // 获取冲突严重程度
            const severity: HighlightSeverity | undefined = highlightedConflict
                ?.severity as unknown as HighlightSeverity;

            // 从冲突中找出对应的标注对象
            const highlightedObjects = (highlightedConflict?.annotationConflicts || [])
                .map((conflict: AnnotationConflict) => annotations
                    .find((state) => state.serverID === conflict.serverID && state.objectType === conflict.type),
                ).filter((state: ObjectState | undefined) => !!state) as ObjectState[];
            // 获取高亮对象的元素ID列表
            const highlightedClientIDs = highlightedObjects.map((state) => state?.clientID) as number[];

            // 检查是否有标签类型的高亮对象
            const highlightedTags = highlightedObjects.some((state) => state?.objectType === ObjectType.TAG);
            if (highlightedTags && prevProps.highlightedConflict) {
                // 如果是标签类型且有之前的冲突，取消高亮
                canvasInstance.highlight([], null);
            } else if (!highlightedTags) {
                // 如果不是标签类型，高亮相关对象
                canvasInstance.highlight(highlightedClientIDs, severity || null);
            }
        }

        // 当网格大小变化时，更新网格尺寸
        if (gridSize !== prevProps.gridSize) {
            canvasInstance.grid(gridSize, gridSize);
        }

        // 当网格显示相关属性变化时，更新网格样式
        if (gridOpacity !== prevProps.gridOpacity || gridColor !== prevProps.gridColor || grid !== prevProps.grid) {
            // 获取网格元素和网格模式元素
            const gridElement = window.document.getElementById('cvat_canvas_grid');
            const gridPattern = window.document.getElementById('cvat_canvas_grid_pattern');
            if (gridElement) {
                // 控制网格显示/隐藏
                gridElement.style.display = grid ? 'block' : 'none';
            }
            if (gridPattern) {
                // 更新网格颜色和透明度
                gridPattern.style.stroke = gridColor.toLowerCase();
                gridPattern.style.opacity = `${gridOpacity}`;
            }
        }

        // 当图像调整参数变化时，更新CSS滤镜
        if (
            brightnessLevel !== prevProps.brightnessLevel ||
            contrastLevel !== prevProps.contrastLevel ||
            saturationLevel !== prevProps.saturationLevel
        ) {
            canvasInstance.configure({
                CSSImageFilter:
                    `brightness(${brightnessLevel}) contrast(${contrastLevel}) saturate(${saturationLevel})`,
            });
        }

        // 当图像滤镜变化时，强制更新帧
        if (prevProps.imageFilters !== imageFilters) {
            canvasInstance.configure({ forceFrameUpdate: true });
        }

        // 当标注、帧数据或Z轴层级变化时，更新画布内容
        if (
            prevProps.annotations !== annotations ||
            prevProps.frameData !== frameData ||
            prevProps.curZLayer !== curZLayer
        ) {
            this.updateCanvas();
        } else if (prevProps.imageFilters !== imageFilters) {
            // 如果只是图像滤镜变化，使用防抖更新画布
            // 这样可以使UI更流畅，避免频繁更新
            this.debouncedUpdate();
        }

        // 当位图显示状态变化时，更新位图显示
        if (prevProps.showBitmap !== showBitmap) {
            canvasInstance.bitmap(showBitmap);
        }

        // 当帧角度变化时，旋转画布
        if (prevProps.frameAngle !== frameAngle) {
            canvasInstance.rotate(frameAngle);
            if (prevProps.frameData === frameData) {
                // 如果是同一帧的旋转（不是新帧），调整画布适应
                canvasInstance.fit();
            }
        }

        // 当工作空间类型变化时，更新编辑权限
        if (prevProps.workspace !== workspace) {
            if (workspace === Workspace.REVIEW) {
                // 如果切换到审查工作空间，禁用编辑功能
                canvasInstance.configure({
                    forceDisableEditing: true,
                });
            } else if (prevProps.workspace === Workspace.REVIEW) {
                // 如果从审查工作空间切换出来，启用编辑功能
                canvasInstance.configure({
                    forceDisableEditing: false,
                });
            }
        }

        // 激活画布上的当前状态
        this.activateOnCanvas();
    }

    /**
     * React组件生命周期方法：组件卸载前执行
     * 清理所有事件监听器，防止内存泄漏
     * @returns void
     */
    public componentWillUnmount(): void {
        // 获取画布实例
        const { canvasInstance } = this.props as { canvasInstance: Canvas };

        // 移除基础鼠标事件监听器
        canvasInstance.html().removeEventListener('mousedown', this.onCanvasMouseDown);
        canvasInstance.html().removeEventListener('click', this.onCanvasClicked);
        
        // 移除编辑相关事件监听器
        canvasInstance.html().removeEventListener('canvas.editstart', this.onCanvasEditStart);
        canvasInstance.html().removeEventListener('canvas.edited', this.onCanvasEditDone);
        canvasInstance.html().removeEventListener('canvas.sliced', this.onCanvasSliceDone);
        
        // 移除拖拽相关事件监听器
        canvasInstance.html().removeEventListener('canvas.dragstart', this.onCanvasDragStart);
        canvasInstance.html().removeEventListener('canvas.dragstop', this.onCanvasDragDone);
        
        // 移除缩放相关事件监听器
        canvasInstance.html().removeEventListener('canvas.zoomstart', this.onCanvasZoomStart);
        canvasInstance.html().removeEventListener('canvas.zoomstop', this.onCanvasZoomDone);

        // 移除画布状态和操作事件监听器
        canvasInstance.html().removeEventListener('canvas.setup', this.onCanvasSetup);
        canvasInstance.html().removeEventListener('canvas.canceled', this.onCanvasCancel);
        canvasInstance.html().removeEventListener('canvas.find', this.onCanvasFindObject);
        canvasInstance.html().removeEventListener('canvas.deactivated', this.onCanvasShapeDeactivated);
        canvasInstance.html().removeEventListener('canvas.moved', this.onCanvasCursorMoved);

        // 移除视图和变换相关事件监听器
        canvasInstance.html().removeEventListener('canvas.zoom', this.onCanvasZoomChanged);
        canvasInstance.html().removeEventListener('canvas.fit', this.onCanvasImageFitted);
        
        // 移除图形操作相关事件监听器
        canvasInstance.html().removeEventListener('canvas.dragshape', this.onCanvasShapeDragged as EventListener);
        canvasInstance.html().removeEventListener('canvas.resizeshape', this.onCanvasShapeResized as EventListener);
        canvasInstance.html().removeEventListener('canvas.clicked', this.onCanvasShapeClicked);
        canvasInstance.html().removeEventListener('canvas.drawn', this.onCanvasShapeDrawn);
        
        // 移除对象组合和操作相关事件监听器
        canvasInstance.html().removeEventListener('canvas.merged', this.onCanvasObjectsMerged);
        canvasInstance.html().removeEventListener('canvas.grouped', this.onCanvasObjectsGrouped);
        canvasInstance.html().removeEventListener('canvas.joined', this.onCanvasObjectsJoined);
        canvasInstance.html().removeEventListener('canvas.regionselected', this.onCanvasPositionSelected);
        canvasInstance.html().removeEventListener('canvas.splitted', this.onCanvasTrackSplitted);

        // 移除错误和消息相关事件监听器
        canvasInstance.html().removeEventListener('canvas.error', this.onCanvasErrorOccurrence);
        canvasInstance.html().removeEventListener('canvas.message', this.onCanvasMessage as EventListener);
    }

    /**
     * 处理画布错误事件
     * 根据错误域类型调用不同的错误处理方法
     * @param event - 包含错误详情的事件对象
     */
    private onCanvasErrorOccurrence = (event: any): void => {
        const { exception, domain } = event.detail;
        // 数据获取错误处理
        if (domain === 'data fetching') {
            const { onGetDataFailed } = this.props;
            onGetDataFailed(exception);
        } else {
            // 其他画布错误处理
            const { onCanvasErrorOccurred } = this.props;
            onCanvasErrorOccurred(exception);
        }
    };

    /**
     * 处理画布消息事件
     * 更新画布提示组件显示的消息和主题
     * @param event - 包含提示消息和主题的自定义事件
     */
    private onCanvasMessage = (event: CustomEvent<{ messages: CanvasHint[] | null, topic: string }>): void => {
        const { messages, topic } = event.detail;
        // 更新画布提示组件的消息内容
        this.canvasTipsRef.current?.update(messages, topic);
    };

    /**
     * 处理画布图形绘制完成事件
     * 创建新的标注对象或更新现有对象
     * @param event - 包含图形状态和绘制详情的事件对象
     */
    private onCanvasShapeDrawn = (event: any): void => {
        const {
            jobInstance, activeLabelID, activeObjectType, frame, updateActiveControl, onCreateAnnotations,
            onUpdateEditedObject, activeObjectHidden, workspace,
        } = this.props;

        // 如果不是连续绘制，切换回光标控制模式
        if (!event.detail.continue) {
            updateActiveControl(ActiveControl.CURSOR);
        }

        const { state, duration } = event.detail;
        // 判断是否是从头开始绘制的新图形
        const isDrawnFromScratch = !state.label;

        // 设置对象类型：如果是掩码类型则设置为图形，否则使用当前激活的对象类型
        state.objectType = state.shapeType === ShapeType.MASK ?
            ObjectType.SHAPE : state.objectType ?? activeObjectType;
        // 设置标签：优先使用图形自带的标签，否则根据激活的标签ID查找对应标签
        state.label = state.label || jobInstance.labels.filter((label: any) => label.id === activeLabelID)[0];
        // 设置帧号
        state.frame = frame;
        // 设置旋转角度，默认为0
        state.rotation = state.rotation || 0;
        // 设置遮挡状态，默认为false
        state.occluded = state.occluded || false;
        // 设置外部状态，默认为false
        state.outside = state.outside || false;
        // 设置隐藏状态，根据激活对象隐藏状态和工作空间类型决定
        state.hidden = state.hidden || (activeObjectHidden && workspace !== Workspace.SINGLE_SHAPE);
        
        // 如果是骨架类型，需要处理每个子元素
        if (state.shapeType === ShapeType.SKELETON && Array.isArray(state.elements)) {
            state.elements.forEach((element: Record<string, any>) => {
                element.objectType = state.objectType;
                // 设置子元素标签，优先使用自带标签，否则从骨架结构中查找对应子标签
                element.label = element.label || state.label.structure
                    .sublabels.find((label: any) => label.id === element.labelID);
                element.frame = state.frame;
                element.rotation = 0;
                element.occluded = element.occluded || false;
                element.outside = element.outside || false;
            });
        }

        // 记录操作日志
        if (isDrawnFromScratch) {
            jobInstance.logger.log(EventScope.drawObject, { count: 1, duration });
        } else {
            jobInstance.logger.log(EventScope.pasteObject, { count: 1, duration });
        }

        // 创建对象状态实例并触发标注创建
        const objectState = new cvat.classes.ObjectState(state);
        onCreateAnnotations([objectState]);
        // 清除编辑状态
        onUpdateEditedObject(null);
    };

    /**
     * 处理画布对象合并事件
     * 将多个对象合并为一个对象
     * @param event - 包含合并对象状态和耗时的事件对象
     */
    private onCanvasObjectsMerged = (event: any): void => {
        const {
            jobInstance, onMergeAnnotations, updateActiveControl,
        } = this.props;

        // 切换回光标控制模式
        updateActiveControl(ActiveControl.CURSOR);
        const { states, duration } = event.detail;
        // 记录合并操作日志
        jobInstance.logger.log(EventScope.mergeObjects, {
            duration,
            count: states.length,
        });
        // 触发标注合并操作
        onMergeAnnotations(states);
    };

    /**
     * 处理画布对象分组事件
     * 将多个对象组合成一个组
     * @param event - 包含分组对象状态和耗时的事件对象
     */
    private onCanvasObjectsGrouped = (event: any): void => {
        const {
            jobInstance, onGroupAnnotations, updateActiveControl,
        } = this.props;

        // 切换回光标控制模式
        updateActiveControl(ActiveControl.CURSOR);
        const { states, duration } = event.detail;
        // 记录分组操作日志
        jobInstance.logger.log(EventScope.groupObjects, {
            duration,
            count: states.length,
        });
        // 触发标注分组操作
        onGroupAnnotations(states);
    };

    /**
     * 处理画布对象连接事件
     * 将多个对象连接成一个对象
     * @param event - 包含连接对象状态、连接点和耗时的事件对象
     */
    private onCanvasObjectsJoined = (event: any): void => {
        const {
            jobInstance, onJoinAnnotations, updateActiveControl,
        } = this.props;

        // 切换回光标控制模式
        updateActiveControl(ActiveControl.CURSOR);
        const { states, points, duration } = event.detail;
        // 记录连接操作日志
        jobInstance.logger.log(EventScope.joinObjects, {
            duration,
            count: states.length,
        });
        // 触发标注连接操作
        onJoinAnnotations(states, points);
    };

    /**
     * 处理画布轨迹分割事件
     * 将一个轨迹分割成多个轨迹
     * @param event - 包含分割后状态和耗时的事件对象
     */
    private onCanvasTrackSplitted = (event: any): void => {
        const {
            jobInstance, onSplitAnnotations, updateActiveControl,
        } = this.props;

        // 切换回光标控制模式
        updateActiveControl(ActiveControl.CURSOR);
        const { state, duration } = event.detail;
        // 记录分割操作日志
        jobInstance.logger.log(EventScope.splitObjects, {
            duration,
            count: 1,
        });
        // 触发标注分割操作
        onSplitAnnotations(state);
    };

    /**
     * 处理画布位置选择事件
     * 用于创建问题报告时选择位置
     * @param event - 包含选中点坐标的事件对象
     */
    private onCanvasPositionSelected = (event: any): void => {
        const { onStartIssue } = this.props;
        const { points } = event.detail;
        // 触发问题报告创建流程，传入选中的位置点
        onStartIssue(points);
    };

    /**
     * 处理画布鼠标按下事件
     * 在点击空白区域时取消对象激活状态
     * @param e - 鼠标事件对象
     */
    private onCanvasMouseDown = (e: MouseEvent): void => {
        const { workspace, activatedStateID, onActivateObject } = this.props;

        // 如果点击的是SVG元素且不是右键点击
        if ((e.target as HTMLElement).tagName === 'svg' && e.button !== 2) {
            // 如果当前有激活的对象且工作空间不是属性编辑模式
            if (activatedStateID !== null && workspace !== Workspace.ATTRIBUTES) {
                // 取消对象激活状态
                onActivateObject(null, null);
            }
        }
    };

    /**
     * 处理画布点击事件
     * 当点击画布区域时，如果焦点不在画布内，则取消当前焦点元素的焦点状态
     */
    private onCanvasClicked = (): void => {
        const { canvasInstance } = this.props as { canvasInstance: Canvas };
        // 检查当前焦点元素是否在画布内，如果不在且是HTML元素，则取消其焦点
        if (!canvasInstance.html().contains(document.activeElement) && document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
    };

    /**
     * 处理画布图形拖拽事件
     * 记录图形拖拽操作的日志信息
     * @param e - 包含拖拽持续时间和图形状态的自定义事件
     */
    private onCanvasShapeDragged = (e: CustomEvent<{ duration: number; state: ObjectState }>): void => {
        const { jobInstance } = this.props;
        const { detail: { duration, state: { serverID } } } = e;
        // 记录拖拽对象操作日志，包含持续时间和对象ID（如果有）
        jobInstance.logger.log(
            EventScope.dragObject,
            { duration, ...(serverID ? { obj_id: serverID } : {}) },
        );
    };

    /**
     * 处理画布图形调整大小事件
     * 记录图形调整大小操作的日志信息
     * @param e - 包含调整持续时间和图形状态的自定义事件
     */
    private onCanvasShapeResized = (e: CustomEvent<{ duration: number; state: ObjectState }>): void => {
        const { jobInstance } = this.props;
        const { detail: { duration, state: { serverID } } } = e;

        // 记录调整对象大小操作日志，包含持续时间和对象ID（如果有）
        jobInstance.logger.log(
            EventScope.resizeObject,
            { duration, ...(serverID ? { obj_id: serverID } : {}) },
        );
    };

    /**
     * 处理画布图像适配事件
     * 记录图像适配操作的日志信息
     */
    private onCanvasImageFitted = (): void => {
        const { jobInstance } = this.props;
        // 记录图像适配操作日志
        jobInstance.logger.log(EventScope.fitImage);
    };

    /**
     * 处理画布缩放变化事件
     * 记录图像缩放操作的日志信息
     */
    private onCanvasZoomChanged = (): void => {
        const { jobInstance } = this.props;
        // 记录图像缩放操作日志
        jobInstance.logger.log(EventScope.zoomImage);
    };

    /**
     * 处理画布图形点击事件
     * 当点击图形时，自动滚动侧边栏中对应的图形项到视图可见区域
     * @param e - 包含被点击图形状态信息的事件对象
     */
    private onCanvasShapeClicked = (e: any): void => {
        const { clientID, parentID } = e.detail.state;
        let sidebarItem = null;
        // 根据是否有父ID确定侧边栏元素的ID格式
        if (Number.isInteger(parentID)) {
            // 子元素项
            sidebarItem = window.document.getElementById(`cvat-objects-sidebar-state-item-element-${clientID}`);
        } else {
            // 主对象项
            sidebarItem = window.document.getElementById(`cvat-objects-sidebar-state-item-${clientID}`);
        }

        // 如果找到对应的侧边栏项，则滚动到视图可见区域
        if (sidebarItem) {
            sidebarItem.scrollIntoView();
        }
    };

    /**
     * 处理画布图形取消激活事件
     * 当图形被取消激活时，更新组件状态
     * @param e - 包含取消激活图形状态信息的事件对象
     */
    private onCanvasShapeDeactivated = (e: any): void => {
        const { onActivateObject, activatedStateID } = this.props;
        const { state } = e.detail;

        // 当我们激活一个元素时，画布会取消激活前一个元素并触发此事件
        // 在这种情况下，我们不需要更新状态
        if (state.clientID === activatedStateID) {
            onActivateObject(null, null);
        }
    };

    /**
     * 处理画布光标移动事件
     * 根据光标位置自动选择和激活图形
     * @param event - 包含光标位置和状态信息的事件对象
     */
    private onCanvasCursorMoved = async (event: any): Promise<void> => {
        const {
            jobInstance, activatedStateID, activatedElementID, workspace, onActivateObject,
        } = this.props;

        // 只在标准、审查或单一图形工作空间中处理此事件
        if (![Workspace.STANDARD, Workspace.REVIEW, Workspace.SINGLE_SHAPE].includes(workspace)) {
            return;
        }

        // 根据光标位置选择最近的图形
        const result = await jobInstance.annotations.select(event.detail.states, event.detail.x, event.detail.y);
        if (result && result.state) {
            // 对于多段线和点类型，需要检查距离是否在阈值内
            if ([ShapeType.POLYLINE, ShapeType.POINTS].includes(result.state.shapeType)) {
                if (result.distance > MAX_DISTANCE_TO_OPEN_SHAPE) {
                    return;
                }
            }

            // 获取新激活的元素ID
            const newActivatedElement = event.detail.activatedElementID || null;
            // 如果激活状态发生变化，则更新激活对象
            if (activatedStateID !== result.state.clientID || activatedElementID !== newActivatedElement) {
                onActivateObject(result.state.clientID, event.detail.activatedElementID || null);
            }
        }
    };

    /**
     * 处理画布编辑开始事件
     * 开始编辑图形时，切换到编辑模式并设置编辑对象
     * @param event - 包含编辑状态信息的事件对象
     */
    private onCanvasEditStart = (event: any): void => {
        const { updateActiveControl, onUpdateEditedObject } = this.props;
        // 切换到编辑控制模式
        updateActiveControl(ActiveControl.EDIT);
        // 设置当前编辑的对象状态
        onUpdateEditedObject(event.detail.state);
    };

    /**
     * 处理画布编辑完成事件
     * 完成编辑图形时，更新图形状态并退出编辑模式
     * @param event - 包含编辑结果信息的事件对象
     */
    private onCanvasEditDone = (event: any): void => {
        const {
            activeControl, onUpdateAnnotations, updateActiveControl, onUpdateEditedObject,
        } = this.props;
        const { state, points, rotation } = event.detail;
        // 根据编辑类型更新图形状态：旋转或点位置
        if (state.rotation !== rotation) {
            state.rotation = rotation;
        } else {
            state.points = points;
        }

        // 如果当前不是光标模式，则切换回光标模式
        if (activeControl !== ActiveControl.CURSOR) {
            // 如果只是简单的调整大小/拖拽等操作，不需要重置和取消激活
            updateActiveControl(ActiveControl.CURSOR);
        }
        // 更新标注状态
        onUpdateAnnotations([state]);
        // 清除编辑状态
        onUpdateEditedObject(null);
    };

    /**
     * 处理画布切片完成事件
     * 完成图形切片操作时，记录日志并更新标注
     * @param event - 包含切片结果信息的事件对象
     */
    private onCanvasSliceDone = (event: any): void => {
        const { jobInstance, updateActiveControl, onSliceAnnotations } = this.props;
        const { state, results, duration } = event.detail;
        // 切换回光标控制模式
        updateActiveControl(ActiveControl.CURSOR);
        // 记录切片操作日志
        jobInstance.logger.log(EventScope.sliceObject, {
            count: 1,
            duration,
        });
        // 更新切片标注
        onSliceAnnotations(state, results);
    };
    
    /**
     * 处理画布拖拽开始事件
     * 开始拖拽画布时，切换到拖拽模式
     */
    private onCanvasDragStart = (): void => {
        const { updateActiveControl } = this.props;
        // 切换到画布拖拽控制模式
        updateActiveControl(ActiveControl.DRAG_CANVAS);
    };

    /**
     * 处理画布拖拽完成事件
     * 完成拖拽画布时，切换回光标模式
     */
    private onCanvasDragDone = (): void => {
        const { updateActiveControl } = this.props;
        // 切换回光标控制模式
        updateActiveControl(ActiveControl.CURSOR);
    };

    /**
     * 处理画布缩放开始事件
     * 开始缩放画布时，切换到缩放模式
     */
    private onCanvasZoomStart = (): void => {
        const { updateActiveControl } = this.props;
        // 切换到画布缩放控制模式
        updateActiveControl(ActiveControl.ZOOM_CANVAS);
    };

    /**
     * 处理画布缩放完成事件
     * 完成缩放画布时，切换回光标模式
     */
    private onCanvasZoomDone = (): void => {
        const { updateActiveControl } = this.props;
        // 切换回光标控制模式
        updateActiveControl(ActiveControl.CURSOR);
    };

    /**
     * 处理画布设置完成事件
     * 画布初始化完成后，触发设置回调并激活画布
     */
    private onCanvasSetup = (): void => {
        const { onSetupCanvas } = this.props;
        // 触发画布设置回调
        onSetupCanvas();
        // 激活画布上的对象
        this.activateOnCanvas();
    };

    /**
     * 处理画布取消事件
     * 取消当前操作时，重置画布状态并清除编辑对象
     */
    private onCanvasCancel = (): void => {
        const { onResetCanvas, onUpdateEditedObject } = this.props;
        // 重置画布状态
        onResetCanvas();
        // 清除编辑对象
        onUpdateEditedObject(null);
    };

    /**
     * 处理画布查找对象事件
     * 根据点击位置查找并选中对应的图形
     * @param e - 包含查找位置信息的事件对象
     */
    private onCanvasFindObject = async (e: any): Promise<void> => {
        const { jobInstance } = this.props;
        const { canvasInstance } = this.props as { canvasInstance: Canvas };

        // 根据点击位置选择最近的图形
        const result = await jobInstance.annotations.select(e.detail.states, e.detail.x, e.detail.y);

        if (result && result.state) {
            // 对于多段线和点类型，需要检查距离是否在阈值内
            if (['polyline', 'points'].includes(result.state.shapeType)) {
                if (result.distance > MAX_DISTANCE_TO_OPEN_SHAPE) {
                    return;
                }
            }

            // 选中找到的图形
            canvasInstance.select(result.state);
        }
    };

    /**
     * 激活画布上的对象
     * 根据当前激活状态，在画布上激活相应的对象或元素
     */
    private activateOnCanvas(): void {
        const {
            activatedStateID,
            activatedAttributeID,
            aamZoomMargin,
            workspace,
            annotations,
        } = this.props;
        const { canvasInstance } = this.props as { canvasInstance: Canvas };

        // 如果有激活的对象ID
        if (activatedStateID !== null) {
            // 从标注列表中查找激活的对象状态
            const [activatedState] = annotations.filter((state: any): boolean => state.clientID === activatedStateID);
            // 在属性编辑工作空间中，需要特殊处理
            if (activatedState && workspace === Workspace.ATTRIBUTES) {
                // 对于非标签类型，聚焦到对象
                if (activatedState.objectType !== ObjectType.TAG) {
                    canvasInstance.focus(activatedStateID, aamZoomMargin);
                } else {
                    // 对于标签类型，适配整个画布
                    canvasInstance.fit();
                }
            }
            // 对于非标签类型，激活对象及其属性
            if (activatedState && activatedState.objectType !== ObjectType.TAG) {
                canvasInstance.activate(activatedStateID, activatedAttributeID);
            }
        } else if (workspace === Workspace.ATTRIBUTES) {
            // 如果没有激活对象但在属性编辑工作空间，则适配整个画布
            canvasInstance.fit();
        }
    }

    /**
     * 更新画布内容
     * 处理帧数据、标记过滤、图像滤镜应用，并更新画布实例
     * 
     * @returns {void}
     */
    private updateCanvas(): void {
        // 从props中解构出画布更新所需的数据
        const {
            curZLayer, annotations, frameData,
            workspace, frame, imageFilters,
        } = this.props;

        // 获取画布实例
        const { canvasInstance } = this.props as { canvasInstance: Canvas };
        
        // 确保帧数据和画布实例都存在
        if (frameData !== null && canvasInstance) {
            // 过滤标记数据，排除标签类型的对象，只保留当前帧和工作空间相关的标记
            const filteredAnnotations = filterAnnotations(annotations, {
                frame,
                workspace,
                exclude: [ObjectType.TAG],
            });
            
            // 创建帧数据的代理对象，用于拦截和处理图像数据获取
            const proxy = new Proxy(frameData, {
                get: (_frameData, prop, receiver) => {
                    // 拦截对'data'属性的访问，用于应用图像滤镜
                    if (prop === 'data') {
                        return async (...args: any[]) => {
                            // 获取原始图像数据
                            const originalImage = await _frameData.data(...args);
                            
                            // 检查是否有滤镜需要应用到当前帧
                            const imageIsNotProcessed = imageFilters.some((imageFilter: ImageFilter) => (
                                imageFilter.modifier.currentProcessedImage !== frame
                            ));

                            // 如果有滤镜需要应用
                            if (imageIsNotProcessed) {
                                try {
                                    // 从原始图像中提取渲染尺寸和图像位图
                                    const { renderWidth, renderHeight, imageData: imageBitmap } = originalImage;

                                    // 创建离屏画布用于图像处理
                                    const offscreen = new OffscreenCanvas(renderWidth, renderHeight);
                                    const ctx = offscreen.getContext('2d') as OffscreenCanvasRenderingContext2D;
                                    
                                    // 将原始图像绘制到离屏画布
                                    ctx.drawImage(imageBitmap, 0, 0);
                                    // 获取图像数据
                                    const imageData = ctx.getImageData(0, 0, renderWidth, renderHeight);

                                    // 应用所有图像滤镜
                                    const newImageData = imageFilters
                                        .reduce((oldImageData, activeImageModifier) => activeImageModifier
                                            .modifier.processImage(oldImageData, frame), imageData);
                                    
                                    // 从处理后的图像数据创建新的图像位图
                                    const newImageBitmap = await createImageBitmap(newImageData);
                                    return {
                                        renderWidth,
                                        renderHeight,
                                        imageData: newImageBitmap,
                                    };
                                } catch (error: any) {
                                    // 如果图像处理出错，显示错误通知
                                    notification.error({
                                        description: error.toString(),
                                        message: 'Image processing error occurred',
                                        className: 'cvat-notification-notice-image-processing-error',
                                    });
                                }
                            }

                            // 如果没有滤镜需要应用，返回原始图像
                            return originalImage;
                        };
                    }
                    // 对于其他属性，使用默认行为
                    return Reflect.get(_frameData, prop, receiver);
                },
            });
            
            // 设置画布实例，传入代理后的帧数据、过滤后的标记和当前Z层
            canvasInstance.setup(
                proxy,
                frameData.deleted ? [] : filteredAnnotations,
                curZLayer,
            );
            
            // 配置画布，强制不更新帧（因为我们刚刚手动更新了）
            canvasInstance.configure({ forceFrameUpdate: false });
        }
    }

    /**
     * 初始化画布设置
     * 配置画布的基本属性，包括网格、图像滤镜、事件监听器等
     * 
     * @returns {void}
     */
    private initialSetup(): void {
        // 从props中解构出网格和图像调整相关的配置参数
        const {
            grid,
            gridSize,
            gridColor,
            gridOpacity,
            brightnessLevel,
            contrastLevel,
            saturationLevel,
        } = this.props;
        const { canvasInstance } = this.props as { canvasInstance: Canvas };

        // 配置网格显示
        // 获取网格元素和网格模式元素
        const gridElement = window.document.getElementById('cvat_canvas_grid');
        const gridPattern = window.document.getElementById('cvat_canvas_grid_pattern');
        // 根据grid配置显示或隐藏网格
        if (gridElement) {
            gridElement.style.display = grid ? 'block' : 'none';
        }
        // 设置网格的颜色和透明度
        if (gridPattern) {
            gridPattern.style.stroke = gridColor.toLowerCase();
            gridPattern.style.opacity = `${gridOpacity}`;
        }
        // 设置网格的大小
        canvasInstance.grid(gridSize, gridSize);

        // 配置图像滤镜效果
        // 设置亮度、对比度和饱和度
        canvasInstance.configure({
            CSSImageFilter:
                `brightness(${brightnessLevel}) contrast(${contrastLevel}) saturate(${saturationLevel})`,
        });

        // 调整画布大小以适应容器
        canvasInstance.fitCanvas();
        
        // 监听画布设置完成事件，确保在画布设置完成后激活指定的状态和属性
        canvasInstance.html().addEventListener(
            'canvas.setup',
            () => {
                const { activatedStateID, activatedAttributeID } = this.props;
                canvasInstance.activate(activatedStateID, activatedAttributeID);
            },
            { once: true }, // 使用once选项确保事件监听器只触发一次
        );

        // 添加鼠标事件监听器
        canvasInstance.html().addEventListener('mousedown', this.onCanvasMouseDown);
        canvasInstance.html().addEventListener('click', this.onCanvasClicked);
        
        // 添加画布编辑相关事件监听器
        canvasInstance.html().addEventListener('canvas.editstart', this.onCanvasEditStart);
        canvasInstance.html().addEventListener('canvas.edited', this.onCanvasEditDone);
        canvasInstance.html().addEventListener('canvas.sliced', this.onCanvasSliceDone);
        
        // 添加画布拖拽相关事件监听器
        canvasInstance.html().addEventListener('canvas.dragstart', this.onCanvasDragStart);
        canvasInstance.html().addEventListener('canvas.dragstop', this.onCanvasDragDone);
        
        // 添加画布缩放相关事件监听器
        canvasInstance.html().addEventListener('canvas.zoomstart', this.onCanvasZoomStart);
        canvasInstance.html().addEventListener('canvas.zoomstop', this.onCanvasZoomDone);

        // 添加画布状态变化相关事件监听器
        canvasInstance.html().addEventListener('canvas.setup', this.onCanvasSetup);
        canvasInstance.html().addEventListener('canvas.canceled', this.onCanvasCancel);
        canvasInstance.html().addEventListener('canvas.find', this.onCanvasFindObject);
        canvasInstance.html().addEventListener('canvas.deactivated', this.onCanvasShapeDeactivated);
        canvasInstance.html().addEventListener('canvas.moved', this.onCanvasCursorMoved);

        // 添加画布视图变化相关事件监听器
        canvasInstance.html().addEventListener('canvas.zoom', this.onCanvasZoomChanged);
        canvasInstance.html().addEventListener('canvas.fit', this.onCanvasImageFitted);

        // 添加图形操作相关事件监听器
        canvasInstance.html().addEventListener('canvas.dragshape', this.onCanvasShapeDragged as EventListener);
        canvasInstance.html().addEventListener('canvas.resizeshape', this.onCanvasShapeResized as EventListener);
        canvasInstance.html().addEventListener('canvas.clicked', this.onCanvasShapeClicked);
        canvasInstance.html().addEventListener('canvas.drawn', this.onCanvasShapeDrawn);

        // 添加对象组合和操作相关事件监听器
        canvasInstance.html().addEventListener('canvas.merged', this.onCanvasObjectsMerged);
        canvasInstance.html().addEventListener('canvas.grouped', this.onCanvasObjectsGrouped);
        canvasInstance.html().addEventListener('canvas.joined', this.onCanvasObjectsJoined);
        canvasInstance.html().addEventListener('canvas.regionselected', this.onCanvasPositionSelected);
        canvasInstance.html().addEventListener('canvas.splitted', this.onCanvasTrackSplitted);

        // 添加画布错误和消息相关事件监听器
        canvasInstance.html().addEventListener('canvas.error', this.onCanvasErrorOccurrence);
        canvasInstance.html().addEventListener('canvas.message', this.onCanvasMessage as EventListener);
    }

    /**
     * React组件渲染方法
     * 渲染画布包装器的完整UI结构，包括全局热键绑定、加载状态、画布容器、图像设置和Z轴控制等
     * @returns {JSX.Element} 画布包装器的JSX元素
     */
    public render(): JSX.Element {
        // 从props中解构所需的属性和回调函数
        const {
            maxZLayer,           // Z轴最大层级
            curZLayer,           // 当前Z轴层级
            minZLayer,           // Z轴最小层级
            keyMap,              // 键盘映射配置
            switchableAutomaticBordering, // 是否可切换自动边框
            automaticBordering,  // 当前自动边框状态
            showTagsOnFrame,     // 是否在帧上显示标签
            canvasIsReady,       // 画布是否准备就绪
            onSwitchAutomaticBordering, // 切换自动边框的回调
            onSwitchZLayer,      // 切换Z轴层级的回调
            onAddZLayer,         // 添加新Z轴层级的回调
        } = this.props;

        // 阻止事件默认行为的辅助函数
        const preventDefault = (event: KeyboardEvent | undefined): void => {
            if (event) {
                event.preventDefault();
            }
        };

        // 定义键盘快捷键处理器
        const handlers: Record<keyof typeof componentShortcuts, (event?: KeyboardEvent) => void> = {
            // 切换自动边框的处理器
            SWITCH_AUTOMATIC_BORDERING: (event: KeyboardEvent | undefined) => {
                // 只有在允许切换自动边框时才响应
                if (switchableAutomaticBordering) {
                    preventDefault(event);
                    // 切换自动边框状态
                    onSwitchAutomaticBordering(!automaticBordering);
                }
            },
        };

        return (
            <>
                {/* 全局热键绑定组件，用于处理键盘快捷键 */}
                <GlobalHotKeys keyMap={subKeyMap(componentShortcuts, keyMap)} handlers={handlers} />
                
                {/* 画布提示组件，用于显示操作提示和帮助信息 */}
                <CanvasTipsComponent ref={this.canvasTipsRef} />
                
                {/* 画布未准备就绪时显示加载动画 */}
                {
                    !canvasIsReady && (
                        <div className='cvat-spinner-container'>
                            <Spin className='cvat-spinner' />
                        </div>
                    )
                }

                {
                    // 画布容器元素
                    // 这个元素没有任何props，所以React不会重新渲染它
                    // 这就是为什么在mount函数中追加cvat-canvas能够工作的原因
                }
                <div
                    className='cvat-canvas-container'
                    style={{
                        overflow: 'hidden',
                        width: '100%',
                        height: '100%',
                    }}
                />

                {/* 图像设置弹出框，点击触发 */}
                <Popover
                    destroyTooltipOnHide
                    trigger='click'
                    placement='top'
                    overlayInnerStyle={{ padding: 0 }}
                    content={<ImageSetupsContent />}
                >
                    <UpOutlined className='cvat-canvas-image-setups-trigger' />
                </Popover>

                {/* Z轴控制区域，包含滑块和添加按钮 */}
                <div className='cvat-canvas-z-axis-wrapper'>
                    {/* Z轴层级滑块，用于在不同层级间切换 */}
                    <Slider
                        disabled={minZLayer === maxZLayer} // 当只有一个层级时禁用
                        min={minZLayer}
                        max={maxZLayer}
                        value={curZLayer}
                        vertical
                        reverse
                        defaultValue={0}
                        onChange={(value: number): void => onSwitchZLayer(value as number)}
                    />
                    {/* 添加新Z轴层级的按钮 */}
                    <CVATTooltip title={`Add new layer ${maxZLayer + 1} and switch to it`}>
                        <PlusCircleOutlined onClick={onAddZLayer} />
                    </CVATTooltip>
                </div>

                {/* 条件渲染：当需要在帧上显示标签时显示FrameTags组件 */}
                {showTagsOnFrame ? (
                    <div className='cvat-canvas-frame-tags'>
                        <FrameTags />
                    </div>
                ) : null}
            </>
        );
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(CanvasWrapperComponent);
