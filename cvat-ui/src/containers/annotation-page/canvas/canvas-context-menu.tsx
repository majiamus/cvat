// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import PropTypes from 'prop-types';

import { connect } from 'react-redux';
import {
    CombinedState, ContextMenuType, NewIssueSource, Workspace,
} from 'reducers';

import CanvasContextMenuComponent from 'components/annotation-page/canvas/views/canvas2d/canvas-context-menu';
import { copyShape, pasteShapeAsync, updateCanvasContextMenu } from 'actions/annotation-actions';
import { reviewActions, finishIssueAsync } from 'actions/review-actions';
import { ThunkDispatch } from 'utils/redux';
import { Canvas } from 'cvat-canvas-wrapper';
import { ObjectState, ShapeType, QualityConflict } from 'cvat-core-wrapper';

/**
 * 组件自身的属性接口
 * 定义了CanvasContextMenuContainer组件接收的外部属性
 */
interface OwnProps {
    /** 是否只读模式，禁用编辑功能 */
    readonly?: boolean;
}

/**
 * Redux状态映射属性接口
 * 定义了从Redux store映射到组件的状态属性
 */
interface StateToProps {
    /** 父级对象的客户端ID，用于处理嵌套对象（如轨迹中的形状） */
    contextMenuParentID: number | null;
    /** 当前右键菜单关联对象的客户端ID */
    contextMenuClientID: number | null;
    /** Canvas画布实例，用于与画布交互 */
    canvasInstance: Canvas | null;
    /** 当前帧中所有对象的状态数组 */
    objectStates: ObjectState[];
    /** 当前帧的质量冲突信息 */
    frameConflicts: QualityConflict[];
    /** 右键菜单是否可见 */
    visible: boolean;
    /** 右键菜单的垂直位置（像素） */
    top: number;
    /** 右键菜单的水平位置（像素） */
    left: number;
    /** 右键菜单类型（如点菜单、形状菜单等） */
    type: ContextMenuType;
    /** 对象是否折叠（用于分组对象） */
    collapsed: boolean | undefined;
    /** 当前工作空间类型（标准、审查等） */
    workspace: Workspace;
    /** 最新的审查评论列表 */
    latestComments: string[];
    /** 当前激活对象的ID */
    activatedStateID: number | null;
}

/**
 * Redux动作映射属性接口
 * 定义了从Redux dispatch映射到组件的动作方法
 */
interface DispatchToProps {
    /**
     * 更新右键菜单状态
     * @param visible - 是否显示菜单
     * @param left - 菜单水平位置
     * @param top - 菜单垂直位置
     * @param pointID - 关联的点ID（可选）
     * @param type - 菜单类型（可选）
     */
    onUpdateContextMenu(
        visible: boolean, left: number, top: number,
        pointID: number | null, type?: ContextMenuType,
    ): void;
    /**
     * 开始创建问题
     * @param position - 问题位置坐标
     */
    onStartIssue(position: number[]): void;
    /**
     * 打开问题并添加消息
     * @param position - 问题位置坐标
     * @param message - 问题描述消息
     */
    openIssue(position: number[], message: string): void;
    /**
     * 复制对象
     * @param objectState - 要复制的对象状态
     */
    onCopyObject(objectState: ObjectState): void;
}

/**
 * Redux状态映射函数
 * 将全局状态转换为组件的props
 * @param state - Redux全局状态
 * @returns 映射后的状态属性对象
 */
function mapStateToProps(state: CombinedState): StateToProps {
    // 从全局状态中提取所需的数据
    const {
        annotation: {
            annotations: { collapsed, states: objectStates, activatedStateID },
            canvas: {
                instance,
                contextMenu: {
                    visible, top, left, type, clientID, parentID,
                },
                ready,
            },
            workspace,
        },
        review: { latestComments, frameConflicts },
    } = state;

    // 查找与右键菜单关联的对象状态
    let objectState = objectStates.find((_state: ObjectState) => {
        // 如果有父ID，查找父对象；否则查找当前对象
        if (Number.isInteger(parentID)) return _state.clientID === parentID;
        return _state.clientID === clientID;
    });
    
    // 如果找到父对象且当前对象是子元素，进一步查找具体的子元素
    if (Number.isInteger(parentID) && objectState) {
        objectState = objectState.elements.find((_state: ObjectState) => _state.clientID === clientID);
    }

    return {
        contextMenuClientID: clientID,
        contextMenuParentID: parentID,
        collapsed: clientID !== null ? collapsed[clientID] : undefined,
        activatedStateID,
        objectStates,
        // 确保canvas实例是Canvas类型，过滤掉Canvas3d等其他类型
        canvasInstance: instance instanceof Canvas ? instance : null,
        // 右键菜单可见性条件：有对象ID、菜单状态为可见、画布就绪、找到对应对象
        visible:
            clientID !== null &&
            visible &&
            ready &&
            !!objectState,
        left,
        top,
        type,
        workspace,
        latestComments,
        frameConflicts,
    };
}

/**
 * Redux动作映射函数
 * 将dispatch方法转换为组件的props方法
 * @param dispatch - Redux dispatch函数
 * @returns 映射后的动作属性对象
 */
function mapDispatchToProps(dispatch: ThunkDispatch): DispatchToProps {
    return {
        /**
         * 更新右键菜单状态
         * 派发更新画布右键菜单的action
         */
        onUpdateContextMenu(
            visible: boolean, left: number, top: number,
            pointID: number | null, type?: ContextMenuType,
        ): void {
            dispatch(updateCanvasContextMenu(visible, left, top, pointID, type));
        },
        /**
         * 开始创建问题
         * 派发开始审查问题的action，并隐藏右键菜单
         */
        onStartIssue(position: number[]): void {
            dispatch(reviewActions.startIssue(position));
            dispatch(updateCanvasContextMenu(false, 0, 0)); // 隐藏菜单
        },
        /**
         * 打开问题并添加消息
         * 派发快速创建问题的action，完成后隐藏右键菜单
         */
        openIssue(position: number[], message: string): void {
            dispatch(reviewActions.startIssue(position, NewIssueSource.QUICK_ISSUE));
            dispatch(finishIssueAsync(message));
            dispatch(updateCanvasContextMenu(false, 0, 0)); // 隐藏菜单
        },
        /**
         * 复制对象
         * 先复制形状，然后异步粘贴到画布上
         */
        onCopyObject(objectState: ObjectState): void {
            dispatch(copyShape(objectState));
            dispatch(pasteShapeAsync());
        },
    };
}

/**
 * 组件的完整属性类型
 * 合并了状态属性、动作属性和自身属性
 */
type Props = StateToProps & DispatchToProps & OwnProps;

/**
 * 组件内部状态接口
 * 用于管理右键菜单的位置状态
 */
interface State {
    /** 记录最新的左侧位置，用于位置同步 */
    latestLeft: number;
    /** 记录最新的顶部位置，用于位置同步 */
    latestTop: number;
    /** 当前的左侧位置 */
    left: number;
    /** 当前的顶部位置 */
    top: number;
}

/**
 * 画布右键菜单容器组件
 * 负责管理右键菜单的状态、位置、事件处理和渲染
 * 继承自React.PureComponent以优化性能，仅在props或state变化时重新渲染
 */
class CanvasContextMenuContainer extends React.PureComponent<Props, State> {
    /** Prop类型验证 */
    static propTypes = {
        readonly: PropTypes.bool,
    };

    /** 默认props值 */
    static defaultProps = {
        readonly: false,
    };

    /** 初始化状态：是否已初始化DOM元素 */
    private initialized: HTMLDivElement | null;
    /** 拖拽状态：是否正在拖拽菜单 */
    private dragging: boolean;
    /** 拖拽初始X坐标：记录拖拽开始时的鼠标X位置 */
    private dragInitPosX: number;
    /** 拖拽初始Y坐标：记录拖拽开始时的鼠标Y位置 */
    private dragInitPosY: number;

    /**
     * 构造函数
     * 初始化组件状态和私有属性
     * @param props - 组件属性
     */
    public constructor(props: Props) {
        super(props);

        // 初始化私有属性
        this.initialized = null;
        this.dragging = false;
        this.dragInitPosX = 0;
        this.dragInitPosY = 0;
        
        // 初始化组件状态
        this.state = {
            latestLeft: 0,  // 记录最新的左侧位置
            latestTop: 0,   // 记录最新的顶部位置
            left: 0,        // 当前的左侧位置
            top: 0,         // 当前的顶部位置
        };
    }

    /**
     * 派生状态静态方法
     * 当props的位置发生变化时，同步更新state中的位置信息
     * @param props - 最新的props
     * @param state - 当前state
     * @returns 更新后的state或null（不更新）
     */
    static getDerivedStateFromProps(props: Readonly<Props>, state: State): State | null {
        // 如果位置没有变化，不需要更新state
        if (props.left === state.latestLeft && props.top === state.latestTop) {
            return null;
        }

        // 同步props中的位置到state
        return {
            ...state,
            latestLeft: props.left,  // 更新最新的左侧位置记录
            latestTop: props.top,    // 更新最新的顶部位置记录
            top: props.top,          // 更新当前的顶部位置
            left: props.left,        // 更新当前的左侧位置
        };
    }

    /**
     * 组件挂载完成后的生命周期方法
     * 初始化事件监听器并更新菜单位置
     */
    public componentDidMount(): void {
        const { canvasInstance } = this.props;
        
        // 确保菜单不会超出屏幕边界
        this.updatePositionIfOutOfScreen();

        // 添加全局鼠标移动事件监听，用于拖拽菜单
        window.addEventListener('mousemove', this.moveContextMenu);
        
        // 如果画布实例存在，添加画布相关的事件监听
        if (canvasInstance) {
            canvasInstance.html().addEventListener('canvas.clicked', this.onClickCanvas);
            canvasInstance.html().addEventListener('contextmenu', this.onOpenCanvasContextMenu);
            canvasInstance.html().addEventListener('canvas.contextmenu', this.onCanvasPointContextMenu);
        }
    }

    /**
     * 组件更新后的生命周期方法
     * 处理折叠状态变化和DOM元素初始化
     * @param prevProps - 更新前的props
     */
    public componentDidUpdate(prevProps: Props): void {
        const { collapsed } = this.props;

        // 获取右键菜单的DOM元素
        const [element] = window.document.getElementsByClassName('cvat-canvas-context-menu');
        
        // 如果折叠状态发生变化，等待过渡动画完成后更新位置
        if (collapsed !== prevProps.collapsed && element) {
            element.addEventListener(
                'transitionend',
                () => {
                    this.updatePositionIfOutOfScreen();
                },
                { once: true }, // 只监听一次，避免内存泄漏
            );
        } else if (element) {
            // 否则直接更新位置
            this.updatePositionIfOutOfScreen();
        }

        // 如果找到菜单元素且未初始化或元素发生变化，添加拖拽事件监听
        if (element && (!this.initialized || this.initialized !== element)) {
            this.initialized = element as HTMLDivElement;

            // 添加鼠标按下事件：开始拖拽
            this.initialized.addEventListener('mousedown', (e: MouseEvent): any => {
                this.dragging = true;
                this.dragInitPosX = e.clientX;  // 记录起始X坐标
                this.dragInitPosY = e.clientY;  // 记录起始Y坐标
            });

            // 添加鼠标释放事件：结束拖拽
            this.initialized.addEventListener('mouseup', () => {
                this.dragging = false;
            });
        }
    }

    /**
     * 组件卸载前的生命周期方法
     * 清理所有事件监听器，防止内存泄漏
     */
    public componentWillUnmount(): void {
        const { canvasInstance } = this.props;
        
        // 移除全局鼠标移动事件监听
        window.removeEventListener('mousemove', this.moveContextMenu);
        
        // 如果画布实例存在，移除画布相关的事件监听
        if (canvasInstance) {
            canvasInstance.html().removeEventListener('canvas.clicked', this.onClickCanvas);
            canvasInstance.html().removeEventListener('contextmenu', this.onOpenCanvasContextMenu);
            canvasInstance.html().removeEventListener('canvas.contextmenu', this.onCanvasPointContextMenu);
        }
    }

    /**
     * 画布点击事件处理器
     * 当画布被点击时隐藏右键菜单
     */
    private onClickCanvas = (): void => {
        const { visible, onUpdateContextMenu } = this.props;
        if (visible) {
            // 如果菜单当前可见，隐藏菜单并重置位置
            onUpdateContextMenu(false, 0, 0, null, ContextMenuType.CANVAS_SHAPE);
        }
    };

    /**
     * 画布右键菜单事件处理器
     * 处理画布上的右键点击事件，显示形状右键菜单
     * @param e - 鼠标事件对象
     */
    private onOpenCanvasContextMenu = (e: MouseEvent): void => {
        const { activatedStateID, onUpdateContextMenu } = this.props;
        
        // 确保点击目标不是控制点（避免与控制点右键菜单冲突）
        if (e.target && !(e.target as HTMLElement).classList.contains('svg_select_points')) {
            onUpdateContextMenu(
                activatedStateID !== null,  // 是否有激活的对象
                e.clientX,                    // 鼠标X坐标
                e.clientY,                    // 鼠标Y坐标
                null,                         // 无特定点ID
                ContextMenuType.CANVAS_SHAPE, // 形状菜单类型
            );
        }
    };

    /**
     * 画布点右键菜单事件处理器
     * 处理画布上点的右键点击事件，显示点右键菜单
     * @param e - 自定义事件对象，包含鼠标事件和点信息
     */
    private onCanvasPointContextMenu = (e: any): void => {
        const { objectStates, activatedStateID, onUpdateContextMenu } = this.props;

        // 查找当前激活的对象状态
        const [state] = objectStates.filter((el: any) => el.clientID === activatedStateID);
        
        // 只对特定形状类型显示点菜单（排除立方体、矩形、遮罩）
        if (![ShapeType.CUBOID, ShapeType.RECTANGLE, ShapeType.MASK].includes(state.shapeType)) {
            onUpdateContextMenu(
                activatedStateID !== null,           // 是否有激活的对象
                e.detail.mouseEvent.clientX,       // 鼠标X坐标
                e.detail.mouseEvent.clientY,         // 鼠标Y坐标
                e.detail.pointID,                    // 特定点ID
                ContextMenuType.CANVAS_SHAPE_POINT,  // 点菜单类型
            );
        }
    };

    /**
     * 移动右键菜单事件处理器
     * 处理菜单的拖拽移动逻辑
     * @param e - 鼠标事件对象
     */
    private moveContextMenu = (e: MouseEvent): void => {
        if (this.dragging) {
            this.setState((state) => {
                // 计算新的位置：当前位置 + 鼠标移动距离
                const value = {
                    left: state.left + e.clientX - this.dragInitPosX,
                    top: state.top + e.clientY - this.dragInitPosY,
                };

                // 更新拖拽起始位置，为下一次移动做准备
                this.dragInitPosX = e.clientX;
                this.dragInitPosY = e.clientY;

                return value;
            });

            // 阻止默认行为，避免选中文本等问题
            e.preventDefault();
        }
    };

    /**
     * 更新菜单位置（如果超出屏幕）
     * 确保菜单始终完全显示在屏幕内
     */
    private updatePositionIfOutOfScreen(): void {
        const { top, left } = this.state;
        const { innerWidth, innerHeight } = window;

        // 获取菜单元素
        const [element] = window.document.getElementsByClassName('cvat-canvas-context-menu');
        if (element) {
            const height = element.clientHeight;
            const width = element.clientWidth;

            // 如果菜单超出屏幕边界，调整位置
            if (top + height > innerHeight || left + width > innerWidth) {
                this.setState({
                    // 垂直方向：如果超出底部，向上移动超出部分的距离
                    top: top - Math.max(top + height - innerHeight, 0),
                    // 水平方向：如果超出右侧，向左移动超出部分的距离
                    left: left - Math.max(left + width - innerWidth, 0),
                });
            }
        }
    }

    /**
     * 渲染方法
     * 根据菜单类型渲染对应的右键菜单组件
     * @returns 渲染的JSX元素或null
     */
    public render(): JSX.Element | null {
        const { left, top } = this.state;
        const {
            visible,
            contextMenuClientID,
            contextMenuParentID,
            objectStates,
            frameConflicts,
            type,
            readonly,
            workspace,
            latestComments,
            onStartIssue,
            openIssue,
            onCopyObject,
        } = this.props;

        // 只渲染形状类型的右键菜单，其他类型返回null
        return (
            type === ContextMenuType.CANVAS_SHAPE ? (
                <CanvasContextMenuComponent
                    contextMenuClientID={contextMenuClientID}
                    contextMenuParentID={contextMenuParentID}
                    readonly={readonly}
                    left={left}
                    top={top}
                    visible={visible}
                    objectStates={objectStates}
                    frameConflicts={frameConflicts}
                    workspace={workspace}
                    latestComments={latestComments}
                    onStartIssue={onStartIssue}
                    openIssue={openIssue}
                    onCopyObject={onCopyObject}
                />
            ) : null
        );
    }
}

/**
 * 连接Redux与组件
 * 使用connect高阶组件将Redux状态和动作映射到CanvasContextMenuContainer组件
 * 这是Redux的经典连接方式，在Zustand中可以使用useStore hook替代
 */
export default connect(mapStateToProps, mapDispatchToProps)(CanvasContextMenuContainer);
