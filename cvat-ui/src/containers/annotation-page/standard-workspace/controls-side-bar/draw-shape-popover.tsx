// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';
import { RadioChangeEvent } from 'antd/lib/radio';

import { CombinedState } from 'reducers';
import { rememberObject } from 'actions/annotation-actions';
import { Canvas, RectDrawingMethod, CuboidDrawingMethod } from 'cvat-canvas-wrapper';
import { Canvas3d } from 'cvat-canvas3d-wrapper';
import DrawShapePopoverComponent from 'components/annotation-page/standard-workspace/controls-side-bar/draw-shape-popover';
import { Label, ObjectType, ShapeType } from 'cvat-core-wrapper';

/**
 * 容器组件的自身属性接口
 */
interface OwnProps {
    /** 要绘制的形状类型 */
    shapeType: ShapeType;
}

/**
 * 通过Redux dispatch映射的属性接口
 */
interface DispatchToProps {
    /** 开始绘制时的回调函数 */
    onDrawStart(
        shapeType: ShapeType,
        labelID: number,
        objectType: ObjectType,
        points?: number,
        rectDrawingMethod?: RectDrawingMethod,
        cuboidDrawingMethod?: CuboidDrawingMethod,
    ): void;
}

/**
 * 通过Redux state映射的属性接口
 */
interface StateToProps {
    /** 标准化快捷键映射 */
    normalizedKeyMap: Record<string, string>;
    /** 画布实例 */
    canvasInstance: Canvas | Canvas3d;
    /** 形状类型 */
    shapeType: ShapeType;
    /** 标签列表 */
    labels: any[];
    /** 任务实例 */
    jobInstance: any;
}

/**
 * 将dispatch映射到组件属性
 * @param dispatch - Redux dispatch函数
 * @returns 包含onDrawStart方法的DispatchToProps对象
 */
function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onDrawStart(
            shapeType: ShapeType,
            labelID: number,
            objectType: ObjectType,
            points?: number,
            rectDrawingMethod?: RectDrawingMethod,
            cuboidDrawingMethod?: CuboidDrawingMethod,
        ): void {
            // 分发rememberObject action，记录当前激活的绘制对象配置
            dispatch(
                rememberObject({
                    activeObjectType: objectType,
                    activeShapeType: shapeType,
                    activeLabelID: labelID,
                    activeNumOfPoints: points,
                    activeRectDrawingMethod: rectDrawingMethod,
                    activeCuboidDrawingMethod: cuboidDrawingMethod,
                }),
            );
        },
    };
}

/**
 * 将Redux状态映射到组件属性
 * @param state - Redux全局状态
 * @param own - 组件自身属性
 * @returns 包含画布实例、标签列表等StateToProps对象
 */
function mapStateToProps(state: CombinedState, own: OwnProps): StateToProps {
    const {
        annotation: {
            canvas: { instance: canvasInstance },
            job: { labels, instance: jobInstance },
        },
        shortcuts: { normalizedKeyMap },
    } = state;

    return {
        ...own,
        canvasInstance: canvasInstance as Canvas,
        labels,
        normalizedKeyMap,
        jobInstance,
    };
}

// 组件属性类型，合并StateToProps和DispatchToProps
type Props = StateToProps & DispatchToProps;

/**
 * 组件状态接口
 */
interface State {
    /** 矩形绘制方法 */
    rectDrawingMethod?: RectDrawingMethod;
    /** 立方体绘制方法 */
    cuboidDrawingMethod?: CuboidDrawingMethod;
    /** 点数 */
    numberOfPoints?: number;
    /** 选中的标签ID */
    selectedLabelID: number | null;
}

/**
 * 绘制形状弹出框容器组件
 * 管理绘制形状时的配置选项，包括标签选择、绘制方法等
 */
class DrawShapePopoverContainer extends React.PureComponent<Props, State> {
    // 最小点数，默认为3（多边形）
    private minimumPoints = 3;
    // 符合当前形状类型的标签列表
    private satisfiedLabels: Label[];

    /**
     * 构造函数
     * @param props - 组件属性
     */
    constructor(props: Props) {
        super(props);

        const { shapeType } = props;
        // 筛选出符合当前形状类型的标签
        this.satisfiedLabels = props.labels.filter((label: Label) => {
            if (shapeType === ShapeType.SKELETON) {
                return label.type === ShapeType.SKELETON;
            }

            return ['any', shapeType].includes(label.type);
        });

        // 设置默认选中的标签ID
        const defaultLabelID = this.satisfiedLabels.length ? this.satisfiedLabels[0].id as number : null;
        const defaultRectDrawingMethod = RectDrawingMethod.CLASSIC;
        const defaultCuboidDrawingMethod = CuboidDrawingMethod.CLASSIC;
        
        // 初始化组件状态
        this.state = {
            selectedLabelID: defaultLabelID,
            rectDrawingMethod: shapeType === ShapeType.RECTANGLE ? defaultRectDrawingMethod : undefined,
            cuboidDrawingMethod: shapeType === ShapeType.CUBOID ? defaultCuboidDrawingMethod : undefined,
        };

        // 根据形状类型设置最小点数
        if (shapeType === ShapeType.POLYGON) {
            this.minimumPoints = 3;
        } else if (shapeType === ShapeType.POLYLINE) {
            this.minimumPoints = 2;
        } else if (shapeType === ShapeType.POINTS) {
            this.minimumPoints = 1;
        }
    }

    /**
     * 开始绘制形状或轨迹
     * @param objectType - 对象类型（形状或轨迹）
     */
    private onDraw(objectType: ObjectType): void {
        const {
            canvasInstance, shapeType, onDrawStart, labels,
        } = this.props;

        const {
            rectDrawingMethod, cuboidDrawingMethod, numberOfPoints, selectedLabelID,
        } = this.state;

        // 取消当前画布上的任何操作
        canvasInstance.cancel();

        // 查找选中的标签
        const selectedLabel = labels.find((label) => label.id === selectedLabelID);
        if (selectedLabel) {
            // 配置画布并启用绘制模式
            canvasInstance.draw({
                enabled: true,
                rectDrawingMethod,
                cuboidDrawingMethod,
                numberOfPoints,
                shapeType,
                // 如果是骨架类型，使用标签结构中的SVG
                skeletonSVG: selectedLabel && selectedLabel.type === ShapeType.SKELETON ?
                    selectedLabel.structure.svg : undefined,
                // 为特定形状类型启用十字准线
                crosshair: [ShapeType.RECTANGLE, ShapeType.CUBOID, ShapeType.ELLIPSE].includes(shapeType),
            });

            // 调用绘制开始回调
            onDrawStart(
                shapeType,
                selectedLabel.id,
                objectType,
                numberOfPoints,
                rectDrawingMethod,
                cuboidDrawingMethod,
            );
        }
    }

    /**
     * 矩形绘制方法变更处理函数
     * @param event - 单选按钮变更事件
     */
    private onChangeRectDrawingMethod = (event: RadioChangeEvent): void => {
        this.setState({
            rectDrawingMethod: event.target.value,
        });
    };

    /**
     * 立方体绘制方法变更处理函数
     * @param event - 单选按钮变更事件
     */
    private onChangeCuboidDrawingMethod = (event: RadioChangeEvent): void => {
        this.setState({
            cuboidDrawingMethod: event.target.value,
        });
    };

    /**
     * 绘制形状处理函数
     */
    private onDrawShape = (): void => {
        this.onDraw(ObjectType.SHAPE);
    };

    /**
     * 绘制轨迹处理函数
     */
    private onDrawTrack = (): void => {
        this.onDraw(ObjectType.TRACK);
    };

    /**
     * 点数变更处理函数
     * @param value - 新的点数
     */
    private onChangePoints = (value: number | undefined): void => {
        this.setState({
            numberOfPoints: value,
        });
    };

    /**
     * 标签变更处理函数
     * @param value - 新选中的标签
     */
    private onChangeLabel = (value: Label): void => {
        this.setState({ selectedLabelID: value.id as number });
    };

    /**
     * 渲染组件
     * @returns 组件JSX元素
     */
    public render(): JSX.Element {
        const { satisfiedLabels } = this;
        const { normalizedKeyMap, shapeType, jobInstance } = this.props;
        const {
            rectDrawingMethod, cuboidDrawingMethod, selectedLabelID, numberOfPoints,
        } = this.state;

        return (
            <DrawShapePopoverComponent
                jobInstance={jobInstance}
                labels={satisfiedLabels}
                shapeType={shapeType}
                minimumPoints={this.minimumPoints}
                selectedLabelID={selectedLabelID}
                numberOfPoints={numberOfPoints}
                rectDrawingMethod={rectDrawingMethod}
                cuboidDrawingMethod={cuboidDrawingMethod}
                repeatShapeShortcut={normalizedKeyMap.SWITCH_DRAW_MODE_STANDARD_CONTROLS}
                onChangeLabel={this.onChangeLabel}
                onChangePoints={this.onChangePoints}
                onChangeRectDrawingMethod={this.onChangeRectDrawingMethod}
                onChangeCuboidDrawingMethod={this.onChangeCuboidDrawingMethod}
                onDrawTrack={this.onDrawTrack}
                onDrawShape={this.onDrawShape}
            />
        );
    }
}

// 使用Redux connect高阶组件连接容器组件
export default connect(mapStateToProps, mapDispatchToProps)(DrawShapePopoverContainer);