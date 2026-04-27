// Copyright (C) 2021-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';

import {
    updateAnnotationsAsync,
    changeFrameAsync,
    changeGroupColorAsync,
    pasteShapeAsync,
    updateActiveControl as updateActiveControlAction,
    copyShape as copyShapeAction,
    activateObject as activateObjectAction,
    switchPropagateVisibility as switchPropagateVisibilityAction,
    removeObject as removeObjectAction,
} from 'actions/annotation-actions';
import {
    ActiveControl, CombinedState, ColorBy,
    Workspace,
} from 'reducers';
import { openAnnotationsActionModal } from 'components/annotation-page/annotations-actions/annotations-actions-modal';
import ObjectStateItemComponent from 'components/annotation-page/standard-workspace/objects-side-bar/object-item';
import { getColor } from 'components/annotation-page/standard-workspace/objects-side-bar/shared';
import openCVWrapper from 'utils/opencv-wrapper/opencv-wrapper';
import { shift } from 'utils/math';
import {
    Label, ObjectState, Attribute, Job, ShapeType,
} from 'cvat-core-wrapper';
import { Canvas, CanvasMode } from 'cvat-canvas-wrapper';
import { Canvas3d } from 'cvat-canvas3d-wrapper';
import { filterApplicableLabels } from 'utils/filter-applicable-labels';
import { toClipboard } from 'utils/to-clipboard';

/**
 * 对象项组件的自有属性接口
 * 定义了从父组件直接传递的属性
 */
interface OwnProps {
    /** 是否只读模式，控制用户交互权限 */
    readonly: boolean;
    /** 对象的客户端ID，用于唯一标识对象 */
    clientID: number;
    /** 所有对象状态的数组，用于查找当前对象 */
    objectStates: ObjectState[];
}

/**
 * Redux状态映射属性接口
 * 定义了从Redux store映射到组件的属性
 */
interface StateToProps {
    /** 当前对象的状态信息 */
    objectState: ObjectState;
    /** 可用的标签列表 */
    labels: Label[];
    /** 可用的属性列表 */
    attributes: Attribute[];
    /** 当前作业实例 */
    jobInstance: Job;
    /** 当前帧号 */
    frameNumber: number;
    /** 当前对象是否被激活 */
    activated: boolean;
    /** 颜色显示方式（按标签、按组等） */
    colorBy: ColorBy;
    /** 组件是否准备就绪 */
    ready: boolean;
    /** 当前活动的控制模式 */
    activeControl: ActiveControl;
    /** 最小Z轴层级值 */
    minZLayer: number;
    /** 最大Z轴层级值 */
    maxZLayer: number;
    /** 标准化的键盘映射配置 */
    normalizedKeyMap: Record<string, string>;
    /** 画布实例（2D或3D） */
    canvasInstance: Canvas | Canvas3d;
    /** 当前工作空间类型 */
    workspace: Workspace;
}

/**
 * Redux dispatch属性接口
 * 定义了组件可以调用的所有Redux action creator函数
 */
interface DispatchToProps {
    /** 切换当前帧的函数 */
    changeFrame(frame: number): void;
    /** 更新对象状态的函数 */
    updateState(objectState: ObjectState): void;
    /** 激活对象的函数，传入状态ID和元素ID */
    activateObject: (activatedStateID: number | null, activatedElementID: number | null) => void;
    /** 移除对象的函数 */
    removeObject: (objectState: ObjectState) => void;
    /** 复制形状的函数 */
    copyShape: (objectState: ObjectState) => void;
    /** 切换传播可见性的函数 */
    switchPropagateVisibility: (visible: boolean) => void;
    /** 更改组颜色的函数 */
    changeGroupColor(group: number, color: string): void;
    /** 更新活动控件的函数 */
    updateActiveControl(activeControl: ActiveControl): void;
}

function mapStateToProps(state: CombinedState, own: OwnProps): StateToProps {
    const {
        annotation: {
            annotations: {
                activatedStateID,
                zLayer: { min: minZLayer, max: maxZLayer },
            },
            job: { attributes: jobAttributes, instance: jobInstance, labels },
            player: {
                frame: { number: frameNumber },
            },
            canvas: { instance: canvasInstance, ready, activeControl },
            workspace,
        },
        settings: {
            shapes: { colorBy },
        },
        shortcuts: { normalizedKeyMap },
    } = state;

    const { objectStates: states, clientID } = own;
    const stateIDs = states.map((_state: any): number => _state.clientID);
    const index = stateIDs.indexOf(clientID);

    return {
        objectState: states[index],
        attributes: jobAttributes[states[index].label.id as number],
        labels,
        ready,
        activeControl,
        colorBy,
        jobInstance,
        frameNumber,
        activated: activatedStateID === clientID,
        minZLayer,
        maxZLayer,
        normalizedKeyMap,
        canvasInstance: canvasInstance as Canvas | Canvas3d,
        workspace,
    };
}

/**
 * 将Redux dispatch映射到组件props的函数
 * 提供组件可以调用的action creator函数，用于触发Redux状态更新
 * 
 * @param dispatch - Redux dispatch函数，用于分发actions
 * @returns 包含所有action creator函数的对象，组件可以通过props调用这些方法
 */
function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        /** 切换当前帧的action creator
         *  @param frame - 目标帧号
         */
        changeFrame(frame: number): void {
            dispatch(changeFrameAsync(frame));
        },
        /** 更新对象状态的action creator
         *  @param state - 要更新的对象状态
         */
        updateState(state: any): void {
            dispatch(updateAnnotationsAsync([state]));
        },
        /** 激活对象的action creator
         *  @param activatedStateID - 要激活的对象状态ID，传入null表示取消激活
         */
        activateObject(activatedStateID: number | null): void {
            dispatch(activateObjectAction(activatedStateID, null, null));
        },
        /** 移除对象的action creator
         *  @param objectState - 要移除的对象状态
         */
        removeObject(objectState: any): void {
            dispatch(removeObjectAction(objectState, false));
        },
        /** 复制形状的action creator（包含复制和粘贴两个操作）
         *  @param objectState - 要复制的对象状态
         */
        copyShape(objectState: any): void {
            dispatch(copyShapeAction(objectState));
            dispatch(pasteShapeAsync());
        },
        /** 切换传播可见性的action creator
         *  @param visible - 是否显示传播面板
         */
        switchPropagateVisibility(visible: boolean): void {
            dispatch(switchPropagateVisibilityAction(visible));
        },
        /** 更改组颜色的action creator
         *  @param group - 组ID
         *  @param color - 新颜色值
         */
        changeGroupColor(group: number, color: string): void {
            dispatch(changeGroupColorAsync(group, color));
        },
        /** 更新活动控件的action creator
         *  @param activeControl - 新的活动控件类型
         */
        updateActiveControl(activeControl: ActiveControl): void {
            dispatch(updateActiveControlAction(activeControl));
        },
    };
}

/**
 * 组件Props类型定义
 * 组合了Redux状态映射、dispatch映射和自有属性
 */
type Props = StateToProps & DispatchToProps & OwnProps;

/**
 * 组件State接口定义
 * 包含标签列表和元素ID列表
 */
interface State {
    labels: Label[];      // 标签列表
    elements: number[];   // 元素ID列表
}

/**
 * 对象项容器组件
 * 负责渲染和管理单个标注对象的UI及交互逻辑
 */
class ObjectItemContainer extends React.PureComponent<Props, State> {
    /**
     * 构造函数
     * 初始化组件状态，设置标签和元素列表
     * @param {Props} props - 组件属性
     */
    public constructor(props: Props) {
        super(props);
        this.state = {
            // 从props获取标签列表
            labels: props.labels,
            // 从对象状态的元素中提取clientID列表
            elements: props.objectState.elements.map((el: ObjectState) => el.clientID as number),
        };
    }

    /**
     * 从props派生状态的生命周期方法
     * 当标签列表发生变化时更新组件状态
     * @param {Readonly<Props>} props - 新的props
     * @param {Readonly<State>} state - 当前state
     * @returns {State | null} - 更新后的状态或null
     */
    public static getDerivedStateFromProps(props: Readonly<Props>, state: Readonly<State>): State | null {
        // 解构获取对象状态和标签列表
        const { objectState, labels } = props;
        // 过滤适用于当前对象的标签
        const applicableLabels = filterApplicableLabels(objectState, labels);
        // 检查标签列表是否发生变化（长度或内容）
        if (state.labels.length !== applicableLabels.length ||
            state.labels.some((label, idx) => label.id !== applicableLabels[idx].id)) {
            // 返回更新后的状态，保留其他状态属性
            return {
                ...state,
                labels: applicableLabels,
            };
        }

        // 状态无变化，返回null
        return null;
    }

    /**
     * 复制对象
     * 在非只读模式下复制当前对象
     * @private
     * @returns {void}
     */
    private copy = (): void => {
        // 解构获取对象状态、只读标识和复制形状的action creator
        const { objectState, readonly, copyShape } = this.props;
        // 只有在非只读模式下才允许复制对象
        if (!readonly) {
            // 调用Redux action复制当前对象
            copyShape(objectState);
        }
    };

    /**
     * 传播对象
     * 在非只读模式下显示传播面板
     * @private
     * @returns {void}
     */
    private propagate = (): void => {
        // 解构获取切换传播面板可见性的action creator和只读标识
        const { switchPropagateVisibility, readonly } = this.props;
        // 只有在非只读模式下才允许显示传播面板
        if (!readonly) {
            // 调用Redux action显示传播面板（传入true表示显示）
            switchPropagateVisibility(true);
        }
    };

    /**
     * 编辑对象
     * 在非只读模式下编辑多边形或遮罩形状
     * @private
     * @returns {void}
     */
    private edit = (): void => {
        // 解构获取对象状态、只读标识、画布实例和更新激活控制的action creator
        const {
            objectState, readonly, canvasInstance, updateActiveControl,
        } = this.props;

        // 检查条件：非只读模式、画布实例存在、对象为可编辑形状类型（多边形或遮罩）
        if (!readonly && canvasInstance instanceof Canvas &&
            [ShapeType.POLYGON, ShapeType.MASK].includes(objectState.shapeType)
        ) {
            // 如果画布当前不处于空闲模式，先取消当前操作
            if (canvasInstance.mode() !== CanvasMode.IDLE) {
                canvasInstance.cancel();
            }

            // 更新激活的控制类型为编辑模式
            updateActiveControl(ActiveControl.EDIT);
            // 启用画布编辑模式，传入当前对象状态
            canvasInstance.edit({ enabled: true, state: objectState });
        }
    };

    /**
     * 切片对象
     * 在非只读模式下对多边形或遮罩进行切片操作
     * @private
     * @returns {Promise<void>}
     */
    private slice = async (): Promise<void> => {
        // 解构获取对象状态、只读标识、画布实例和更新激活控制的action creator
        const {
            objectState, readonly, canvasInstance, updateActiveControl,
        } = this.props;

        // 检查条件：非只读模式、画布实例存在、对象为可切片形状类型（多边形或遮罩）
        if (!readonly && canvasInstance instanceof Canvas &&
            [ShapeType.POLYGON, ShapeType.MASK].includes(objectState.shapeType)
        ) {
            // 如果画布当前不处于空闲模式，先取消当前操作
            if (canvasInstance.mode() !== CanvasMode.IDLE) {
                canvasInstance.cancel();
            }

            // 更新激活的控制类型为切片模式
            updateActiveControl(ActiveControl.SLICE);
            // 启用画布切片模式，配置轮廓获取函数和客户端ID
            canvasInstance.slice({
                enabled: true,
                getContour: openCVWrapper.getContourFromState,  // 使用OpenCV包装器从状态获取轮廓
                clientID: objectState.clientID as number,      // 当前对象的客户端ID
            });
        }
    };

/**
     * 移除对象方法
     * 在非只读模式下删除当前选中的标注对象
     * 该方法首先检查是否处于只读模式，只有在非只读状态下才执行删除操作
     * 
     * @private
     * @returns {void}
     */
    private remove = (): void => {
        // 解构获取需要的属性：对象状态、只读标识、移除对象的action creator
        const {
            objectState, readonly, removeObject,
        } = this.props;

        // 只有在非只读模式下才允许删除对象
        if (!readonly) {
            // 调用Redux action creator执行对象删除操作
            removeObject(objectState);
        }
    };

    /**
     * 创建对象URL
     * 生成指向当前对象的URL并复制到剪贴板，包含帧号、对象类型和服务器ID信息
     * @private
     * @returns {void}
     */
    private createURL = (): void => {
        // 解构获取对象状态和当前帧号
        const { objectState, frameNumber } = this.props;
        // 从window.location解构获取当前页面的origin和pathname
        const { origin, pathname } = window.location;

        // 构建查询参数字符串，包含帧号、对象类型和服务器ID
        const search = `frame=${frameNumber}&type=${objectState.objectType}&serverID=${objectState.serverID}`;
        // 组合完整的URL：origin + pathname + 查询参数
        const url = `${origin}${pathname}?${search}`;

        // 将生成的URL复制到剪贴板
        toClipboard(url);
    };

    /**
     * 切换对象方向
     * 根据对象类型执行不同的方向切换逻辑：立方体、多边形或折线
     * @private
     * @returns {void}
     */
    private switchOrientation = (): void => {
        // 解构获取对象状态、只读标识和更新状态的action creator
        const { objectState, readonly, updateState } = this.props;
        // 如果处于只读模式，直接返回不执行任何操作
        if (readonly) {
            return;
        }

        // 处理立方体形状的方向切换
        if (objectState.shapeType === ShapeType.CUBOID) {
            // 调用专门的立方体方向切换方法
            this.switchCuboidOrientation();
            return;
        }

        // 处理多边形和折线形状的方向切换
        if ([ShapeType.POLYGON, ShapeType.POLYLINE].includes(objectState.shapeType)) {
            // 将一维点数组转换为二维坐标点对数组
            // 例如：[x1, y1, x2, y2, ...] 转换为 [[x1, y1], [x2, y2], ...]
            const reducedPoints = (objectState.points as number[]).reduce(
                (acc: number[][], _: number, index: number, array: number[]): number[][] => {
                    // 只在奇数索引时处理（每两个元素为一组坐标点）
                    if (index % 2) {
                        // 将当前元素和前一个元素组合成一个坐标点对
                        acc.push([array[index - 1], array[index]]);
                    }

                    return acc;
                },
                [],
            );

            // 根据形状类型执行不同的方向切换逻辑
            if (objectState.shapeType === ShapeType.POLYGON) {
                // 多边形：保留第一个点，然后将剩余点反转（实现方向切换）
                // slice(0, 1)获取第一个点，reverse()反转数组，slice(0, -1)移除最后一个重复点
                objectState.points = reducedPoints.slice(0, 1).concat(reducedPoints.reverse().slice(0, -1)).flat();
                // 更新对象状态
                updateState(objectState);
            } else if (objectState.shapeType === ShapeType.POLYLINE) {
                // 折线：直接反转所有点的顺序（实现方向切换）
                objectState.points = reducedPoints.reverse().flat();
                // 更新对象状态
                updateState(objectState);
            }
        }
    };

    /**
     * 将对象移动到背景层
     * 通过设置zOrder为最小层级减1，确保对象显示在最底层
     * @private
     * @returns {void}
     */
    private toBackground = (): void => {
        // 解构获取对象状态、只读标识和最小层级值
        const { objectState, readonly, minZLayer } = this.props;

        // 只有在非只读模式下才允许修改对象层级
        if (!readonly) {
            // 将对象的zOrder设置为最小层级减1，使其移动到最底层
            objectState.zOrder = minZLayer - 1;
            // 提交更改到状态管理
            this.commit();
        }
    };

    /**
     * 将对象移动到前景层
     * 通过设置zOrder为最大层级加1，确保对象显示在最顶层
     * @private
     * @returns {void}
     */
    private toForeground = (): void => {
        // 解构获取对象状态、只读标识和最大层级值
        const { objectState, readonly, maxZLayer } = this.props;

        // 只有在非只读模式下才允许修改对象层级
        if (!readonly) {
            // 将对象的zOrder设置为最大层级加1，使其移动到最顶层
            objectState.zOrder = maxZLayer + 1;
            // 提交更改到状态管理
            this.commit();
        }
    };

    /**
     * 激活对象
     * 在光标模式下激活当前对象，可选择激活特定元素
     * @private
     * @param {number} [activeElementID] - 可选的特定元素ID，用于激活对象的特定部分
     * @returns {void}
     */
    private activate = (activeElementID?: number): void => {
        // 解构获取对象状态、就绪状态、当前激活的控制类型和激活对象的action creator
        const {
            objectState, ready, activeControl, activateObject,
        } = this.props;

        // 确保应用就绪且当前处于光标控制模式才允许激活对象
        if (ready && activeControl === ActiveControl.CURSOR) {
            // 调用Redux action激活对象，传入对象clientID和可选的元素ID
            // 如果activeElementID不是整数，则传入null表示激活整个对象
            activateObject(
                objectState.clientID,
                (Number.isInteger(activeElementID) ? activeElementID : null) as number | null,
            );
        }
    };

/**
     * 更改对象颜色方法
     * 根据当前颜色显示模式（按实例或按组）来更新对象颜色
     * 支持两种颜色模式：实例级别颜色更改和组级别颜色更改
     * 
     * @private
     * @param {string} color - 新的颜色值
     * @returns {void}
     */
    private changeColor = (color: string): void => {
        // 解构获取需要的属性：对象状态、颜色显示模式、更改组颜色的action creator
        const { objectState, colorBy, changeGroupColor } = this.props;

        // 根据颜色显示模式执行不同的颜色更改逻辑
        if (colorBy === ColorBy.INSTANCE) {
            // 实例模式：直接修改对象的颜色属性并提交更改
            objectState.color = color;
            this.commit();
        } else if (colorBy === ColorBy.GROUP && objectState.group) {
            // 组模式：通过Redux action更改整个组的颜色
            changeGroupColor(objectState.group.id, color);
        }
    };

    /**
     * 更改对象标签
     * 在非只读模式下更新对象的标签属性
     * @private
     * @param {any} label - 新的标签对象
     * @returns {void}
     */
    private changeLabel = (label: any): void => {
        // 解构获取对象状态和只读标识
        const { objectState, readonly } = this.props;
        // 只有在非只读模式下才允许更改标签
        if (!readonly) {
            // 更新对象的标签属性
            objectState.label = label;
            // 提交更改到状态管理
            this.commit();
        }
    };

    /**
     * 切换立方体方向
     * 通过重新排列点坐标来切换立方体的朝向（左向或右向）
     * @private
     * @returns {void}
     */
    private switchCuboidOrientation = (): void => {
        /**
         * 判断立方体是否为左向朝向
         * 通过比较第13个点和第1个点的x坐标来判断
         * @param {number[]} points - 立方体的点坐标数组
         * @returns {boolean} - 如果第13个点x坐标大于第1个点则为true（左向）
         */
        function cuboidOrientationIsLeft(points: number[]): boolean {
            return points[12] > points[0];
        }

        // 解构获取对象状态和只读标识
        const { objectState, readonly } = this.props;

        // 只有在非只读模式下且对象为立方体形状时才允许切换方向
        if (!readonly && objectState.shapeType === ShapeType.CUBOID) {
            // 获取立方体的点坐标数组
            const points = objectState.points as number[];
            // 先重置立方体视角，确保基础几何结构正确
            this.resetCuboidPerspective(false);
            // 根据当前朝向决定点坐标的移动方向：左向则前移4位，右向则后移4位
            objectState.points = shift(points, cuboidOrientationIsLeft(points) ? 4 : -4);
            // 提交更改到状态管理
            this.commit();
        }
    };

    /**
     * 重置立方体视角
     * 重新计算并设置立方体点的坐标，确保几何结构正确
     * @private
     * @param {boolean} [commit=true] - 是否在重置后自动提交更改，默认为true
     * @returns {void}
     */
    private resetCuboidPerspective = (commit = true): void => {
        /**
         * 判断立方体是否为左向朝向
         * 通过比较第13个点和第1个点的x坐标来判断
         * @param {number[]} points - 立方体的点坐标数组
         * @returns {boolean} - 如果第13个点x坐标大于第1个点则为true（左向）
         */
        function cuboidOrientationIsLeft(points: number[]): boolean {
            return points[12] > points[0];
        }

        // 解构获取对象状态和只读标识
        const { objectState, readonly } = this.props;

        // 只有在非只读模式下且对象为立方体形状时才允许重置视角
        if (!readonly && objectState.shapeType === ShapeType.CUBOID) {
            // 获取立方体的点坐标数组
            const points = objectState.points as number[];
            // 计算最小偏移量，用于微调点的位置避免重叠
            const minD = {
                x: (points[6] - points[2]) * 0.001,  // x方向最小偏移量
                y: (points[3] - points[1]) * 0.001,  // y方向最小偏移量
            };

            // 根据立方体朝向分别处理点的重新计算
            if (cuboidOrientationIsLeft(points)) {
                // 左向立方体：重新计算后面和侧面的点坐标
                points[14] = points[10] + points[2] - points[6] + minD.x;  // 后面右下角x
                points[15] = points[11] + points[3] - points[7];              // 后面右下角y
                points[8] = points[10] + points[4] - points[6];               // 侧面左下角x
                points[9] = points[11] + points[5] - points[7] + minD.y;    // 侧面左下角y
                points[12] = points[14] + points[0] - points[2];             // 后面左下角x
                points[13] = points[15] + points[1] - points[3] + minD.y;     // 后面左下角y
            } else {
                // 右向立方体：重新计算前面和侧面的点坐标
                points[10] = points[14] + points[6] - points[2] - minD.x;     // 前面右下角x
                points[11] = points[15] + points[7] - points[3];             // 前面右下角y
                points[12] = points[14] + points[0] - points[2];              // 前面左下角x
                points[13] = points[15] + points[1] - points[3] + minD.y;     // 前面左下角y
                points[8] = points[12] + points[4] - points[0] - minD.x;      // 侧面左下角x
                points[9] = points[13] + points[5] - points[1];               // 侧面左下角y
            }

            // 更新对象的点坐标
            objectState.points = points;
            // 如果指定了自动提交，则提交更改到状态管理
            if (commit) this.commit();
        }
    };

    /**
     * 运行标注动作
     * 打开标注动作模态框，传入当前对象状态作为默认参数
     * @private
     * @returns {void}
     */
    private runAnnotationAction = (): void => {
        // 解构获取对象状态
        const { objectState } = this.props;
        // 打开标注动作模态框，传入当前对象状态作为默认参数
        openAnnotationsActionModal({ defaultObjectState: objectState });
    };

    /**
     * 提交对象状态更改
     * 在非只读模式下通过Redux action更新对象状态
     * @private
     * @returns {void}
     */
    private commit(): void {
        // 解构获取对象状态、只读标识和更新状态的action creator
        const { objectState, readonly, updateState } = this.props;
        // 只有在非只读模式下才允许提交状态更改
        if (!readonly) {
            // 调用Redux action更新对象状态
            updateState(objectState);
        }
    }

    public render(): JSX.Element {
        const { labels, elements } = this.state;
        const {
            objectState,
            attributes,
            activated,
            colorBy,
            normalizedKeyMap,
            readonly,
            jobInstance,
            workspace,
        } = this.props;

        return (
            <ObjectStateItemComponent
                jobInstance={jobInstance}
                readonly={readonly}
                activated={activated}
                objectType={objectState.objectType}
                shapeType={objectState.shapeType}
                clientID={objectState.clientID as number}
                serverID={objectState.serverID}
                locked={objectState.lock}
                labelID={objectState.label.id as number}
                isGroundTruth={objectState.isGroundTruth}
                color={getColor(objectState, colorBy)}
                attributes={attributes}
                elements={elements}
                normalizedKeyMap={normalizedKeyMap}
                labels={labels}
                colorBy={colorBy}
                workspace={workspace}
                activate={this.activate}
                remove={this.remove}
                copy={this.copy}
                createURL={this.createURL}
                propagate={this.propagate}
                switchOrientation={this.switchOrientation}
                toBackground={this.toBackground}
                toForeground={this.toForeground}
                changeColor={this.changeColor}
                changeLabel={this.changeLabel}
                edit={this.edit}
                slice={this.slice}
                resetCuboidPerspective={this.resetCuboidPerspective}
                runAnnotationAction={this.runAnnotationAction}
            />
        );
    }
}

export default connect<StateToProps, DispatchToProps, OwnProps, CombinedState>(
    mapStateToProps,
    mapDispatchToProps,
)(ObjectItemContainer);
