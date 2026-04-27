// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router';
import { RouteComponentProps } from 'react-router-dom';

import {
    changeFrameAsync,
    changeWorkspace as changeWorkspaceAction,
    collectStatisticsAsync,
    redoActionAsync,
    saveAnnotationsAsync,
    searchAnnotationsAsync,
    setForceExitAnnotationFlag as setForceExitAnnotationFlagAction,
    showFilters as showFiltersAction,
    showStatistics as showStatisticsAction,
    switchPlay,
    undoActionAsync,
    deleteFrameAsync,
    restoreFrameAsync,
    switchNavigationBlocked as switchNavigationBlockedAction,
    setNavigationType as setNavigationTypeAction,
    switchShowSearchFramesModal as switchShowSearchFramesModalAction,
} from 'actions/annotation-actions';
import AnnotationTopBarComponent from 'components/annotation-page/top-bar/top-bar';
import { Canvas } from 'cvat-canvas-wrapper';
import { Canvas3d } from 'cvat-canvas3d-wrapper';
import { FramesMetaData, Job } from 'cvat-core-wrapper';
import {
    CombinedState,
    FrameSpeed,
    Workspace,
    ActiveControl,
    ToolsBlockerState,
    NavigationType,
} from 'reducers';
import isAbleToChangeFrame from 'utils/is-able-to-change-frame';
import { KeyMap } from 'utils/mousetrap-react';
import { switchToolsBlockerState } from 'actions/settings-actions';
import { writeLatestFrame } from 'utils/remember-latest-frame';
import { finishDraw } from 'utils/drawing';
import { toClipboard } from 'utils/to-clipboard';

interface StateToProps {
    jobInstance: Job;
    frameIsDeleted: boolean;
    frameNumber: number;
    frameFilename: string;
    frameStep: number;
    frameSpeed: FrameSpeed;
    frameDelay: number;
    frameFetching: boolean;
    playing: boolean;
    saving: boolean;
    canvasIsReady: boolean;
    undoAction?: string;
    redoAction?: string;
    autoSave: boolean;
    autoSaveInterval: number;
    toolsBlockerState: ToolsBlockerState;
    showDeletedFrames: boolean;
    workspace: Workspace;
    keyMap: KeyMap;
    normalizedKeyMap: Record<string, string>;
    canvasInstance: Canvas | Canvas3d;
    forceExit: boolean;
    ranges: string;
    activeControl: ActiveControl;
    annotationFilters: object[];
    initialOpenGuide: boolean;
    navigationType: NavigationType;
    showSearchFrameByName: boolean;
}

interface DispatchToProps {
    onChangeFrame(frame: number, fillBuffer?: boolean, frameStep?: number): void;
    onSwitchPlay(playing: boolean): void;
    switchShowSearchPallet(visible: boolean): void;
    onSaveAnnotation(): void;
    showStatistics(sessionInstance: Job): void;
    showFilters(): void;
    undo(): void;
    redo(): void;
    searchAnnotations(
        sessionInstance: Job,
        frameFrom: number,
        frameTo: number,
        generalFilters?: {
            isEmptyFrame: boolean;
        },
    ): void;
    setForceExitAnnotationFlag(forceExit: boolean): void;
    changeWorkspace(workspace: Workspace): void;
    onSwitchToolsBlockerState(toolsBlockerState: ToolsBlockerState): void;
    deleteFrame(frame: number): void;
    restoreFrame(frame: number): void;
    switchNavigationBlocked(blocked: boolean): void;
    setNavigationType(navigationType: NavigationType): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            player: {
                playing,
                ranges,
                frame: {
                    data: { deleted: frameIsDeleted },
                    filename: frameFilename,
                    number: frameNumber,
                    delay: frameDelay,
                    fetching: frameFetching,
                },
                navigationType,
            },
            annotations: {
                saving: { uploading: saving, forceExit },
                history,
                filters: annotationFilters,
            },
            job: { instance: jobInstance, queryParameters: { initialOpenGuide }, meta },
            canvas: { ready: canvasIsReady, instance: canvasInstance, activeControl },
            workspace,
        },
        settings: {
            player: { frameSpeed, frameStep, showDeletedFrames },
            workspace: {
                autoSave,
                autoSaveInterval,
                toolsBlockerState,
            },
        },
        shortcuts: { keyMap, normalizedKeyMap },
    } = state;

    let showSearchFrameByName = false;
    if (meta?.frames && meta.frames.length > 0) {
        const firstName = meta.frames[0].name;
        showSearchFrameByName = !meta.frames.every(
            (frame: FramesMetaData['frames'][number]) => frame.name === firstName,
        );
    }

    return {
        frameIsDeleted,
        frameStep,
        frameSpeed,
        frameDelay,
        frameFetching,
        playing,
        canvasIsReady,
        saving,
        frameNumber,
        frameFilename,
        jobInstance: jobInstance as Job,
        undoAction: history.undo.length ? history.undo[history.undo.length - 1][0] : undefined,
        redoAction: history.redo.length ? history.redo[history.redo.length - 1][0] : undefined,
        autoSave,
        autoSaveInterval,
        toolsBlockerState,
        showDeletedFrames,
        workspace,
        keyMap,
        normalizedKeyMap,
        canvasInstance: canvasInstance as NonNullable<typeof canvasInstance>,
        forceExit,
        activeControl,
        ranges,
        annotationFilters,
        initialOpenGuide,
        navigationType,
        showSearchFrameByName,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onChangeFrame(frame: number, fillBuffer?: boolean, frameStep?: number): void {
            dispatch(changeFrameAsync(frame, fillBuffer, frameStep));
        },
        onSwitchPlay(playing: boolean): void {
            dispatch(switchPlay(playing));
        },
        onSaveAnnotation(): void {
            dispatch(saveAnnotationsAsync());
        },
        showStatistics(sessionInstance: Job): void {
            dispatch(collectStatisticsAsync(sessionInstance));
            dispatch(showStatisticsAction(true));
        },
        showFilters(): void {
            dispatch(showFiltersAction(true));
        },
        switchShowSearchPallet(visible: boolean): void {
            dispatch(switchShowSearchFramesModalAction(visible));
        },
        undo(): void {
            dispatch(undoActionAsync());
        },
        redo(): void {
            dispatch(redoActionAsync());
        },
        searchAnnotations(
            sessionInstance: Job,
            frameFrom: number,
            frameTo: number,
            generalFilters?: {
                isEmptyFrame: boolean;
            },
        ): void {
            dispatch(searchAnnotationsAsync(sessionInstance, frameFrom, frameTo, generalFilters));
        },
        changeWorkspace(workspace: Workspace): void {
            dispatch(changeWorkspaceAction(workspace));
        },
        setForceExitAnnotationFlag(forceExit: boolean): void {
            dispatch(setForceExitAnnotationFlagAction(forceExit));
        },
        onSwitchToolsBlockerState(toolsBlockerState: ToolsBlockerState): void {
            dispatch(switchToolsBlockerState(toolsBlockerState));
        },
        deleteFrame(frame: number): void {
            dispatch(deleteFrameAsync(frame));
        },
        restoreFrame(frame: number): void {
            dispatch(restoreFrameAsync(frame));
        },
        switchNavigationBlocked(blocked: boolean): void {
            dispatch(switchNavigationBlockedAction(blocked));
        },
        setNavigationType(navigationType: NavigationType): void {
            dispatch(setNavigationTypeAction(navigationType));
        },
    };
}

type Props = StateToProps & DispatchToProps & RouteComponentProps;
class AnnotationTopBarContainer extends React.PureComponent<Props> {
    private inputFrameRef: React.RefObject<HTMLInputElement>;
    private autoSaveInterval: number | undefined;
    private isWaitingForPlayDelay: boolean;
    private unblock: any;

    constructor(props: Props) {
        super(props);
        this.isWaitingForPlayDelay = false;
        this.inputFrameRef = React.createRef<HTMLInputElement>();
    }

    public componentDidMount(): void {
        const {
            autoSaveInterval, history, jobInstance, setForceExitAnnotationFlag,
        } = this.props;
        this.autoSaveInterval = window.setInterval(this.autoSave.bind(this), autoSaveInterval);

        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        this.unblock = history.block((location: any) => {
            const { forceExit, frameNumber } = self.props;
            const { id: jobID, taskId: taskID } = jobInstance;
            writeLatestFrame(jobInstance.id, frameNumber);

            if (
                jobInstance.annotations.hasUnsavedChanges() &&
                location.pathname !== `/tasks/${taskID}/jobs/${jobID}` &&
                !forceExit
            ) {
                return 'You have unsaved changes, please confirm leaving this page.';
            }

            if (forceExit) {
                setForceExitAnnotationFlag(false);
            }

            return undefined;
        });

        window.addEventListener('beforeunload', this.beforeUnloadCallback);
    }

    public componentDidUpdate(prevProps: Props): void {
        const { autoSaveInterval } = this.props;

        if (autoSaveInterval !== prevProps.autoSaveInterval) {
            if (this.autoSaveInterval) window.clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = window.setInterval(this.autoSave.bind(this), autoSaveInterval);
        }
        this.handlePlayIfNecessary();
    }

    public componentWillUnmount(): void {
        window.clearInterval(this.autoSaveInterval);
        window.removeEventListener('beforeunload', this.beforeUnloadCallback);
        this.unblock();
    }

    private async handlePlayIfNecessary(): Promise<void> {
        const {
            jobInstance,
            frameNumber,
            frameDelay,
            frameFetching,
            playing,
            canvasIsReady,
            onSwitchPlay,
            onChangeFrame,
        } = this.props;

        const { stopFrame } = jobInstance;

        if (playing && canvasIsReady && !frameFetching && !this.isWaitingForPlayDelay) {
            this.isWaitingForPlayDelay = true;
            try {
                await new Promise((resolve) => {
                    setTimeout(resolve, frameDelay);
                });

                const { playing: currentPlaying, showDeletedFrames } = this.props;

                if (currentPlaying) {
                    const nextCandidate = frameNumber + 1;
                    if (nextCandidate > stopFrame) {
                        onSwitchPlay(false);
                        return;
                    }

                    const next = await jobInstance.frames
                        .search({ notDeleted: !showDeletedFrames }, nextCandidate, stopFrame);
                    if (next !== null && isAbleToChangeFrame(next)) {
                        onChangeFrame(next, currentPlaying);
                    } else {
                        onSwitchPlay(false);
                    }
                }
            } finally {
                this.isWaitingForPlayDelay = false;
            }
        }
    }

    private undo = (): void => {
        const { undo, undoAction } = this.props;

        if (isAbleToChangeFrame() && undoAction) {
            undo();
        }
    };

    private redo = (): void => {
        const { redo, redoAction } = this.props;

        if (isAbleToChangeFrame() && redoAction) {
            redo();
        }
    };

    private showStatistics = (): void => {
        const { jobInstance, showStatistics } = this.props;
        showStatistics(jobInstance);
    };

    private showFilters = (): void => {
        const { showFilters } = this.props;
        showFilters();
    };

    private onSwitchPlay = (): void => {
        const {
            frameNumber, jobInstance, onSwitchPlay, playing,
        } = this.props;

        if (playing) {
            onSwitchPlay(false);
        } else if (frameNumber < jobInstance.stopFrame) {
            onSwitchPlay(true);
        }
    };

    private onFirstFrame = async (): Promise<void> => {
        const {
            frameNumber, jobInstance, playing,
            onSwitchPlay, showDeletedFrames,
        } = this.props;

        const newFrame =
            await jobInstance.frames.search({ notDeleted: !showDeletedFrames }, jobInstance.startFrame, frameNumber);
        if (newFrame !== frameNumber && newFrame !== null) {
            if (playing) {
                onSwitchPlay(false);
            }
            this.changeFrame(newFrame);
        }
    };

    private onBackward = async (): Promise<void> => {
        const {
            frameNumber, frameStep, jobInstance, playing,
            onSwitchPlay, showDeletedFrames,
        } = this.props;

        const newFrame = await jobInstance.frames.search(
            { notDeleted: !showDeletedFrames, offset: frameStep },
            Math.max(jobInstance.startFrame, frameNumber - 1),
            jobInstance.startFrame,
        );

        if (newFrame !== frameNumber && newFrame !== null) {
            if (playing) {
                onSwitchPlay(false);
            }
            this.changeFrame(newFrame);
        }
    };

    private onPrevFrame = async (): Promise<void> => {
        const {
            frameNumber, jobInstance, playing, searchAnnotations,
            onSwitchPlay, showDeletedFrames, navigationType,
        } = this.props;
        const { startFrame } = jobInstance;

        const frameFrom = Math.max(jobInstance.startFrame, frameNumber - 1);
        const newFrame = await jobInstance.frames.search(
            { notDeleted: !showDeletedFrames },
            frameFrom,
            jobInstance.startFrame,
        );

        if (newFrame !== frameNumber && newFrame !== null && isAbleToChangeFrame(newFrame)) {
            if (playing) {
                onSwitchPlay(false);
            }

            if (navigationType === NavigationType.REGULAR) {
                this.changeFrame(newFrame);
            } else if (navigationType === NavigationType.FILTERED) {
                searchAnnotations(jobInstance, newFrame, startFrame);
            } else {
                searchAnnotations(jobInstance, newFrame, startFrame, { isEmptyFrame: true });
            }
        }
    };

    /**
     * 处理下一张图片/帧的切换
     * @private
     * @async
     * @returns {Promise<void>}
     * 
     * 该函数是CVAT中帧导航的核心逻辑，负责：
     * 1. 搜索下一个有效的帧（考虑删除帧的显示设置）
     * 2. 验证是否可以切换到目标帧（画布状态、帧范围等）
     * 3. 根据导航类型执行不同的切换策略
     * 4. 处理播放状态的暂停
     * 
     * 导航类型说明：
     * - REGULAR: 普通模式，直接切换帧
     * - FILTERED: 过滤模式，搜索带注释的帧
     * - EMPTY: 空帧模式，搜索没有注释的帧
     */
    private onNextFrame = async (): Promise<void> => {
        // 解构获取当前组件的属性
        const {
            frameNumber, jobInstance, playing, searchAnnotations,
            onSwitchPlay, showDeletedFrames, navigationType,
        } = this.props;
        const { stopFrame } = jobInstance;

        // 计算搜索起始帧：当前帧+1，但不能超过作业的最后帧
        const frameFrom = Math.min(jobInstance.stopFrame, frameNumber + 1);
        
        // 在作业帧范围内搜索下一个有效帧
        // 参数说明：notDeleted控制是否跳过已删除的帧
        const newFrame = await jobInstance.frames.search(
            { notDeleted: !showDeletedFrames },
            frameFrom,
            jobInstance.stopFrame,
        );
        
        // 验证搜索结果：确保找到新帧且与当前帧不同，同时检查是否可以切换
        if (newFrame !== frameNumber && newFrame !== null && isAbleToChangeFrame(newFrame)) {
            // 如果正在播放，先暂停播放
            if (playing) {
                onSwitchPlay(false);
            }

            // 根据导航类型执行不同的切换策略
            if (navigationType === NavigationType.REGULAR) {
                // 普通模式：直接切换到新帧
                this.changeFrame(newFrame);
            } else if (navigationType === NavigationType.FILTERED) {
                // 过滤模式：搜索带注释的帧
                searchAnnotations(jobInstance, newFrame, stopFrame);
            } else {
                // 空帧模式：搜索没有注释的帧
                searchAnnotations(jobInstance, newFrame, stopFrame, { isEmptyFrame: true });
            }
        }
    };

    private onForward = async (): Promise<void> => {
        const {
            frameNumber, frameStep, jobInstance, playing,
            onSwitchPlay, showDeletedFrames,
        } = this.props;

        const newFrame = await jobInstance.frames.search(
            { notDeleted: !showDeletedFrames, offset: frameStep },
            Math.min(jobInstance.stopFrame, frameNumber + 1),
            jobInstance.stopFrame,
        );

        if (newFrame !== frameNumber && newFrame !== null) {
            if (playing) {
                onSwitchPlay(false);
            }
            this.changeFrame(newFrame);
        }
    };

    private onLastFrame = async (): Promise<void> => {
        const {
            frameNumber, jobInstance, playing,
            onSwitchPlay, showDeletedFrames,
        } = this.props;

        const newFrame =
            await jobInstance.frames.search({ notDeleted: !showDeletedFrames }, jobInstance.stopFrame, frameNumber);
        if (newFrame !== frameNumber && newFrame !== null) {
            if (playing) {
                onSwitchPlay(false);
            }
            this.changeFrame(newFrame);
        }
    };

    private searchAnnotations = (direction: 'forward' | 'backward'): void => {
        const {
            frameNumber, jobInstance, searchAnnotations,
        } = this.props;
        const { startFrame, stopFrame } = jobInstance;

        if (isAbleToChangeFrame()) {
            if (direction === 'forward' && frameNumber + 1 <= stopFrame) {
                searchAnnotations(jobInstance, frameNumber + 1, stopFrame);
            } else if (direction === 'backward' && frameNumber - 1 >= startFrame) {
                searchAnnotations(jobInstance, frameNumber - 1, startFrame);
            }
        }
    };

    private onChangePlayerSliderValue = async (value: number): Promise<void> => {
        const {
            playing, onSwitchPlay, jobInstance, showDeletedFrames,
        } = this.props;
        if (playing) {
            onSwitchPlay(false);
        }
        const newFrame = await jobInstance.frames.search(
            { notDeleted: !showDeletedFrames },
            Math.min(jobInstance.stopFrame, value),
            jobInstance.stopFrame,
        );
        if (newFrame !== null) {
            this.changeFrame(newFrame);
        }
    };

    private onChangePlayerInputValue = async (value: number): Promise<void> => {
        const {
            frameNumber, onSwitchPlay, playing, jobInstance, showDeletedFrames,
        } = this.props;

        if (value !== frameNumber) {
            if (playing) {
                onSwitchPlay(false);
            }
            const newFrame = await jobInstance.frames.search(
                { notDeleted: !showDeletedFrames },
                Math.min(jobInstance.stopFrame, value),
                jobInstance.stopFrame,
            );
            if (newFrame !== null) {
                this.changeFrame(newFrame);
            }
        }
    };

    private onFinishDraw = (): void => {
        const { activeControl, canvasInstance } = this.props;
        finishDraw(canvasInstance, activeControl);
    };

    private onSwitchToolsBlockerState = (): void => {
        const { toolsBlockerState, onSwitchToolsBlockerState } = this.props;
        onSwitchToolsBlockerState({ algorithmsLocked: !toolsBlockerState.algorithmsLocked });
    };

    private onURLIconClick = (): void => {
        const { frameNumber } = this.props;
        const { origin, pathname } = window.location;
        const url = `${origin}${pathname}?frame=${frameNumber}`;

        toClipboard(url);
    };

    private onCopyFilenameIconClick = (): void => {
        const { frameFilename } = this.props;

        toClipboard(frameFilename);
    };

    private onDeleteFrame = (): void => {
        const { deleteFrame, frameNumber } = this.props;
        deleteFrame(frameNumber);
    };

    private onRestoreFrame = (): void => {
        const { restoreFrame, frameNumber } = this.props;
        restoreFrame(frameNumber);
    };

    private changeWorkspace = (workspace: Workspace): void => {
        const { changeWorkspace } = this.props;
        changeWorkspace(workspace);
        if (window.document.activeElement) {
            (window.document.activeElement as HTMLElement).blur();
        }
    };

    private beforeUnloadCallback = (event: BeforeUnloadEvent): string | undefined => {
        const { jobInstance, forceExit, setForceExitAnnotationFlag } = this.props;
        const { frameNumber } = this.props;

        writeLatestFrame(jobInstance.id, frameNumber);
        if (jobInstance.annotations.hasUnsavedChanges() && !forceExit) {
            const confirmationMessage = 'You have unsaved changes, please confirm leaving this page.';
            // eslint-disable-next-line no-param-reassign
            event.returnValue = confirmationMessage;
            return confirmationMessage;
        }

        if (forceExit) {
            setForceExitAnnotationFlag(false);
        }
        return undefined;
    };

    private autoSave(): void {
        const { autoSave, saving, onSaveAnnotation } = this.props;

        if (autoSave && !saving) {
            onSaveAnnotation();
        }
    }

    /**
     * 安全地切换到指定帧
     * @private
     * @param {number} frame - 目标帧号
     * @returns {void}
     * 
     * 该函数是帧切换的安全包装器，确保：
     * 1. 只有在画布状态允许的情况下才执行切换
     * 2. 通过 isAbleToChangeFrame 进行全面的切换条件验证
     * 3. 调用 Redux action 触发实际的帧切换流程
     * 
     * 这个函数通常被以下场景调用：
     * - 用户点击导航按钮（上一张/下一张）
     * - 快捷键操作（F/D/V/C等）
     * - 帧跳转输入框提交
     * - 过滤导航模式下的自动跳转
     */
    private changeFrame(frame: number): void {
        // 从props中解构获取帧切换回调函数
        const { onChangeFrame } = this.props;
        
        // 验证是否可以切换到目标帧
        // isAbleToChangeFrame会检查：画布状态、帧范围、导航阻塞等条件
        if (isAbleToChangeFrame(frame)) {
            // 触发Redux action，开始帧切换流程
            // 这会触发changeFrameAsync异步action，获取新帧数据并更新UI
            onChangeFrame(frame);
        }
        // 注意：如果切换条件不满足，函数静默返回，不执行任何操作
        // 这是有意为之的设计，避免在不合适的状态下强制切换帧
    }

    public render(): JSX.Element {
        const {
            playing,
            saving,
            jobInstance,
            jobInstance: { startFrame, stopFrame },
            frameNumber,
            frameFilename,
            frameIsDeleted,
            undoAction,
            redoAction,
            workspace,
            keyMap,
            ranges,
            normalizedKeyMap,
            activeControl,
            annotationFilters,
            initialOpenGuide,
            toolsBlockerState,
            navigationType,
            switchNavigationBlocked,
            setNavigationType,
            switchShowSearchPallet,
            showSearchFrameByName,
        } = this.props;

        return (
            <AnnotationTopBarComponent
                showStatistics={this.showStatistics}
                showFilters={this.showFilters}
                onSwitchPlay={this.onSwitchPlay}
                onPrevFrame={this.onPrevFrame}
                onNextFrame={this.onNextFrame}
                onForward={this.onForward}
                onBackward={this.onBackward}
                onFirstFrame={this.onFirstFrame}
                onLastFrame={this.onLastFrame}
                onSearchAnnotations={this.searchAnnotations}
                setNavigationType={setNavigationType}
                onSliderChange={this.onChangePlayerSliderValue}
                onInputChange={this.onChangePlayerInputValue}
                onURLIconClick={this.onURLIconClick}
                onCopyFilenameIconClick={this.onCopyFilenameIconClick}
                onDeleteFrame={this.onDeleteFrame}
                onRestoreFrame={this.onRestoreFrame}
                changeWorkspace={this.changeWorkspace}
                switchShowSearchPallet={switchShowSearchPallet}
                showSearchFrameByName={showSearchFrameByName}
                switchNavigationBlocked={switchNavigationBlocked}
                keyMap={keyMap}
                workspace={workspace}
                playing={playing}
                saving={saving}
                ranges={ranges}
                startFrame={startFrame}
                stopFrame={stopFrame}
                frameNumber={frameNumber}
                frameFilename={frameFilename}
                frameDeleted={frameIsDeleted}
                inputFrameRef={this.inputFrameRef}
                undoAction={undoAction}
                redoAction={redoAction}
                undoShortcut={normalizedKeyMap.UNDO}
                redoShortcut={normalizedKeyMap.REDO}
                drawShortcut={normalizedKeyMap.SWITCH_DRAW_MODE_STANDARD_CONTROLS}
                switchToolsBlockerShortcut={normalizedKeyMap.SWITCH_TOOLS_BLOCKER_STATE}
                playPauseShortcut={normalizedKeyMap.PLAY_PAUSE}
                deleteFrameShortcut={normalizedKeyMap.DELETE_FRAME}
                nextFrameShortcut={normalizedKeyMap.NEXT_FRAME}
                previousFrameShortcut={normalizedKeyMap.PREV_FRAME}
                forwardShortcut={normalizedKeyMap.FORWARD_FRAME}
                backwardShortcut={normalizedKeyMap.BACKWARD_FRAME}
                navigationType={navigationType}
                focusFrameInputShortcut={normalizedKeyMap.FOCUS_INPUT_FRAME}
                searchFrameByNameShortcut={normalizedKeyMap.SEARCH_FRAME_BY_NAME}
                annotationFilters={annotationFilters}
                initialOpenGuide={initialOpenGuide}
                onUndoClick={this.undo}
                onRedoClick={this.redo}
                onFinishDraw={this.onFinishDraw}
                onSwitchToolsBlockerState={this.onSwitchToolsBlockerState}
                toolsBlockerState={toolsBlockerState}
                jobInstance={jobInstance}
                activeControl={activeControl}
            />
        );
    }
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(AnnotationTopBarContainer));
