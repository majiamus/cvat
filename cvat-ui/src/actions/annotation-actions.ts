// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { AnyAction, Store } from 'redux';
import { ThunkAction, ThunkDispatch } from 'utils/redux';
import isAbleToChangeFrame from 'utils/is-able-to-change-frame';
import { CanvasMode as Canvas3DMode } from 'cvat-canvas3d-wrapper';
import {
    RectDrawingMethod, CuboidDrawingMethod, Canvas, CanvasMode as Canvas2DMode,
} from 'cvat-canvas-wrapper';
import {
    getCore, MLModel, JobType, Job, QualityConflict,
    ObjectState, ObjectType, ShapeType, JobState, JobValidationLayout,
} from 'cvat-core-wrapper';
import logger, { EventScope } from 'cvat-logger';
import { getCVATStore } from 'cvat-store';

import {
    ActiveControl,
    CombinedState,
    ContextMenuType,
    FrameSpeed,
    NavigationType,
    OpenCVTool,
    Rotation,
    Workspace,
} from 'reducers';
import { switchToolsBlockerState } from './settings-actions';

interface AnnotationsParameters {
    filters: object[];
    frame: number;
    showAllInterpolationTracks: boolean;
    showGroundTruth: boolean;
    jobInstance: Job;
    groundTruthInstance: Job | null;
    validationLayout: JobValidationLayout | null;
}

const cvat = getCore();
let store: null | Store<CombinedState> = null;

function getStore(): Store<CombinedState> {
    if (store === null) {
        store = getCVATStore();
    }
    return store;
}

export function receiveAnnotationsParameters(): AnnotationsParameters {
    const state: CombinedState = getStore().getState();
    const {
        annotation: {
            annotations: { filters },
            player: {
                frame: { number: frame },
            },
            job: { instance: jobInstance, groundTruthInfo: { groundTruthInstance, validationLayout } },
        },
        settings: {
            workspace: { showAllInterpolationTracks },
            shapes: { showGroundTruth },
        },
    } = state;

    return {
        filters,
        frame,
        jobInstance: jobInstance as Job,
        groundTruthInstance,
        validationLayout,
        showAllInterpolationTracks,
        showGroundTruth,
    };
}

/**
 * 计算标注对象的Z轴范围
 * 从所有标注对象中找出最小和最大的Z轴顺序值，用于确定Z轴范围
 * 
 * @param {any[]} states - 标注对象状态数组
 * @returns {number[]} 返回包含最小Z值和最大Z值的数组[minZ, maxZ]
 */
export function computeZRange(states: any[]): number[] {
    // 过滤掉标签类型的对象，因为它们没有Z轴顺序
    const filteredStates = states.filter((state: any): any => state.objectType !== ObjectType.TAG);
    // 初始化最小和最大Z值，如果过滤后的列表为空则使用0
    let minZ = filteredStates.length ? filteredStates[0].zOrder : 0;
    let maxZ = filteredStates.length ? filteredStates[0].zOrder : 0;
    // 遍历所有过滤后的状态，找出最小和最大Z值
    filteredStates.forEach((state: any): void => {
        minZ = Math.min(minZ, state.zOrder);
        maxZ = Math.max(maxZ, state.zOrder);
    });

    // 返回计算出的Z轴范围
    return [minZ, maxZ];
}

export enum AnnotationActionTypes {
    GET_JOB = 'GET_JOB',
    GET_JOB_SUCCESS = 'GET_JOB_SUCCESS',
    GET_JOB_FAILED = 'GET_JOB_FAILED',
    UPDATE_CURRENT_JOB_FAILED = 'UPDATE_CURRENT_JOB_FAILED',
    CLOSE_JOB = 'CLOSE_JOB',
    CHANGE_FRAME = 'CHANGE_FRAME',
    CHANGE_FRAME_SUCCESS = 'CHANGE_FRAME_SUCCESS',
    CHANGE_FRAME_FAILED = 'CHANGE_FRAME_FAILED',
    SAVE_ANNOTATIONS = 'SAVE_ANNOTATIONS',
    SAVE_ANNOTATIONS_SUCCESS = 'SAVE_ANNOTATIONS_SUCCESS',
    SAVE_ANNOTATIONS_FAILED = 'SAVE_ANNOTATIONS_FAILED',
    SWITCH_PLAY = 'SWITCH_PLAY',
    CONFIRM_CANVAS_READY = 'CONFIRM_CANVAS_READY',

    UPDATE_ACTIVE_CONTROL = 'UPDATE_ACTIVE_CONTROL',

    COPY_SHAPE = 'COPY_SHAPE',
    PASTE_SHAPE = 'PASTE_SHAPE',
    REPEAT_DRAW_SHAPE = 'REPEAT_DRAW_SHAPE',
    RESET_CANVAS = 'RESET_CANVAS',
    REMEMBER_OBJECT = 'REMEMBER_OBJECT',
    UPDATE_ANNOTATIONS_SUCCESS = 'UPDATE_ANNOTATIONS_SUCCESS',
    UPDATE_ANNOTATIONS_FAILED = 'UPDATE_ANNOTATIONS_FAILED',
    CREATE_ANNOTATIONS_FAILED = 'CREATE_ANNOTATIONS_FAILED',
    MERGE_ANNOTATIONS_FAILED = 'MERGE_ANNOTATIONS_FAILED',
    RESET_ANNOTATIONS_GROUP = 'RESET_ANNOTATIONS_GROUP',
    GROUP_ANNOTATIONS = 'GROUP_ANNOTATIONS',
    GROUP_ANNOTATIONS_FAILED = 'GROUP_ANNOTATIONS_FAILED',
    JOIN_ANNOTATIONS_FAILED = 'JOIN_ANNOTATIONS_FAILED',
    SLICE_ANNOTATIONS_FAILED = 'SLICE_ANNOTATIONS_FAILED',
    SPLIT_ANNOTATIONS_FAILED = 'SPLIT_ANNOTATIONS_FAILED',
    COLLAPSE_SIDEBAR = 'COLLAPSE_SIDEBAR',
    COLLAPSE_APPEARANCE = 'COLLAPSE_APPEARANCE',
    COLLAPSE_OBJECT_ITEMS = 'COLLAPSE_OBJECT_ITEMS',
    ACTIVATE_OBJECT = 'ACTIVATE_OBJECT',
    UPDATE_EDITED_STATE = 'UPDATE_EDITED_STATE',
    HIDE_ACTIVE_OBJECT = 'HIDE_ACTIVE_OBJECT',
    REMOVE_OBJECT = 'REMOVE_OBJECT',
    REMOVE_OBJECT_SUCCESS = 'REMOVE_OBJECT_SUCCESS',
    REMOVE_OBJECT_FAILED = 'REMOVE_OBJECT_FAILED',
    PROPAGATE_OBJECT_SUCCESS = 'PROPAGATE_OBJECT_SUCCESS',
    PROPAGATE_OBJECT_FAILED = 'PROPAGATE_OBJECT_FAILED',
    SWITCH_PROPAGATE_VISIBILITY = 'SWITCH_PROPAGATE_VISIBILITY',
    SWITCH_SHOWING_STATISTICS = 'SWITCH_SHOWING_STATISTICS',
    SWITCH_SHOWING_FILTERS = 'SWITCH_SHOWING_FILTERS',
    COLLECT_STATISTICS = 'COLLECT_STATISTICS',
    COLLECT_STATISTICS_SUCCESS = 'COLLECT_STATISTICS_SUCCESS',
    COLLECT_STATISTICS_FAILED = 'COLLECT_STATISTICS_FAILED',
    UPLOAD_JOB_ANNOTATIONS = 'UPLOAD_JOB_ANNOTATIONS',
    UPLOAD_JOB_ANNOTATIONS_SUCCESS = 'UPLOAD_JOB_ANNOTATIONS_SUCCESS',
    UPLOAD_JOB_ANNOTATIONS_FAILED = 'UPLOAD_JOB_ANNOTATIONS_FAILED',
    REMOVE_JOB_ANNOTATIONS_SUCCESS = 'REMOVE_JOB_ANNOTATIONS_SUCCESS',
    REMOVE_JOB_ANNOTATIONS_FAILED = 'REMOVE_JOB_ANNOTATIONS_FAILED',
    UPDATE_CANVAS_CONTEXT_MENU = 'UPDATE_CANVAS_CONTEXT_MENU',
    UNDO_ACTION_FAILED = 'UNDO_ACTION_FAILED',
    REDO_ACTION_FAILED = 'REDO_ACTION_FAILED',
    CHANGE_ANNOTATIONS_FILTERS = 'CHANGE_ANNOTATIONS_FILTERS',
    CHANGE_SHOW_SEARCH_FRAMES_MODAL = 'CHANGE_SHOW_SEARCH_FRAMES_MODAL',
    FETCH_ANNOTATIONS_SUCCESS = 'FETCH_ANNOTATIONS_SUCCESS',
    FETCH_ANNOTATIONS_FAILED = 'FETCH_ANNOTATIONS_FAILED',
    ROTATE_FRAME = 'ROTATE_FRAME',
    SWITCH_Z_LAYER = 'SWITCH_Z_LAYER',
    ADD_Z_LAYER = 'ADD_Z_LAYER',
    SEARCH_ANNOTATIONS_FAILED = 'SEARCH_ANNOTATIONS_FAILED',
    CHANGE_WORKSPACE = 'CHANGE_WORKSPACE',
    SAVE_LOGS_SUCCESS = 'SAVE_LOGS_SUCCESS',
    SAVE_LOGS_FAILED = 'SAVE_LOGS_FAILED',
    INTERACT_WITH_CANVAS = 'INTERACT_WITH_CANVAS',
    GET_DATA_FAILED = 'GET_DATA_FAILED',
    CANVAS_ERROR_OCCURRED = 'CANVAS_ERROR_OCCURRED',
    SET_FORCE_EXIT_ANNOTATION_PAGE_FLAG = 'SET_FORCE_EXIT_ANNOTATION_PAGE_FLAG',
    SWITCH_NAVIGATION_BLOCKED = 'SWITCH_NAVIGATION_BLOCKED',
    SET_NAVIGATION_TYPE = 'SET_NAVIGATION_TYPE',
    DELETE_FRAME = 'DELETE_FRAME',
    DELETE_FRAME_SUCCESS = 'DELETE_FRAME_SUCCESS',
    DELETE_FRAME_FAILED = 'DELETE_FRAME_FAILED',
    RESTORE_FRAME = 'RESTORE_FRAME',
    RESTORE_FRAME_SUCCESS = 'RESTORE_FRAME_SUCCESS',
    RESTORE_FRAME_FAILED = 'RESTORE_FRAME_FAILED',
    UPDATE_BRUSH_TOOLS_CONFIG = 'UPDATE_BRUSH_TOOLS_CONFIG',
    HIGHLIGHT_CONFLICT = 'HIGHLIGHT_CONFCLICT',
}

export function saveLogsAsync(): ThunkAction {
    return async (dispatch: ThunkDispatch) => {
        try {
            await logger.save();
            dispatch({
                type: AnnotationActionTypes.SAVE_LOGS_SUCCESS,
                payload: {},
            });
        } catch (error) {
            dispatch({
                type: AnnotationActionTypes.SAVE_LOGS_FAILED,
                payload: {
                    error,
                },
            });
        }
    };
}

export function changeWorkspace(workspace: Workspace): AnyAction {
    return {
        type: AnnotationActionTypes.CHANGE_WORKSPACE,
        payload: {
            workspace,
        },
    };
}

export function getDataFailed(error: Error): AnyAction {
    return {
        type: AnnotationActionTypes.GET_DATA_FAILED,
        payload: {
            error,
        },
    };
}

export function canvasErrorOccurred(error: Error): AnyAction {
    return {
        type: AnnotationActionTypes.CANVAS_ERROR_OCCURRED,
        payload: {
            error,
        },
    };
}

export function addZLayer(): AnyAction {
    return {
        type: AnnotationActionTypes.ADD_Z_LAYER,
        payload: {},
    };
}

export function switchZLayer(cur: number): AnyAction {
    return {
        type: AnnotationActionTypes.SWITCH_Z_LAYER,
        payload: {
            cur,
        },
    };
}

export function highlightConflict(conflict: QualityConflict | null): AnyAction {
    return {
        type: AnnotationActionTypes.HIGHLIGHT_CONFLICT,
        payload: {
            conflict,
        },
    };
}

function wrapAnnotationsInGTJob(states: ObjectState[]): ObjectState[] {
    return states.map((state: ObjectState) => new Proxy(state, {
        get(_state, prop) {
            if (prop === 'isGroundTruth') {
                // ground truth objects are not considered as gt objects, relatively to a gt jobs
                // to avoid extra css styles, or restrictions applied
                return false;
            }

            return Reflect.get(_state, prop);
        },
    }));
}

async function fetchAnnotations(predefinedFrame?: number): Promise<{
    states: CombinedState['annotation']['annotations']['states'];
    history: CombinedState['annotation']['annotations']['history'];
    minZ: number;
    maxZ: number;
}> {
    const {
        filters, frame, showAllInterpolationTracks, jobInstance,
        showGroundTruth, groundTruthInstance, validationLayout,
    } = receiveAnnotationsParameters();

    const fetchFrame = typeof predefinedFrame === 'undefined' ? frame : predefinedFrame;
    let states = await jobInstance.annotations.get(fetchFrame, showAllInterpolationTracks, filters);
    const [minZ, maxZ] = computeZRange(states);

    if (jobInstance.type === JobType.GROUND_TRUTH) {
        states = wrapAnnotationsInGTJob(states);
    } else if (showGroundTruth && groundTruthInstance) {
        let gtFrame: number | null = fetchFrame;

        if (validationLayout) {
            gtFrame = await validationLayout.getRealFrame(gtFrame);
        }

        if (gtFrame !== null) {
            const gtStates = await groundTruthInstance.annotations.get(gtFrame, showAllInterpolationTracks, filters);
            states.push(...gtStates);
        }
    }

    const history = await jobInstance.actions.get();

    return {
        states,
        history,
        minZ,
        maxZ,
    };
}

/**
 * 异步获取标注数据的action
 * 用于从服务器获取当前任务的所有标注数据，包括状态、历史记录和Z轴范围
 * 
 * @returns {ThunkAction} 返回一个Redux Thunk action，处理异步获取标注数据的流程
 */
export function fetchAnnotationsAsync(): ThunkAction {
    return async (dispatch: ThunkDispatch): Promise<void> => {
        try {
            // 从服务器获取标注数据，包括状态、历史记录和Z轴范围
            const {
                states, history, minZ, maxZ,
            } = await fetchAnnotations();

            // 分发成功获取标注数据的action，更新Redux状态
            dispatch({
                type: AnnotationActionTypes.FETCH_ANNOTATIONS_SUCCESS,
                payload: {
                    states,
                    history,
                    minZ,
                    maxZ,
                },
            });
        } catch (error) {
            // 如果获取失败，分发失败action并传递错误信息
            dispatch({
                type: AnnotationActionTypes.FETCH_ANNOTATIONS_FAILED,
                payload: {
                    error,
                },
            });
        }
    };
}

export function changeAnnotationsFilters(filters: object[]): AnyAction {
    return {
        type: AnnotationActionTypes.CHANGE_ANNOTATIONS_FILTERS,
        payload: { filters },
    };
}

export function updateCanvasContextMenu(
    visible: boolean,
    left: number,
    top: number,
    pointID: number | null = null,
    type?: ContextMenuType,
): AnyAction {
    return {
        type: AnnotationActionTypes.UPDATE_CANVAS_CONTEXT_MENU,
        payload: {
            visible,
            left,
            top,
            type,
            pointID,
        },
    };
}

export function updateCanvasBrushTools(config: {
    visible?: boolean, left?: number, top?: number
}): AnyAction {
    return {
        type: AnnotationActionTypes.UPDATE_BRUSH_TOOLS_CONFIG,
        payload: config,
    };
}

export function removeAnnotationsAsync(
    startFrame: number, stopFrame: number, delTrackKeyframesOnly: boolean,
): ThunkAction {
    return async (dispatch: ThunkDispatch, getState: () => CombinedState): Promise<void> => {
        try {
            const { jobInstance } = receiveAnnotationsParameters();
            await jobInstance.annotations.clear({
                reload: false,
                startFrame,
                stopFrame,
                delTrackKeyframesOnly,
            });
            await jobInstance.actions.clear();
            dispatch(fetchAnnotationsAsync());

            const state = getState();
            if (!state.annotation.job.groundTruthInfo.groundTruthInstance) {
                getCore().config.globalObjectsCounter = 0;
            }

            dispatch({
                type: AnnotationActionTypes.REMOVE_JOB_ANNOTATIONS_SUCCESS,
                payload: {},
            });
        } catch (error) {
            dispatch({
                type: AnnotationActionTypes.REMOVE_JOB_ANNOTATIONS_FAILED,
                payload: {
                    error,
                },
            });
        }
    };
}

export function collectStatisticsAsync(sessionInstance: NonNullable<CombinedState['annotation']['job']['instance']>): ThunkAction {
    return async (dispatch: ThunkDispatch): Promise<void> => {
        try {
            dispatch({
                type: AnnotationActionTypes.COLLECT_STATISTICS,
                payload: {},
            });

            const data = await sessionInstance.annotations.statistics();

            dispatch({
                type: AnnotationActionTypes.COLLECT_STATISTICS_SUCCESS,
                payload: {
                    data,
                },
            });
        } catch (error) {
            dispatch({
                type: AnnotationActionTypes.COLLECT_STATISTICS_FAILED,
                payload: {
                    error,
                },
            });
        }
    };
}

export function showStatistics(visible: boolean): AnyAction {
    return {
        type: AnnotationActionTypes.SWITCH_SHOWING_STATISTICS,
        payload: {
            visible,
        },
    };
}
export function showFilters(visible: boolean): AnyAction {
    return {
        type: AnnotationActionTypes.SWITCH_SHOWING_FILTERS,
        payload: {
            visible,
        },
    };
}

export function switchPropagateVisibility(visible: boolean): AnyAction {
    return {
        type: AnnotationActionTypes.SWITCH_PROPAGATE_VISIBILITY,
        payload: { visible },
    };
}

export function propagateObjectAsync(from: number, to: number): ThunkAction {
    return async (dispatch: ThunkDispatch, getState): Promise<void> => {
        const state = getState();
        const {
            job: {
                instance: sessionInstance,
                frameNumbers,
            },
            annotations: {
                activatedStateID,
                states: objectStates,
            },
        } = state.annotation;

        try {
            const objectState = objectStates.find((_state: any) => _state.clientID === activatedStateID);
            if (!objectState) {
                throw new Error('There is not an activated object state to be propagated');
            }

            if (!sessionInstance) {
                throw new Error('SessionInstance is not defined, propagation is not possible');
            }

            const states = cvat.utils.propagateShapes<ObjectState>([objectState], from, to, frameNumbers);
            if (states.length) {
                await sessionInstance.logger.log(EventScope.propagateObject, { count: states.length });
                await sessionInstance.annotations.put(states);
            }

            const history = await sessionInstance.actions.get();
            dispatch({
                type: AnnotationActionTypes.PROPAGATE_OBJECT_SUCCESS,
                payload: { history },
            });
        } catch (error) {
            dispatch({
                type: AnnotationActionTypes.PROPAGATE_OBJECT_FAILED,
                payload: { error },
            });
        }
    };
}

/**
 * 异步删除对象的Thunk Action
 * 处理对象删除的完整流程，包括日志记录、状态删除、历史记录更新和Redux状态管理
 * 
 * @param {ObjectState} objectState - 要删除的对象状态实例
 * @param {boolean} force - 是否强制删除（忽略锁定状态）
 * @returns {ThunkAction} Redux Thunk Action
 * @private
 */
export function removeObjectAsync(objectState: ObjectState, force: boolean): ThunkAction {
    return async (dispatch: ThunkDispatch): Promise<void> => {
        try {
            // 获取当前注释参数（帧号和作业实例）
            const { frame, jobInstance } = receiveAnnotationsParameters();
            
            // 记录删除对象的操作日志
            await jobInstance.logger.log(EventScope.deleteObject, { count: 1 });

            // 执行对象删除操作，返回删除结果
            const removed = await objectState.delete(frame, force);
            
            // 获取操作历史记录用于撤销/重做功能
            const history = await jobInstance.actions.get();

            if (removed) {
                // 删除成功，分发成功action更新Redux状态
                dispatch({
                    type: AnnotationActionTypes.REMOVE_OBJECT_SUCCESS,
                    payload: {
                        objectState,
                        history,
                    },
                });
            } else {
                // 删除失败（对象可能被锁定），抛出错误
                throw new Error('Could not remove the locked object');
            }
        } catch (error) {
            // 处理删除过程中的任何错误
            dispatch({
                type: AnnotationActionTypes.REMOVE_OBJECT_FAILED,
                payload: {
                    error,
                },
            });
        }
    };
}

/**
 * 创建删除对象的Action
 * 用于触发对象删除流程的初始Action
 * 
 * @param {any} objectState - 要删除的对象状态
 * @param {boolean} force - 是否强制删除
 * @returns {AnyAction} Redux Action对象
 * @private
 */
export function removeObject(objectState: any, force: boolean): AnyAction {
    return {
        type: AnnotationActionTypes.REMOVE_OBJECT,
        payload: {
            objectState,
            force,
        },
    };
}

/**
 * 复制形状的Action创建器
 * 记录复制操作日志并创建复制Action
 * 
 * @param {any} objectState - 要复制的对象状态
 * @returns {AnyAction} Redux Action对象
 * @private
 */
export function copyShape(objectState: any): AnyAction {
    // 获取当前作业实例
    const job = getStore().getState().annotation.job.instance;
    
    // 记录复制对象的操作日志
    job?.logger.log(EventScope.copyObject, { count: 1 });

    // 返回复制Action
    return {
        type: AnnotationActionTypes.COPY_SHAPE,
        payload: {
            objectState,
        },
    };
}

/**
 * 创建一个激活标注对象的action
 * 用于在标注界面中激活特定的对象、元素或属性，以便进行编辑或查看
 * 
 * @param activatedStateID 要激活的对象状态ID，null表示不激活任何对象
 * @param activatedElementID 要激活的元素ID，null表示不激活任何元素
 * @param activatedAttributeID 要激活的属性ID，null表示不激活任何属性
 * @returns 返回一个Redux action对象，包含激活对象的相关信息
 */
export function activateObject(
    activatedStateID: number | null,
    activatedElementID: number | null,
    activatedAttributeID: number | null,
): AnyAction {
    // 返回一个Redux action，类型为ACTIVATE_OBJECT
    return {
        type: AnnotationActionTypes.ACTIVATE_OBJECT,
        // 载荷包含要激活的对象ID、元素ID和属性ID
        payload: {
            activatedStateID,
            activatedElementID,
            activatedAttributeID,
        },
    };
}

export function collapseSidebar(): AnyAction {
    return {
        type: AnnotationActionTypes.COLLAPSE_SIDEBAR,
        payload: {},
    };
}

export function collapseAppearance(): AnyAction {
    return {
        type: AnnotationActionTypes.COLLAPSE_APPEARANCE,
        payload: {},
    };
}

export function collapseObjectItems(states: any[], collapsed: boolean): AnyAction {
    return {
        type: AnnotationActionTypes.COLLAPSE_OBJECT_ITEMS,
        payload: {
            states,
            collapsed,
        },
    };
}

export function switchPlay(playing: boolean): AnyAction {
    return {
        type: AnnotationActionTypes.SWITCH_PLAY,
        payload: {
            playing,
        },
    };
}

export function switchShowSearchFramesModal(visible: boolean): AnyAction {
    return {
        type: AnnotationActionTypes.CHANGE_SHOW_SEARCH_FRAMES_MODAL,
        payload: {
            visible,
        },
    };
}

function confirmCanvasReady(ranges?: string): AnyAction {
    return {
        type: AnnotationActionTypes.CONFIRM_CANVAS_READY,
        payload: { ranges },
    };
}

/**
 * 异步确认画布准备就绪状态
 * 获取已缓存的帧数据块，计算连续的帧范围，并通知画布已准备就绪
 * 
 * @returns {ThunkAction} 返回一个Redux Thunk action，用于异步处理画布准备状态
 */
export function confirmCanvasReadyAsync(): ThunkAction {
    return async (dispatch: ThunkDispatch, getState: () => CombinedState): Promise<void> => {
        try {
            // 获取当前应用状态
            const state: CombinedState = getState();
            // 获取当前任务实例
            const job = state.annotation.job.instance as Job;
            // 获取任务包含的帧号列表
            const includedFrames = state.annotation.job.frameNumbers;
            // 获取帧变更事件对象
            const { changeFrameEvent } = state.annotation.player.frame;
            // 获取已缓存的帧数据块
            const chunks = await job.frames.cachedChunks() as number[];
            // 获取任务总帧数和数据块大小
            const { frameCount, dataChunkSize } = job;

            // 将数据块转换为帧范围，并合并连续的范围
            const ranges = chunks.map((chunk) => (
                [
                    // 计算当前块的起始帧
                    includedFrames[chunk * dataChunkSize],
                    // 计算当前块的结束帧，确保不超过总帧数
                    includedFrames[Math.min(frameCount - 1, (chunk + 1) * dataChunkSize - 1)],
                ]
            )).reduce<Array<[number, number]>>((acc, val) => {
                // 如果当前范围与上一个范围连续，则合并它们
                if (acc.length && acc[acc.length - 1][1] + 1 === val[0]) {
                    const newMax = val[1];
                    acc[acc.length - 1][1] = newMax;
                } else {
                    // 否则添加新范围
                    acc.push(val as [number, number]);
                }
                return acc;
            }, []).map(([start, end]) => `${start}:${end}`).join(';'); // 将范围数组转换为字符串格式

            // 分发画布准备就绪的action，传递计算出的帧范围
            dispatch(confirmCanvasReady(ranges));
            // 关闭帧变更事件
            await changeFrameEvent?.close();
        } catch (error) {
            // 即使发生错误，也不需要通知用户，直接分发不带范围的准备就绪action
            // even if error happens here, do not need to notify the users
            dispatch(confirmCanvasReady());
        }
    };
}

/**
 * 异步切换到指定帧的Redux action
 * @param {number} toFrame - 目标帧号
 * @param {boolean} [fillBuffer] - 是否填充帧缓冲区（可选）
 * @param {number} [frameStep] - 帧步长（可选）
 * @param {boolean} [forceUpdate] - 是否强制更新，即使帧号相同（可选）
 * @returns {ThunkAction} Redux Thunk action
 * 
 * 该函数是CVAT中帧切换的核心异步action，负责：
 * 1. 验证目标帧的有效性和切换条件
 * 2. 获取新帧的数据（图像、文件名等）
 * 3. 获取新帧的标注状态和历史记录
 * 4. 计算帧切换的延迟时间（考虑播放速度）
 * 5. 记录帧切换事件到日志
 * 6. 分发成功或失败的action
 * 
 * 切换条件检查包括：
 * - 目标帧是否在作业范围内
 * - 画布是否处于可切换状态
 * - 是否有弹窗（统计、传播）阻止切换
 * 
 * 错误处理：
 * - 帧范围错误：抛出异常
 * - 其他错误：分发失败action（过滤掉'not needed'错误）
 */
export function changeFrameAsync(
    toFrame: number,
    fillBuffer?: boolean,
    frameStep?: number,
    forceUpdate?: boolean,
): ThunkAction {
    return async (dispatch: ThunkDispatch, getState: () => CombinedState): Promise<void> => {
        // 获取作业实例和当前帧号
        const { jobInstance: job, frame } = receiveAnnotationsParameters();
        
        // 获取Redux全局状态
        const state: CombinedState = getState();
        
        // 解构获取可能影响切换的UI状态
        const {
            propagate: {
                visible: propagateVisible,  // 传播弹窗是否显示
            },
            statistics: {
                visible: statisticsVisible, // 统计弹窗是否显示
            },
        } = state.annotation;

        try {
            // 验证目标帧是否在作业有效范围内
            if (toFrame < job.startFrame || toFrame > job.stopFrame) {
                throw Error(`Required frame ${toFrame} is out of the current job`);
            }

            // 如果目标帧与当前帧相同且非强制更新，直接返回
            if (toFrame === frame && !forceUpdate) {
                return;
            }

            // 检查切换条件：画布状态、弹窗状态
            // 如果有统计或传播弹窗显示，阻止切换
            if (!isAbleToChangeFrame(toFrame) || statisticsVisible || propagateVisible) {
                return;
            }

            // 分发帧切换开始action，清空当前状态
            dispatch({
                type: AnnotationActionTypes.CHANGE_FRAME,
                payload: {},
            });

            // 并行获取新帧数据和记录切换事件
            const data = await job.frames.get(toFrame, fillBuffer, frameStep);

            // 记录帧切换事件到日志（异步，不阻塞主流程）
            const changeFrameEvent = await job.logger.log(EventScope.changeFrame, {
                from: frame,           // 源帧号
                to: toFrame,           // 目标帧号
                step: toFrame - frame, // 帧步长
                count: 1,              // 切换计数
            }, true);

            // 计算帧切换延迟时间（考虑播放速度设置）
            const currentTime = new Date().getTime();
            let frameSpeed;
            switch (state.settings.player.frameSpeed) {
                case FrameSpeed.Fast: {
                    frameSpeed = (FrameSpeed.Fast as number) / 2; // 快速模式减半
                    break;
                }
                case FrameSpeed.Fastest: {
                    frameSpeed = (FrameSpeed.Fastest as number) / 3; // 最快模式减为1/3
                    break;
                }
                default: {
                    frameSpeed = state.settings.player.frameSpeed as number; // 保持原速
                }
            }
            
            // 计算延迟：确保最小帧间隔时间
            const delay = Math.max(
                0,
                Math.round(1000 / frameSpeed) - currentTime + (state.annotation.player.frame.changeTime as number),
            );

            // 获取新帧的标注数据
            const {
                states,    // 标注状态列表
                maxZ,      // 最大Z轴层级
                minZ,      // 最小Z轴层级
                history,   // 历史记录
            } = await fetchAnnotations(toFrame);
            
            // 分发帧切换成功action，更新全局状态
            dispatch({
                type: AnnotationActionTypes.CHANGE_FRAME_SUCCESS,
                payload: {
                    number: toFrame,           // 新帧号
                    data,                       // 帧数据（图像、文件名等）
                    filename: data.filename,     // 文件名
                    relatedFiles: data.relatedFiles, // 相关文件
                    states,                     // 标注状态
                    history,                    // 历史记录
                    minZ,                       // 最小Z值
                    maxZ,                       // 最大Z值
                    curZ: maxZ,                 // 当前Z值（设为最大）
                    changeTime: currentTime + delay, // 切换时间戳
                    delay,                      // 延迟时间
                    changeFrameEvent,           // 切换事件
                },
            });
        } catch (error) {
            // 过滤掉'not needed'错误，其他错误分发失败action
            if (error !== 'not needed') {
                dispatch({
                    type: AnnotationActionTypes.CHANGE_FRAME_FAILED,
                    payload: {
                        number: toFrame, // 目标帧号
                        error,           // 错误信息
                    },
                });
            }
        }
    };
}

export function undoActionAsync(): ThunkAction {
    return async (dispatch: ThunkDispatch): Promise<void> => {
        try {
            const state = getStore().getState();
            const { jobInstance, frame } = receiveAnnotationsParameters();

            // TODO: use affected IDs as an optimization
            const [undo] = state.annotation.annotations.history.undo.slice(-1);
            const undoOnFrame = undo[1];
            const undoLog = await jobInstance.logger.log(
                EventScope.undoAction,
                {
                    name: undo[0],
                    frame: undo[1],
                    count: 1,
                },
                true,
            );

            await jobInstance.actions.undo();
            await undoLog.close();

            if (frame !== undoOnFrame || ['Removed frame', 'Restored frame'].includes(undo[0])) {
                // the action below fetches annotations
                dispatch(changeFrameAsync(undoOnFrame, undefined, undefined, true));
            } else {
                dispatch(fetchAnnotationsAsync());
            }
        } catch (error) {
            dispatch({
                type: AnnotationActionTypes.UNDO_ACTION_FAILED,
                payload: {
                    error,
                },
            });
        }
    };
}

export function redoActionAsync(): ThunkAction {
    return async (dispatch: ThunkDispatch): Promise<void> => {
        try {
            const state = getStore().getState();
            const { jobInstance, frame } = receiveAnnotationsParameters();

            // TODO: use affected IDs as an optimization
            const [redo] = state.annotation.annotations.history.redo.slice(-1);
            const redoOnFrame = redo[1];
            const redoLog = await jobInstance.logger.log(
                EventScope.redoAction,
                {
                    name: redo[0],
                    frame: redo[1],
                    count: 1,
                },
                true,
            );

            await jobInstance.actions.redo();
            await redoLog.close();

            if (frame !== redoOnFrame || ['Removed frame', 'Restored frame'].includes(redo[0])) {
                // the action below fetches annotations
                dispatch(changeFrameAsync(redoOnFrame, undefined, undefined, true));
            } else {
                dispatch(fetchAnnotationsAsync());
            }
        } catch (error) {
            dispatch({
                type: AnnotationActionTypes.REDO_ACTION_FAILED,
                payload: {
                    error,
                },
            });
        }
    };
}

export function rotateCurrentFrame(rotation: Rotation): AnyAction {
    const state: CombinedState = getStore().getState();
    const {
        annotation: {
            player: {
                frame: { number: frameNumber },
                frameAngles,
            },
            job: {
                instance: job,
                instance: { startFrame },
            },
        },
        settings: {
            player: { rotateAll },
        },
    } = state;

    const frameAngle = (frameAngles[frameNumber - startFrame] + (rotation === Rotation.CLOCKWISE90 ? 90 : 270)) % 360;

    job.logger.log(EventScope.rotateImage);

    return {
        type: AnnotationActionTypes.ROTATE_FRAME,
        payload: {
            offset: frameNumber - state.annotation.job.instance.startFrame,
            angle: frameAngle,
            rotateAll,
        },
    };
}

/**
 * 创建一个重置画布状态的action
 * 用于将画布恢复到初始状态，清除所有临时状态和选择
 * 
 * @returns {AnyAction} 返回一个Redux action，用于触发画布重置
 */
export function resetCanvas(): AnyAction {
    return {
        // 指定action类型为重置画布
        type: AnnotationActionTypes.RESET_CANVAS,
        // 空的payload，表示不需要传递额外数据
        payload: {},
    };
}

export function closeJob(): ThunkAction {
    return async (dispatch: ThunkDispatch, getState): Promise<void> => {
        const state = getState();
        const { instance: canvasInstance } = state.annotation.canvas;
        const { jobInstance, groundTruthInstance } = receiveAnnotationsParameters();

        if (groundTruthInstance) {
            await groundTruthInstance.close();
        }

        if (jobInstance) {
            await jobInstance.close();
        }

        if (canvasInstance) {
            canvasInstance.destroy();
        }

        dispatch({
            type: AnnotationActionTypes.CLOSE_JOB,
        });
    };
}

export function getJobAsync({
    taskID, jobID, initialFrame, initialFilters, queryParameters,
}: {
    taskID: number;
    jobID: number;
    initialFrame: number | null;
    initialFilters: object[];
    queryParameters: {
        initialOpenGuide: boolean;
        initialWorkspace: Workspace | null;
        defaultLabel: string | null;
        defaultPointsCount: number | null;
    }
}): ThunkAction {
    return async (dispatch: ThunkDispatch, getState): Promise<void> => {
        try {
            const state = getState();
            const filters = initialFilters;

            const {
                settings: {
                    player: { showDeletedFrames },
                },
            } = state;

            dispatch({
                type: AnnotationActionTypes.GET_JOB,
                payload: {
                    requestedId: jobID,
                },
            });

            if (!Number.isInteger(taskID) || !Number.isInteger(jobID)) {
                throw new Error('Requested resource id is not valid');
            }

            const start = Date.now();

            getCore().config.globalObjectsCounter = 0;
            const [job] = await cvat.jobs.get({ jobID });
            let gtJob: Job | null = null;
            if (job.type === JobType.ANNOTATION) {
                try {
                    [gtJob] = await cvat.jobs.get({ taskID, type: JobType.GROUND_TRUTH });
                } catch (e) {
                    // gtJob is not available for workers
                    // do nothing
                }
            }

            // frame query parameter does not work for GT job
            const frameNumber = Number.isInteger(initialFrame) && gtJob?.id !== job.id ?
                initialFrame as number :
                (await job.frames.search(
                    { notDeleted: !showDeletedFrames }, job.startFrame, job.stopFrame,
                )) || job.startFrame;

            const frameData = await job.frames.get(frameNumber);
            const jobMeta = await cvat.frames.getMeta('job', job.id);
            const frameNumbers = await job.frames.frameNumbers();
            try {
                // call first getting of frame data before rendering interface
                // to load and decode first chunk
                await frameData.data();
            } catch (error) {
                // do nothing, user will be notified when data request is done
            }

            await job.annotations.clear({ reload: true });

            const issues = await job.issues();
            const colors = [...cvat.enums.colors];

            let groundTruthJobFramesMeta = null;
            let validationLayout = null;
            if (gtJob) {
                await gtJob.annotations.clear({ reload: true }); // fetch gt annotations from the server
                groundTruthJobFramesMeta = await cvat.frames.getMeta('job', gtJob.id);
                validationLayout = await job.validationLayout();
            }

            let conflicts: QualityConflict[] = [];
            if (gtJob) {
                const [report] = await cvat.analytics.quality.reports({ jobID: job.id, target: 'job' });
                if (report) {
                    conflicts = await cvat.analytics.quality.conflicts({ reportID: report.id });
                }
            }

            await job.logger.log(EventScope.loadJob, { duration: Date.now() - start });

            const openTime = Date.now();
            dispatch({
                type: AnnotationActionTypes.GET_JOB_SUCCESS,
                payload: {
                    openTime,
                    job,
                    frameNumbers,
                    jobMeta,
                    queryParameters,
                    groundTruthInstance: gtJob || null,
                    groundTruthJobFramesMeta,
                    validationLayout,
                    issues,
                    conflicts,
                    frameNumber,
                    frameFilename: frameData.filename,
                    relatedFiles: frameData.relatedFiles,
                    frameData,
                    colors,
                    filters,
                },
            });

            dispatch(fetchAnnotationsAsync());
            dispatch(changeFrameAsync(frameNumber, false));
        } catch (error) {
            dispatch({
                type: AnnotationActionTypes.GET_JOB_FAILED,
                payload: {
                    error,
                },
            });
        }
    };
}

export function updateCurrentJobAsync(
    jobFieldsToUpdate: {
        state?: JobState;
    },
): ThunkAction {
    return async (dispatch: ThunkDispatch) => {
        const { jobInstance } = receiveAnnotationsParameters();
        try {
            await jobInstance.save(jobFieldsToUpdate);
        } catch (error: unknown) {
            dispatch({
                type: AnnotationActionTypes.UPDATE_CURRENT_JOB_FAILED,
                payload: { error },
            });

            throw error;
        }
    };
}

export function saveAnnotationsAsync(): ThunkAction {
    return async (dispatch: ThunkDispatch): Promise<void> => {
        const { jobInstance } = receiveAnnotationsParameters();

        dispatch({
            type: AnnotationActionTypes.SAVE_ANNOTATIONS,
            payload: {},
        });

        try {
            const saveJobEvent = await jobInstance.logger.log(EventScope.saveJob, {}, true);

            await jobInstance.frames.save();
            await jobInstance.annotations.save();
            await saveJobEvent.close();
            dispatch(saveLogsAsync());

            if (jobInstance instanceof cvat.classes.Job && jobInstance.state === cvat.enums.JobState.NEW) {
                await dispatch(updateCurrentJobAsync({ state: JobState.IN_PROGRESS }));
            }

            dispatch({
                type: AnnotationActionTypes.SAVE_ANNOTATIONS_SUCCESS,
                payload: {},
            });

            dispatch(fetchAnnotationsAsync());
        } catch (error) {
            dispatch({
                type: AnnotationActionTypes.SAVE_ANNOTATIONS_FAILED,
                payload: {
                    error,
                },
            });

            throw error;
        }
    };
}

export function finishCurrentJobAsync(onSuccess: () => void): ThunkAction {
    return async (dispatch: ThunkDispatch, getState) => {
        const state = getState();
        const beforeCallbacks = state.plugins.callbacks.annotationPage.header.menu.beforeJobFinish;
        const { jobInstance } = receiveAnnotationsParameters();

        await dispatch(saveAnnotationsAsync());

        for await (const callback of beforeCallbacks) {
            const result = await callback();
            if (result?.preventJobStatusChange) {
                return;
            }
        }

        if (jobInstance.state !== JobState.COMPLETED) {
            await dispatch(updateCurrentJobAsync({ state: JobState.COMPLETED }));
        }

        onSuccess();
    };
}

/**
 * 记录当前绘制对象的配置参数
 * 用于通过快捷键N重复最新的绘制操作（对于标签则是直接创建）
 * 
 * @param createParams - 创建参数对象，包含绘制所需的各种配置
 * @param createParams.activeObjectType - 对象类型（形状或轨迹）
 * @param createParams.activeLabelID - 标签ID
 * @param createParams.activeShapeType - 形状类型
 * @param createParams.activeNumOfPoints - 点数（用于多边形等）
 * @param createParams.activeRectDrawingMethod - 矩形绘制方法
 * @param createParams.activeCuboidDrawingMethod - 立方体绘制方法
 * @param updateCurrentControl - 是否更新当前控制状态，默认为true
 * @returns 返回一个Redux action，类型为REMEMBER_OBJECT
 */
export function rememberObject(createParams: {
    activeObjectType?: ObjectType;
    activeLabelID?: number;
    activeShapeType?: ShapeType | null;
    activeNumOfPoints?: number;
    activeRectDrawingMethod?: RectDrawingMethod;
    activeCuboidDrawingMethod?: CuboidDrawingMethod;
}, updateCurrentControl = true): AnyAction {
    // 返回一个Redux action，记录绘制对象的所有配置参数
    return {
        type: AnnotationActionTypes.REMEMBER_OBJECT,
        // 将所有创建参数和更新控制标志合并到载荷中
        payload: { ...createParams, updateCurrentControl },
    };
}

/**
 * 创建一个更新活动控制器的action
 * 用于切换画布的当前活动控制器（如选择、绘制、编辑等模式）
 * 
 * @param {ActiveControl} activeControl - 要设置的活动控制器类型
 * @returns {AnyAction} 返回一个Redux action，包含活动控制器的更新信息
 */
export function updateActiveControl(activeControl: ActiveControl): AnyAction {
    return {
        // 指定action类型为更新活动控制器
        type: AnnotationActionTypes.UPDATE_ACTIVE_CONTROL,
        // 包含活动控制器值的payload
        payload: {
            activeControl,
        },
    };
}

/**
 * 异步更新标注对象的action
 * 用于将修改后的标注对象保存到服务器，并更新本地标注数据
 * 
 * @param {any[]} statesToUpdate - 要更新的标注对象状态数组
 * @returns {ThunkAction} 返回一个Redux Thunk action，处理异步更新流程
 */
export function updateAnnotationsAsync(statesToUpdate: any[]): ThunkAction {
    return async (dispatch: ThunkDispatch): Promise<void> => {
        // 获取当前任务实例，用于与服务器交互
        const { jobInstance } = receiveAnnotationsParameters();

        try {
            // 检查是否有对象的Z轴顺序发生变化，如果有则先取消激活对象以便立即可视化变化
            if (statesToUpdate.some((state: any): boolean => state.updateFlags.zOrder)) {
                // 取消激活对象以便立即可视化变化（提升用户体验）
                dispatch(activateObject(null, null, null));
            }

            // 为每个标注对象创建保存Promise，并等待所有保存操作完成
            const promises = statesToUpdate.map((objectState: any): Promise<any> => objectState.save());
            let states = await Promise.all(promises);

            // 如果是基准真相任务，需要对标注对象进行特殊包装
            if (jobInstance.type === JobType.GROUND_TRUTH) {
                states = wrapAnnotationsInGTJob(states);
            }

            // 检查是否需要更新所有标注数据（如包含掩码类型或有关联父对象）
            const needToUpdateAll = states
                .some((state: any) => state.shapeType === ShapeType.MASK || state.parentID !== null);
            if (needToUpdateAll) {
                // 如果需要更新所有数据，则重新获取完整的标注列表
                dispatch(fetchAnnotationsAsync());
                return;
            }

            // 获取最新的操作历史记录
            const history = await jobInstance.actions.get();
            // 计算Z轴范围
            const [minZ, maxZ] = computeZRange(states);

            // 分发成功更新标注数据的action
            dispatch({
                type: AnnotationActionTypes.UPDATE_ANNOTATIONS_SUCCESS,
                payload: {
                    states,
                    history,
                    minZ,
                    maxZ,
                },
            });
        } catch (error) {
            // 如果更新失败，分发失败action并传递错误信息
            dispatch({
                type: AnnotationActionTypes.UPDATE_ANNOTATIONS_FAILED,
                payload: { error },
            });
            // 失败后重新获取最新的标注数据，确保状态一致性
            dispatch(fetchAnnotationsAsync());
        }
    };
}

/**
 * 异步创建标注对象的action
 * 用于将新的标注对象保存到服务器，并刷新本地标注数据
 * 
 * @param {any[]} statesToCreate - 要创建的标注对象状态数组
 * @returns {ThunkAction} 返回一个Redux Thunk action，处理异步创建流程
 */
export function createAnnotationsAsync(statesToCreate: any[]): ThunkAction {
    return async (dispatch: ThunkDispatch): Promise<void> => {
        try {
            // 获取当前任务实例，用于与服务器交互
            const { jobInstance } = receiveAnnotationsParameters();
            // 将标注对象状态发送到服务器进行保存
            await jobInstance.annotations.put(statesToCreate);
            // 刷新本地标注数据，获取最新的标注列表
            dispatch(fetchAnnotationsAsync());
        } catch (error) {
            // 如果创建失败，分发失败action并传递错误信息
            dispatch({
                type: AnnotationActionTypes.CREATE_ANNOTATIONS_FAILED,
                payload: {
                    error,
                },
            });
        }
    };
}

export function mergeAnnotationsAsync(statesToMerge: any[]): ThunkAction {
    return async (dispatch: ThunkDispatch): Promise<void> => {
        try {
            const { jobInstance } = receiveAnnotationsParameters();
            await jobInstance.annotations.merge(statesToMerge);
            dispatch(fetchAnnotationsAsync());
        } catch (error) {
            dispatch({
                type: AnnotationActionTypes.MERGE_ANNOTATIONS_FAILED,
                payload: {
                    error,
                },
            });
        }
    };
}

export function resetAnnotationsGroup(): AnyAction {
    return {
        type: AnnotationActionTypes.RESET_ANNOTATIONS_GROUP,
        payload: {},
    };
}

export function groupAnnotationsAsync(statesToGroup: any[]): ThunkAction {
    return async (dispatch: ThunkDispatch): Promise<void> => {
        try {
            const { jobInstance } = receiveAnnotationsParameters();
            const reset = getStore().getState().annotation.annotations.resetGroupFlag;

            // The action below set resetFlag to false
            dispatch({
                type: AnnotationActionTypes.GROUP_ANNOTATIONS,
                payload: {},
            });

            await jobInstance.annotations.group(statesToGroup, reset);
            dispatch(fetchAnnotationsAsync());
        } catch (error) {
            dispatch({
                type: AnnotationActionTypes.GROUP_ANNOTATIONS_FAILED,
                payload: {
                    error,
                },
            });
        }
    };
}

export function joinAnnotationsAsync(
    statesToJoin: CombinedState['annotation']['annotations']['states'],
    points: number[],
): ThunkAction {
    return async (dispatch: ThunkDispatch): Promise<void> => {
        try {
            const { jobInstance } = receiveAnnotationsParameters();

            await jobInstance.annotations.join(statesToJoin, points);
            dispatch(fetchAnnotationsAsync());
        } catch (error) {
            dispatch({
                type: AnnotationActionTypes.JOIN_ANNOTATIONS_FAILED,
                payload: {
                    error,
                },
            });
        }
    };
}

export function sliceAnnotationsAsync(
    state: CombinedState['annotation']['annotations']['states'][0],
    results: number[][],
): ThunkAction {
    return async (dispatch: ThunkDispatch): Promise<void> => {
        try {
            const { jobInstance } = receiveAnnotationsParameters();
            await jobInstance.annotations.slice(state, results);
            dispatch(fetchAnnotationsAsync());
        } catch (error) {
            dispatch({
                type: AnnotationActionTypes.SLICE_ANNOTATIONS_FAILED,
                payload: {
                    error,
                },
            });
        }
    };
}

export function splitAnnotationsAsync(state: CombinedState['annotation']['annotations']['states'][0]): ThunkAction {
    return async (dispatch: ThunkDispatch): Promise<void> => {
        const { jobInstance, frame } = receiveAnnotationsParameters();
        try {
            await jobInstance.annotations.split(state, frame);
            dispatch(fetchAnnotationsAsync());
        } catch (error) {
            dispatch({
                type: AnnotationActionTypes.SPLIT_ANNOTATIONS_FAILED,
                payload: {
                    error,
                },
            });
        }
    };
}

export function changeGroupColorAsync(group: number, color: string): ThunkAction {
    return async (dispatch: ThunkDispatch): Promise<void> => {
        const state: CombinedState = getStore().getState();
        const groupStates = state.annotation.annotations.states.filter(
            (_state: any): boolean => _state.group.id === group,
        );

        for (const objectState of groupStates) {
            objectState.group.color = color;
        }

        dispatch(updateAnnotationsAsync(groupStates));
    };
}

export function searchAnnotationsAsync(
    sessionInstance: NonNullable<CombinedState['annotation']['job']['instance']>,
    frameFrom: number,
    frameTo: number,
    generalFilters?: {
        isEmptyFrame: boolean;
    },
): ThunkAction {
    return async (dispatch: ThunkDispatch, getState): Promise<void> => {
        try {
            const {
                settings: {
                    player: { showDeletedFrames },
                },
                annotation: {
                    annotations: { filters },
                },
            } = getState();

            const frame = await sessionInstance.annotations
                .search(
                    frameFrom,
                    frameTo,
                    {
                        allowDeletedFrames: showDeletedFrames,
                        ...(
                            generalFilters ? { generalFilters } : { annotationsFilters: filters }
                        ),
                    },
                );
            if (frame !== null) {
                dispatch(changeFrameAsync(frame));
            }
        } catch (error) {
            dispatch({
                type: AnnotationActionTypes.SEARCH_ANNOTATIONS_FAILED,
                payload: {
                    error,
                },
            });
        }
    };
}

export const ShapeTypeToControl: Record<ShapeType, ActiveControl> = {
    [ShapeType.RECTANGLE]: ActiveControl.DRAW_RECTANGLE,
    [ShapeType.POLYLINE]: ActiveControl.DRAW_POLYLINE,
    [ShapeType.POLYGON]: ActiveControl.DRAW_POLYGON,
    [ShapeType.POINTS]: ActiveControl.DRAW_POINTS,
    [ShapeType.CUBOID]: ActiveControl.DRAW_CUBOID,
    [ShapeType.ELLIPSE]: ActiveControl.DRAW_ELLIPSE,
    [ShapeType.SKELETON]: ActiveControl.DRAW_SKELETON,
    [ShapeType.MASK]: ActiveControl.DRAW_MASK,
};

export function pasteShapeAsync(): ThunkAction {
    return async (dispatch: ThunkDispatch): Promise<void> => {
        const {
            canvas: { instance: canvasInstance },
            player: {
                frame: { number: frameNumber },
            },
            drawing: { activeInitialState: initialState },
        } = getStore().getState().annotation;

        if (initialState && canvasInstance) {
            const activeControl = ShapeTypeToControl[initialState.shapeType as ShapeType] || ActiveControl.CURSOR;

            canvasInstance.cancel();
            dispatch({
                type: AnnotationActionTypes.PASTE_SHAPE,
                payload: {
                    activeControl,
                },
            });

            if (initialState.objectType === ObjectType.TAG) {
                const objectState = new cvat.classes.ObjectState({
                    objectType: ObjectType.TAG,
                    label: initialState.label,
                    attributes: initialState.attributes,
                    frame: frameNumber,
                });
                dispatch(createAnnotationsAsync([objectState]));
            } else {
                canvasInstance.draw({
                    enabled: true,
                    initialState,
                    ...(initialState.shapeType === ShapeType.SKELETON ?
                        { skeletonSVG: initialState.label.structure.svg } : {}),
                });
            }
        }
    };
}

/**
 * 与画布交互的action创建函数
 * 用于设置当前活动的交互器（ML模型或OpenCV工具）及其参数
 * @param activeInteractor - 活动的交互器，可以是ML模型或OpenCV工具
 * @param activeLabelID - 活动标签的ID
 * @param activeInteractorParameters - 交互器的画布参数
 * @returns 返回INTERACT_WITH_CANVAS类型的Redux action
 */
export function interactWithCanvas(
    activeInteractor: MLModel | OpenCVTool,
    activeLabelID: number,
    activeInteractorParameters: MLModel['params']['canvas'],
): AnyAction {
    return {
        type: AnnotationActionTypes.INTERACT_WITH_CANVAS,  // action类型：与画布交互
        payload: {
            activeInteractor,           // 活动的交互器实例
            activeLabelID,               // 当前激活的标签ID
            activeInteractorParameters,  // 交互器的配置参数
        },
    };
}

/**
 * 重新开始绘制形状的异步动作创建函数
 * 
 * 该函数用于重复上一次的绘制操作，支持多种对象类型：
 * - AI交互工具（智能标注、轨迹跟踪等）
 * - 标签对象（直接创建标签）
 * - 形状对象（矩形、多边形、立方体等）
 * 
 * 功能特点：
 * 1. 优先处理AI交互工具
 * 2. 支持轨迹跟踪器（tracker）和普通AI工具
 * 3. 自动处理标签对象的重复创建
 * 4. 使用保存的绘制参数重新开始形状绘制
 * 
 * @returns ThunkAction - Redux异步动作
 */
export function repeatDrawShapeAsync(): ThunkAction {
    return async (dispatch: ThunkDispatch): Promise<void> => {
        // 从Redux store获取当前标注状态的所有相关数据
        const {
            canvas: { instance: canvasInstance },      // 画布实例
            annotations: { states },                   // 所有标注对象状态
            job: { labels },                            // 可用的标签列表
            player: {
                frame: { number: frameNumber },         // 当前帧号
            },
            drawing: {
                activeInteractor,                       // AI交互工具配置
                activeInteractorParameters,             // 交互工具参数
                activeObjectType,                       // 对象类型（形状/轨迹/标签）
                activeLabelID,                          // 激活的标签ID
                activeShapeType,                        // 形状类型（矩形/多边形等）
                activeNumOfPoints,                      // 多边形点数
                activeRectDrawingMethod,                // 矩形绘制方法
                activeCuboidDrawingMethod,              // 立方体绘制方法
            },
        } = getStore().getState().annotation;

        let activeControl = ActiveControl.CURSOR; // 默认控件状态为光标

        // 优先处理AI交互工具（如智能标注、轨迹跟踪等）
        if (activeInteractor && activeInteractorParameters && activeLabelID && canvasInstance instanceof Canvas) {
            if (activeInteractor.kind.includes('tracker')) {
                // 轨迹跟踪器：使用矩形形状进行交互
                canvasInstance.interact({
                    enabled: true,
                    shapeType: 'rectangle',
                });
                dispatch(interactWithCanvas(activeInteractor, activeLabelID, {}));
                dispatch(switchToolsBlockerState({ buttonVisible: false }));
            } else {
                // 其他AI工具：使用点形状进行交互
                canvasInstance.interact({
                    enabled: true,
                    shapeType: 'points',
                    ...activeInteractorParameters,
                });
                dispatch(interactWithCanvas(activeInteractor, activeLabelID, activeInteractorParameters));
            }
            return; // AI工具处理完成后直接返回
        }

        // 设置控件状态（标签类型保持光标，其他类型根据形状设置）
        if (activeObjectType !== ObjectType.TAG) {
            activeControl = ShapeTypeToControl[activeShapeType];
        }

        // 取消画布上的任何当前操作
        if (canvasInstance instanceof Canvas) {
            canvasInstance.cancel();
        }

        // 分发动作更新Redux状态
        dispatch({
            type: AnnotationActionTypes.REPEAT_DRAW_SHAPE,
            payload: {
                activeControl,
            },
        });

        // 获取激活的标签配置
        const [activeLabel] = labels.filter((label: any) => label.id === activeLabelID);
        if (!activeLabel) {
            throw new Error(`Label with ID ${activeLabelID}, was not found`);
        }

        // 处理标签对象类型：直接创建标签
        if (activeObjectType === ObjectType.TAG) {
            // 检查当前帧是否已存在相同标签
            const tags = states.filter((objectState: any): boolean => objectState.objectType === ObjectType.TAG);
            if (tags.every((objectState: any): boolean => objectState.label.id !== activeLabelID)) {
                // 创建新的标签对象
                const objectState = new cvat.classes.ObjectState({
                    objectType: ObjectType.TAG,
                    label: labels.filter((label: any) => label.id === activeLabelID)[0],
                    frame: frameNumber,
                });
                dispatch(createAnnotationsAsync([objectState]));
            }
        } 
        // 处理形状对象类型：使用保存的参数重新开始绘制
        else if (canvasInstance) {
            canvasInstance.draw({
                enabled: true,                                    // 启用绘制模式
                rectDrawingMethod: activeRectDrawingMethod,       // 矩形绘制方法
                cuboidDrawingMethod: activeCuboidDrawingMethod,   // 立方体绘制方法
                numberOfPoints: activeNumOfPoints,              // 多边形点数
                shapeType: activeShapeType,                       // 形状类型
                crosshair: [ShapeType.RECTANGLE, ShapeType.CUBOID, ShapeType.ELLIPSE].includes(activeShapeType), // 为特定形状启用十字准线
                skeletonSVG: activeShapeType === ShapeType.SKELETON ? activeLabel.structure.svg : undefined,     // 骨骼SVG配置
            });
        }
    };
}

/**
 * 重新绘制选中形状的异步动作创建函数
 * 
 * 该函数用于删除当前选中的形状并重新绘制它，主要特点：
 * 1. 仅当有激活的形状对象时才执行重绘操作
 * 2. 不支持标签对象的重绘（仅支持形状对象）
 * 3. 使用原始形状的所有参数进行重新绘制
 * 4. 通过设置 redraw 参数来指示这是重绘操作
 * 
 * 使用场景：
 * - 用户对当前形状不满意，想要重新绘制
 * - 形状存在错误，需要删除后重新创建
 * - 快捷键 Shift+N 触发重绘操作
 * 
 * @returns ThunkAction - Redux异步动作
 */
export function redrawShapeAsync(): ThunkAction {
    return async (dispatch: ThunkDispatch): Promise<void> => {
        // 从Redux store获取当前标注状态
        const {
            annotations: { activatedStateID, states },  // 激活状态ID和所有状态
            canvas: { instance: canvasInstance },      // 画布实例
        } = getStore().getState().annotation;

        // 检查是否有激活的形状对象
        if (activatedStateID !== null) {
            // 根据clientID查找对应的形状状态
            const [state] = states.filter((_state: any): boolean => _state.clientID === activatedStateID);
            
            // 确保状态存在且不是标签对象（标签不支持重绘）
            if (state && state.objectType !== ObjectType.TAG) {
                // 根据形状类型确定对应的控件类型
                const activeControl = ShapeTypeToControl[state.shapeType as ShapeType] || ActiveControl.CURSOR;
                
                // 取消画布上的任何当前操作
                if (canvasInstance instanceof Canvas) {
                    canvasInstance.cancel();
                }

                // 分发动作更新Redux状态，设置激活的控件
                dispatch({
                    type: AnnotationActionTypes.REPEAT_DRAW_SHAPE,
                    payload: {
                        activeControl,
                    },
                });

                // 使用保存的形状参数重新开始绘制
                // redraw参数设置为activatedStateID，表示这是重绘操作
                canvasInstance.draw({
                    skeletonSVG: state.shapeType === ShapeType.SKELETON ? state.label.structure.svg : undefined,  // 骨骼形状的SVG配置
                    enabled: true,                                    // 启用绘制模式
                    redraw: activatedStateID,                         // 设置重绘模式，传入原形状ID
                    shapeType: state.shapeType,                       // 使用原始形状类型
                    crosshair: [ShapeType.RECTANGLE, ShapeType.CUBOID, ShapeType.ELLIPSE].includes(state.shapeType), // 为特定形状启用十字准线
                });
            }
        }
    };
}

export function setForceExitAnnotationFlag(forceExit: boolean): AnyAction {
    return {
        type: AnnotationActionTypes.SET_FORCE_EXIT_ANNOTATION_PAGE_FLAG,
        payload: {
            forceExit,
        },
    };
}

export function switchNavigationBlocked(navigationBlocked: boolean): AnyAction {
    return {
        type: AnnotationActionTypes.SWITCH_NAVIGATION_BLOCKED,
        payload: {
            navigationBlocked,
        },
    };
}

export function setNavigationType(navigationType: NavigationType): AnyAction {
    return {
        type: AnnotationActionTypes.SET_NAVIGATION_TYPE,
        payload: {
            navigationType,
        },
    };
}

export function deleteFrameAsync(frame: number): ThunkAction {
    return async (dispatch: ThunkDispatch): Promise<void> => {
        const { jobInstance } = receiveAnnotationsParameters();
        const state: CombinedState = getStore().getState();
        const {
            annotation: {
                canvas: {
                    instance: canvasInstance,
                },
            },
            settings: {
                player: { showDeletedFrames },
            },
        } = state;

        try {
            dispatch({ type: AnnotationActionTypes.DELETE_FRAME });

            if (canvasInstance &&
                canvasInstance.mode() !== Canvas2DMode.IDLE &&
                canvasInstance.mode() !== Canvas3DMode.IDLE) {
                canvasInstance.cancel();
            }
            await jobInstance.frames.delete(frame);
            dispatch({
                type: AnnotationActionTypes.DELETE_FRAME_SUCCESS,
                payload: {
                    data: await jobInstance.frames.get(frame),
                },
            });
            dispatch(fetchAnnotationsAsync());
            let notDeletedFrame = await jobInstance.frames.search(
                { notDeleted: !showDeletedFrames }, frame, jobInstance.stopFrame,
            );
            if (notDeletedFrame === null && jobInstance.startFrame !== frame) {
                notDeletedFrame = await jobInstance.frames.search(
                    { notDeleted: !showDeletedFrames }, frame, jobInstance.startFrame,
                );
            }
            if (notDeletedFrame !== null) {
                dispatch(changeFrameAsync(notDeletedFrame));
            }
        } catch (error) {
            dispatch({
                type: AnnotationActionTypes.DELETE_FRAME_FAILED,
                payload: { error },
            });
        }
    };
}

export function restoreFrameAsync(frame: number): ThunkAction {
    return async (dispatch: ThunkDispatch): Promise<void> => {
        const { jobInstance } = receiveAnnotationsParameters();

        try {
            dispatch({ type: AnnotationActionTypes.RESTORE_FRAME });

            await jobInstance.frames.restore(frame);
            dispatch({
                type: AnnotationActionTypes.RESTORE_FRAME_SUCCESS,
                payload: {
                    data: await jobInstance.frames.get(frame),
                },
            });
            dispatch(fetchAnnotationsAsync());
        } catch (error) {
            dispatch({
                type: AnnotationActionTypes.RESTORE_FRAME_FAILED,
                payload: { error },
            });
        }
    };
}

/**
 * 异步切换当前编辑对象的隐藏状态
 * 更新画布配置和对象状态，并同步到服务器
 * 
 * @param hide - 是否隐藏当前编辑的对象
 * @returns 返回一个ThunkAction，用于Redux状态管理
 */
export function changeHideActiveObjectAsync(hide: boolean): ThunkAction {
    return async (dispatch: ThunkDispatch, getState): Promise<void> => {
        // 获取当前Redux状态
        const state = getState();
        // 获取画布实例
        const { instance: canvas } = state.annotation.canvas;
        // 确保画布实例存在
        if (canvas) {
            // 配置画布以隐藏/显示编辑中的对象
            (canvas as Canvas).configure({
                hideEditedObject: hide,
            });

            // 获取当前编辑的对象状态
            const { objectState } = state.annotation.editing;
            // 如果存在编辑中的对象
            if (objectState) {
                // 更新对象的隐藏状态
                objectState.hidden = hide;
                // 异步更新服务器上的对象状态
                await dispatch(updateAnnotationsAsync([objectState]));
            }

            // 分发隐藏活动对象的action，更新Redux状态
            dispatch({
                type: AnnotationActionTypes.HIDE_ACTIVE_OBJECT,
                payload: {
                    hide,
                },
            });
        }
    };
}

/**
 * 异步更新编辑状态
 * 更新当前编辑的对象状态，并处理对象隐藏状态的变更
 * 
 * @param objectState - 要更新的对象状态，如果为null则表示没有活动对象
 * @returns 返回一个ThunkAction，用于Redux状态管理
 */
export function updateEditedStateAsync(objectState: ObjectState | null): ThunkAction {
    return async (dispatch: ThunkDispatch, getState): Promise<void> => {
        // 初始化新的活动对象隐藏状态，默认为false
        let newActiveObjectHidden = false;
        // 如果提供了对象状态，则使用其隐藏属性
        if (objectState) {
            newActiveObjectHidden = objectState.hidden;
        }

        // 分发更新编辑状态的action
        dispatch({
            type: AnnotationActionTypes.UPDATE_EDITED_STATE,
            payload: {
                objectState,
            },
        });

        // 获取当前状态
        const state = getState();
        const { activeObjectHidden } = state.annotation.canvas;
        // 如果活动对象的隐藏状态发生变化，则调用changeHideActiveObjectAsync更新
        if (activeObjectHidden !== newActiveObjectHidden) {
            dispatch(changeHideActiveObjectAsync(newActiveObjectHidden));
        }
    };
}

