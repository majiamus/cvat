// Copyright (C) 2019-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/* eslint-disable */
import * as SVG from 'svg.js';
import 'svg.draggable.js';
import 'svg.resize.js';
import 'svg.select.js';
import 'svg.draw.js';

import consts from './consts';
import { Equation, CuboidModel, Orientation, Edge } from './cuboid';
import { Point, parsePoints, clamp } from './shared';

/**
 * 更新SVG.Element.prototype.draw构造函数
 * 修复原始draw方法，确保在创建和销毁处理器的边缘情况下正确工作
 * 为每个元素添加set属性，用于管理绘制过程中的点集合
 */
const originalDraw = SVG.Element.prototype.draw;
SVG.Element.prototype.draw = function constructor(...args: any): any {
    // 获取已存在的paint handler
    let handler = this.remember('_paintHandler');
    if (!handler) {
        // 如果不存在，调用原始draw方法创建handler
        originalDraw.call(this, ...args);
        handler = this.remember('_paintHandler');
        // 处理边缘情况：绘制单个点时handler可能在同一调用栈中被创建和销毁
        // 需要检查handler是否仍然存在
        if (handler && !handler.set) {
            // 为handler添加set属性，用于管理点集合
            handler.set = new SVG.Set();
        }
    } else {
        // 如果handler已存在，直接调用原始draw方法
        originalDraw.call(this, ...args);
    }

    return this;
};

// 将原始draw方法的所有属性复制到新的draw方法上
for (const key of Object.keys(originalDraw)) {
    SVG.Element.prototype.draw[key] = originalDraw[key];
}

/**
 * 为多边形和折线创建撤销功能
 * 移除最后绘制的点并更新图形
 */
function undo(): void {
    // 检查是否存在点集合且集合不为空
    if (this.set && this.set.length()) {
        // 从集合中移除最后一个点并从DOM中删除对应的元素
        this.set.members.splice(-1, 1)[0].remove();
        // 从数组中移除最后两个值（x, y坐标）
        this.el.array().value.splice(-2, 1);
        // 重新绘制图形
        this.el.plot(this.el.array());
        // 触发撤销点事件
        this.el.fire('undopoint');
    }
}

// 为折线添加撤销功能
SVG.Element.prototype.draw.extend(
    'polyline',
    Object.assign({}, SVG.Element.prototype.draw.plugins.polyline, {
        undo: undo,
    }),
);

// 为多边形添加撤销功能
SVG.Element.prototype.draw.extend(
    'polygon',
    Object.assign({}, SVG.Element.prototype.draw.plugins.polygon, {
        undo: undo,
    }),
);

/**
 * 定义圆形控制点的描边颜色
 */
export const CIRCLE_STROKE = '#000';

/**
 * 修复drawCircles方法
 * 在图形的每个顶点绘制可拖动的圆形控制点
 * 用于在绘制和编辑过程中提供视觉反馈和交互点
 */
function drawCircles(): void {
    // 获取图形的所有顶点坐标
    const array = this.el.array().valueOf();

    // 移除所有现有的控制点
    this.set.each(function (): void {
        this.remove();
    });

    // 清空控制点集合
    this.set.clear();

    // 为每个顶点（除最后一个外）创建圆形控制点
    for (let i = 0; i < array.length - 1; ++i) {
        // 设置当前点的x坐标
        [this.p.x] = array[i];
        // 设置当前点的y坐标
        [, this.p.y] = array[i];

        // 将点坐标转换为SVG坐标系
        const p = this.p.matrixTransform(
            this.parent.node.getScreenCTM().inverse().multiply(this.el.node.getScreenCTM()),
        );

        // 创建并添加圆形控制点
        this.set.add(
            this.parent
                .circle(5) // 创建半径为5的圆
                .stroke({
                    width: 1,
                    color: CIRCLE_STROKE, // 使用预定义的描边颜色
                })
                .fill('#ccc') // 设置填充颜色为浅灰色
                .center(p.x, p.y), // 将圆心设置在转换后的坐标位置
        );
    }
}

// 为线条添加修复后的drawCircles方法
SVG.Element.prototype.draw.extend(
    'line',
    Object.assign({}, SVG.Element.prototype.draw.plugins.line, {
        drawCircles: drawCircles,
    }),
);

// 为折线添加修复后的drawCircles方法
SVG.Element.prototype.draw.extend(
    'polyline',
    Object.assign({}, SVG.Element.prototype.draw.plugins.polyline, {
        drawCircles: drawCircles,
    }),
);

// 为多边形添加修复后的drawCircles方法
SVG.Element.prototype.draw.extend(
    'polygon',
    Object.assign({}, SVG.Element.prototype.draw.plugins.polygon, {
        drawCircles: drawCircles,
    }),
);

/**
 * 修复拖拽方法
 * 修复SVG.Element.prototype.draggable方法，确保在拖拽过程中正确处理坐标转换
 */
const originalDraggable = SVG.Element.prototype.draggable;
SVG.Element.prototype.draggable = function constructor(...args: any): any {
    // 获取已存在的拖拽处理器
    let handler = this.remember('_draggable');
    if (!handler) {
        // 如果不存在，调用原始draggable方法创建handler
        originalDraggable.call(this, ...args);
        handler = this.remember('_draggable');
        // 重写drag方法，修复坐标转换问题
        handler.drag = function (e: any) {
            // 获取屏幕坐标系到SVG坐标系的转换矩阵
            this.m = this.el.node.getScreenCTM().inverse();
            // 调用原始drag方法
            return handler.constructor.prototype.drag.call(this, e);
        };
    } else {
        // 如果handler已存在，直接调用原始draggable方法
        originalDraggable.call(this, ...args);
    }

    return this;
};

// 将原始draggable方法的所有属性复制到新的draggable方法上
for (const key of Object.keys(originalDraggable)) {
    SVG.Element.prototype.draggable[key] = originalDraggable[key];
}

/**
 * 修复调整大小方法
 * 修复SVG.Element.prototype.resize方法，添加对特殊键和形状类型的处理
 * 支持立方体透视变换和矩形精确旋转
 */
const originalResize = SVG.Element.prototype.resize;
SVG.Element.prototype.resize = function constructor(...args: any): any {
    // 获取已存在的调整大小处理器
    let handler = this.remember('_resizeHandler');
    if (!handler) {
        // 如果不存在，调用原始resize方法创建handler
        originalResize.call(this, ...args);
        handler = this.remember('_resizeHandler');
        // 重写resize方法，添加特殊键和形状类型的处理
        handler.resize = function (e: any) {
            // 从事件详情中获取原始事件对象
            const { event } = e.detail;
            // 记录是否按下了旋转点
            this.rotationPointPressed = e.type === 'rot';
            // 检查是否应该执行调整大小操作
            if (
                event.button === 0 && // 只响应左键点击
                // 对于立方体（改变透视）和矩形（精确旋转），忽略shift键
                (!event.shiftKey || (
                    this.el.parent().hasClass('cvat_canvas_shape_cuboid') // 立方体形状
                    || this.el.type  === 'rect') // 矩形形状
                ) && !event.altKey // 不响应alt键
            ) {
                // 调用原始resize方法
                return handler.constructor.prototype.resize.call(this, e);
            }
        };
        // 重写update方法，修复坐标转换问题
        handler.update = function (e: any) {
            // 如果没有按下旋转点，更新坐标转换矩阵
            if (!this.rotationPointPressed) {
                this.m = this.el.node.getScreenCTM().inverse();
            }
            // 调用原始update方法
            handler.constructor.prototype.update.call(this, e);
        };
    } else {
        // 如果handler已存在，直接调用原始resize方法
        originalResize.call(this, ...args);
    }

    return this;
};

// 将原始resize方法的所有属性复制到新的resize方法上
for (const key of Object.keys(originalResize)) {
    SVG.Element.prototype.resize[key] = originalResize[key];
}

/**
 * 立方体边缘索引枚举
 * 定义立方体的四个主要边缘：前左(FL)、前右(FR)、后右(DR)、后左(DL)
 */
enum EdgeIndex {
    FL = 1, // 前左边缘 (Front Left)
    FR = 2, // 前右边缘 (Front Right)
    DR = 3, // 后右边缘 (Down Right)
    DL = 4, // 后左边缘 (Down Left)
}

/**
 * 根据立方体点的索引获取对应的边缘索引
 * @param cuboidPoint 立方体点的索引（0-7）
 * @returns 对应的边缘索引
 */
function getEdgeIndex(cuboidPoint: number): EdgeIndex {
    switch (cuboidPoint) {
        case 0:
        case 1:
            return EdgeIndex.FL; // 点0和1属于前左边缘
        case 2:
        case 3:
            return EdgeIndex.FR; // 点2和3属于前右边缘
        case 4:
        case 5:
            return EdgeIndex.DR; // 点4和5属于后右边缘
        default:
            return EdgeIndex.DL; // 点6和7属于后左边缘
    }
}

/**
 * 根据边缘索引获取对应的立方体点索引
 * 返回构成该边缘的两个点的索引
 * @param edgeIndex 边缘索引
 * @returns 构成该边缘的两个点的索引数组
 */
function getTopDown(edgeIndex: EdgeIndex): number[] {
    switch (edgeIndex) {
        case EdgeIndex.FL:
            return [0, 1]; // 前左边缘由点0和1构成
        case EdgeIndex.FR:
            return [2, 3]; // 前右边缘由点2和3构成
        case EdgeIndex.DR:
            return [4, 5]; // 后右边缘由点4和5构成
        default:
            return [6, 7]; // 后左边缘由点6和7构成
    }
}

(SVG as any).Cube = SVG.invent({
    create: 'g',
    inherit: SVG.G,
    extend: {
        constructorMethod(points: string) {
            this.cuboidModel = new CuboidModel(parsePoints(points));
            this.setupFaces();
            this.setupEdges();
            this.setupProjections();
            this.hideProjections();

            this._attr('points', points);
            this.addClass('cvat_canvas_shape_cuboid');
            return this;
        },

        setupFaces() {
            this.bot = this.polygon(this.cuboidModel.bot.points);
            this.top = this.polygon(this.cuboidModel.top.points);
            this.right = this.polygon(this.cuboidModel.right.points);
            this.left = this.polygon(this.cuboidModel.left.points);
            this.dorsal = this.polygon(this.cuboidModel.dorsal.points);
            this.face = this.polygon(this.cuboidModel.front.points);
        },

        setupProjections() {
            this.ftProj = this.line(
                this.updateProjectionLine(
                    this.cuboidModel.ft.getEquation(),
                    this.cuboidModel.ft.points[0],
                    this.cuboidModel.vpl,
                ),
            );
            this.fbProj = this.line(
                this.updateProjectionLine(
                    this.cuboidModel.fb.getEquation(),
                    this.cuboidModel.ft.points[0],
                    this.cuboidModel.vpl,
                ),
            );
            this.rtProj = this.line(
                this.updateProjectionLine(
                    this.cuboidModel.rt.getEquation(),
                    this.cuboidModel.rt.points[1],
                    this.cuboidModel.vpr,
                ),
            );
            this.rbProj = this.line(
                this.updateProjectionLine(
                    this.cuboidModel.rb.getEquation(),
                    this.cuboidModel.rb.points[1],
                    this.cuboidModel.vpr,
                ),
            );

            this.ftProj.stroke({ color: '#C0C0C0' }).addClass('cvat_canvas_cuboid_projections');
            this.fbProj.stroke({ color: '#C0C0C0' }).addClass('cvat_canvas_cuboid_projections');
            this.rtProj.stroke({ color: '#C0C0C0' }).addClass('cvat_canvas_cuboid_projections');
            this.rbProj.stroke({ color: '#C0C0C0' }).addClass('cvat_canvas_cuboid_projections');
        },

        setupEdges() {
            this.frontLeftEdge = this.line(this.cuboidModel.fl.points);
            this.frontRightEdge = this.line(this.cuboidModel.fr.points);
            this.dorsalRightEdge = this.line(this.cuboidModel.dr.points);
            this.dorsalLeftEdge = this.line(this.cuboidModel.dl.points);

            this.frontTopEdge = this.line(this.cuboidModel.ft.points);
            this.rightTopEdge = this.line(this.cuboidModel.rt.points);
            this.frontBotEdge = this.line(this.cuboidModel.fb.points);
            this.rightBotEdge = this.line(this.cuboidModel.rb.points);
        },

        setupGrabPoints(circleType: Function | string) {
            const viewModel = this.cuboidModel;
            const circle = typeof circleType === 'function' ? circleType : this.circle;

            this.flCenter = circle(0, 0).addClass('svg_select_points').addClass('svg_select_points_l');
            this.frCenter = circle(0, 0).addClass('svg_select_points').addClass('svg_select_points_r');
            this.ftCenter = circle(0, 0).addClass('svg_select_points').addClass('svg_select_points_t');
            this.fbCenter = circle(0, 0).addClass('svg_select_points').addClass('svg_select_points_b');

            this.drCenter = circle(0, 0).addClass('svg_select_points').addClass('svg_select_points_ew');
            this.dlCenter = circle(0, 0).addClass('svg_select_points').addClass('svg_select_points_ew');

            const grabPoints = this.getGrabPoints();
            const edges = this.getEdges();
            for (let i = 0; i < grabPoints.length; i += 1) {
                const edge = edges[i];
                const cx = (edge.attr('x2') + edge.attr('x1')) / 2;
                const cy = (edge.attr('y2') + edge.attr('y1')) / 2;
                grabPoints[i].center(cx, cy);
            }

            if (viewModel.orientation === Orientation.LEFT) {
                this.dlCenter.hide();
            } else {
                this.drCenter.hide();
            }
        },

        showProjections() {
            if (this.projectionLineEnable) {
                this.ftProj.show();
                this.fbProj.show();
                this.rtProj.show();
                this.rbProj.show();
            }
        },

        hideProjections() {
            this.ftProj.hide();
            this.fbProj.hide();
            this.rtProj.hide();
            this.rbProj.hide();
        },

        getEdges() {
            const arr = [];
            arr.push(this.frontLeftEdge);
            arr.push(this.frontRightEdge);
            arr.push(this.dorsalRightEdge);
            arr.push(this.frontTopEdge);
            arr.push(this.frontBotEdge);
            arr.push(this.dorsalLeftEdge);
            arr.push(this.rightTopEdge);
            arr.push(this.rightBotEdge);
            return arr;
        },

        getGrabPoints() {
            const arr = [];
            arr.push(this.flCenter);
            arr.push(this.frCenter);
            arr.push(this.drCenter);
            arr.push(this.ftCenter);
            arr.push(this.fbCenter);
            arr.push(this.dlCenter);
            return arr;
        },

        updateProjectionLine(equation: Equation, source: Point, direction: Point) {
            const x1 = source.x;
            const y1 = equation.getY(x1);

            const x2 = direction.x;
            const y2 = equation.getY(x2);
            return [
                [x1, y1],
                [x2, y2],
            ];
        },

        selectize(value: boolean, options: object) {
            this.face.selectize(value, options);

            if (this.cuboidModel.orientation === Orientation.LEFT) {
                this.dorsalLeftEdge.selectize(false, options);
                this.dorsalRightEdge.selectize(value, options);
            } else {
                this.dorsalRightEdge.selectize(false, options);
                this.dorsalLeftEdge.selectize(value, options);
            }

            if (value === false) {
                this.getGrabPoints().forEach((point: SVG.Element) => {
                    point && point.remove();
                });
            } else {
                this.setupGrabPoints(
                    this.face
                        .remember('_selectHandler')
                        .drawPoint.bind({ nested: this, options: this.face.remember('_selectHandler').options }),
                );

                // setup proper classes for selection points for proper cursor
                Array.from(this.face.remember('_selectHandler').nested.node.children).forEach(
                    (point: SVG.LinkedHTMLElement, i: number) => {
                        point.classList.add(`svg_select_points_${['lt', 'lb', 'rb', 'rt'][i]}`);
                    },
                );

                if (this.cuboidModel.orientation === Orientation.LEFT) {
                    Array.from(this.dorsalRightEdge.remember('_selectHandler').nested.node.children).forEach(
                        (point: SVG.LinkedHTMLElement, i: number) => {
                            point.classList.add(`svg_select_points_${['t', 'b'][i]}`);
                            point.ondblclick = (e: MouseEvent) => {
                                if (e.shiftKey) {
                                    this.resetPerspective();
                                }
                            };
                        },
                    );
                } else {
                    Array.from(this.dorsalLeftEdge.remember('_selectHandler').nested.node.children).forEach(
                        (point: SVG.LinkedHTMLElement, i: number) => {
                            point.classList.add(`svg_select_points_${['t', 'b'][i]}`);
                            point.ondblclick = (e: MouseEvent) => {
                                if (e.shiftKey) {
                                    this.resetPerspective();
                                }
                            };
                        },
                    );
                }
            }

            return this;
        },

        resize(value?: string | object) {
            this.face.resize(value);

            if (value === 'stop') {
                this.dorsalRightEdge.resize(value);
                this.dorsalLeftEdge.resize(value);
                this.face.off('resizing').off('resizedone').off('resizestart');
                this.dorsalRightEdge.off('resizing').off('resizedone').off('resizestart');
                this.dorsalLeftEdge.off('resizing').off('resizedone').off('resizestart');

                this.getGrabPoints().forEach((point: SVG.Element) => {
                    if (point) {
                        point.off('dragstart');
                        point.off('dragmove');
                        point.off('dragend');
                    }
                });

                return;
            }

            function getResizedPointIndex(event: CustomEvent): number {
                const { target } = event.detail.event.detail.event;
                const { parentElement } = target;
                return Array.from(parentElement.children).indexOf(target);
            }

            let resizedCubePoint: null | number = null;
            const accumulatedOffset: Point = {
                x: 0,
                y: 0,
            };

            this.face
                .on('resizestart', (event: CustomEvent) => {
                    accumulatedOffset.x = 0;
                    accumulatedOffset.y = 0;
                    const resizedFacePoint = getResizedPointIndex(event);
                    resizedCubePoint = [0, 1].includes(resizedFacePoint) ? resizedFacePoint : 5 - resizedFacePoint; // 2,3 -> 3,2
                    this.fire(new CustomEvent('resizestart', event));
                })
                .on('resizing', (event: CustomEvent) => {
                    let { dx, dy } = event.detail;
                    let dxPortion = dx - accumulatedOffset.x;
                    let dyPortion = dy - accumulatedOffset.y;
                    accumulatedOffset.x += dxPortion;
                    accumulatedOffset.y += dyPortion;

                    const edge = getEdgeIndex(resizedCubePoint);
                    const [edgeTopIndex, edgeBottomIndex] = getTopDown(edge);

                    let cuboidPoints = this.cuboidModel.getPoints();
                    let x1 = cuboidPoints[edgeTopIndex].x + dxPortion;
                    let x2 = cuboidPoints[edgeBottomIndex].x + dxPortion;
                    if (
                        edge === EdgeIndex.FL &&
                        cuboidPoints[2].x - (cuboidPoints[0].x + dxPortion) < consts.MIN_EDGE_LENGTH
                    ) {
                        x1 = cuboidPoints[edgeTopIndex].x;
                        x2 = cuboidPoints[edgeBottomIndex].x;
                    } else if (
                        edge === EdgeIndex.FR &&
                        cuboidPoints[2].x + dxPortion - cuboidPoints[0].x < consts.MIN_EDGE_LENGTH
                    ) {
                        x1 = cuboidPoints[edgeTopIndex].x;
                        x2 = cuboidPoints[edgeBottomIndex].x;
                    }
                    const y1 = this.cuboidModel.ft.getEquation().getY(x1);
                    const y2 = this.cuboidModel.fb.getEquation().getY(x2);
                    const topPoint = { x: x1, y: y1 };
                    const botPoint = { x: x2, y: y2 };
                    if (edge === 1) {
                        this.cuboidModel.fl.points = [topPoint, botPoint];
                    } else {
                        this.cuboidModel.fr.points = [topPoint, botPoint];
                    }
                    this.updateViewAndVM(edge === EdgeIndex.FR);

                    cuboidPoints = this.cuboidModel.getPoints();
                    const midPointUp = { ...cuboidPoints[edgeTopIndex] };
                    const midPointDown = { ...cuboidPoints[edgeBottomIndex] };
                    (edgeTopIndex === resizedCubePoint ? midPointUp : midPointDown).y += dyPortion;
                    if (midPointDown.y - midPointUp.y > consts.MIN_EDGE_LENGTH) {
                        const topPoints = this.computeHeightFace(midPointUp, edge);
                        const bottomPoints = this.computeHeightFace(midPointDown, edge);
                        this.cuboidModel.top.points = topPoints;
                        this.cuboidModel.bot.points = bottomPoints;
                        this.updateViewAndVM(false);
                    }

                    this.face.plot(this.cuboidModel.front.points);
                    this.fire(new CustomEvent('resizing', event));
                })
                .on('resizedone', (event: CustomEvent) => {
                    this.fire(new CustomEvent('resizedone', event));
                });

            function computeSideEdgeConstraints(edge: Edge, fr: Edge) {
                const midLength = fr.points[1].y - fr.points[0].y - 1;

                const minY = edge.points[1].y - midLength;
                const maxY = edge.points[0].y + midLength;

                const y1 = edge.points[0].y;
                const y2 = edge.points[1].y;

                const miny1 = y2 - midLength;
                const maxy1 = y2 - consts.MIN_EDGE_LENGTH;

                const miny2 = y1 + consts.MIN_EDGE_LENGTH;
                const maxy2 = y1 + midLength;

                return {
                    constraint: {
                        minY,
                        maxY,
                    },
                    y1Range: {
                        max: maxy1,
                        min: miny1,
                    },
                    y2Range: {
                        max: maxy2,
                        min: miny2,
                    },
                };
            }

            function setupDorsalEdge(edge: SVG.Line, orientation: Orientation) {
                edge.on('resizestart', (event: CustomEvent) => {
                    accumulatedOffset.x = 0;
                    accumulatedOffset.y = 0;
                    resizedCubePoint = getResizedPointIndex(event) + (orientation === Orientation.LEFT ? 4 : 6);
                    this.fire(new CustomEvent('resizestart', event));
                })
                    .on('resizing', (event: CustomEvent) => {
                        let { dy } = event.detail;
                        let dyPortion = dy - accumulatedOffset.y;
                        accumulatedOffset.y += dyPortion;

                        const edge = getEdgeIndex(resizedCubePoint);
                        const [edgeTopIndex, edgeBottomIndex] = getTopDown(edge);
                        let cuboidPoints = this.cuboidModel.getPoints();

                        if (!event.detail.event.shiftKey) {
                            cuboidPoints = this.cuboidModel.getPoints();
                            const midPointUp = { ...cuboidPoints[edgeTopIndex] };
                            const midPointDown = { ...cuboidPoints[edgeBottomIndex] };
                            (edgeTopIndex === resizedCubePoint ? midPointUp : midPointDown).y += dyPortion;
                            if (midPointDown.y - midPointUp.y > consts.MIN_EDGE_LENGTH) {
                                const topPoints = this.computeHeightFace(midPointUp, edge);
                                const bottomPoints = this.computeHeightFace(midPointDown, edge);
                                this.cuboidModel.top.points = topPoints;
                                this.cuboidModel.bot.points = bottomPoints;
                            }
                        } else {
                            const midPointUp = { ...cuboidPoints[edgeTopIndex] };
                            const midPointDown = { ...cuboidPoints[edgeBottomIndex] };
                            (edgeTopIndex === resizedCubePoint ? midPointUp : midPointDown).y += dyPortion;
                            const dorselEdge =
                                orientation === Orientation.LEFT ? this.cuboidModel.dr : this.cuboidModel.dl;
                            const constraints = computeSideEdgeConstraints(dorselEdge, this.cuboidModel.fr);
                            midPointUp.y = clamp(midPointUp.y, constraints.y1Range.min, constraints.y1Range.max);
                            midPointDown.y = clamp(midPointDown.y, constraints.y2Range.min, constraints.y2Range.max);
                            dorselEdge.points = [midPointUp, midPointDown];
                            this.updateViewAndVM(edge === EdgeIndex.DL);
                        }

                        this.updateViewAndVM(false);
                        this.face.plot(this.cuboidModel.front.points);
                        this.fire(new CustomEvent('resizing', event));
                    })
                    .on('resizedone', (event: CustomEvent) => {
                        this.fire(new CustomEvent('resizedone', event));
                    });
            }

            if (this.cuboidModel.orientation === Orientation.LEFT) {
                this.dorsalRightEdge.resize(value);
                setupDorsalEdge.call(this, this.dorsalRightEdge, this.cuboidModel.orientation);
            } else {
                this.dorsalLeftEdge.resize(value);
                setupDorsalEdge.call(this, this.dorsalLeftEdge, this.cuboidModel.orientation);
            }

            function horizontalEdgeControl(updatingFace: any, midX: number, midY: number) {
                const leftPoints = this.updatedEdge(
                    this.cuboidModel.fl.points[0],
                    { x: midX, y: midY },
                    this.cuboidModel.vpl,
                );
                const rightPoints = this.updatedEdge(
                    this.cuboidModel.dr.points[0],
                    { x: midX, y: midY },
                    this.cuboidModel.vpr,
                );

                updatingFace.points = [leftPoints, { x: midX, y: midY }, rightPoints, null];
            }

            this.drCenter
                .draggable((x: number) => {
                    let xStatus;
                    if (this.drCenter.cx() < this.cuboidModel.fr.points[0].x) {
                        xStatus =
                            x < this.cuboidModel.fr.points[0].x - consts.MIN_EDGE_LENGTH &&
                            x > this.cuboidModel.vpr.x + consts.MIN_EDGE_LENGTH;
                    } else {
                        xStatus =
                            x > this.cuboidModel.fr.points[0].x + consts.MIN_EDGE_LENGTH &&
                            x < this.cuboidModel.vpr.x - consts.MIN_EDGE_LENGTH;
                    }
                    return { x: xStatus, y: this.drCenter.attr('y1') };
                })
                .on('dragstart', (event: CustomEvent) => {
                    this.fire(new CustomEvent('resizestart', event));
                })
                .on('dragmove', (event: CustomEvent) => {
                    this.dorsalRightEdge.center(this.drCenter.cx(), this.drCenter.cy());

                    const x = this.dorsalRightEdge.attr('x1');
                    const y1 = this.cuboidModel.rt.getEquation().getY(x);
                    const y2 = this.cuboidModel.rb.getEquation().getY(x);
                    const topPoint = { x, y: y1 };
                    const botPoint = { x, y: y2 };

                    this.cuboidModel.dr.points = [topPoint, botPoint];
                    this.updateViewAndVM();
                    this.fire(new CustomEvent('resizing', event));
                })
                .on('dragend', (event: CustomEvent) => {
                    this.fire(new CustomEvent('resizedone', event));
                });

            this.dlCenter
                .draggable((x: number) => {
                    let xStatus;
                    if (this.dlCenter.cx() < this.cuboidModel.fl.points[0].x) {
                        xStatus =
                            x < this.cuboidModel.fl.points[0].x - consts.MIN_EDGE_LENGTH &&
                            x > this.cuboidModel.vpr.x + consts.MIN_EDGE_LENGTH;
                    } else {
                        xStatus =
                            x > this.cuboidModel.fl.points[0].x + consts.MIN_EDGE_LENGTH &&
                            x < this.cuboidModel.vpr.x - consts.MIN_EDGE_LENGTH;
                    }
                    return { x: xStatus, y: this.dlCenter.attr('y1') };
                })
                .on('dragstart', (event: CustomEvent) => {
                    this.fire(new CustomEvent('resizestart', event));
                })
                .on('dragmove', (event: CustomEvent) => {
                    this.dorsalLeftEdge.center(this.dlCenter.cx(), this.dlCenter.cy());

                    const x = this.dorsalLeftEdge.attr('x1');
                    const y1 = this.cuboidModel.lt.getEquation().getY(x);
                    const y2 = this.cuboidModel.lb.getEquation().getY(x);
                    const topPoint = { x, y: y1 };
                    const botPoint = { x, y: y2 };

                    this.cuboidModel.dl.points = [topPoint, botPoint];
                    this.updateViewAndVM(true);
                    this.fire(new CustomEvent('resizing', event));
                })
                .on('dragend', (event: CustomEvent) => {
                    this.fire(new CustomEvent('resizedone', event));
                });

            this.flCenter
                .draggable((x: number) => {
                    const vpX = this.flCenter.cx() - this.cuboidModel.vpl.x > 0 ? this.cuboidModel.vpl.x : 0;
                    return { x: x < this.cuboidModel.fr.points[0].x && x > vpX + consts.MIN_EDGE_LENGTH };
                })
                .on('dragstart', (event: CustomEvent) => {
                    this.fire(new CustomEvent('resizestart', event));
                })
                .on('dragmove', (event: CustomEvent) => {
                    this.frontLeftEdge.center(this.flCenter.cx(), this.flCenter.cy());

                    const x = this.frontLeftEdge.attr('x1');
                    const y1 = this.cuboidModel.ft.getEquation().getY(x);
                    const y2 = this.cuboidModel.fb.getEquation().getY(x);
                    const topPoint = { x, y: y1 };
                    const botPoint = { x, y: y2 };

                    this.cuboidModel.fl.points = [topPoint, botPoint];
                    this.updateViewAndVM();
                    this.fire(new CustomEvent('resizing', event));
                })
                .on('dragend', (event: CustomEvent) => {
                    this.fire(new CustomEvent('resizedone', event));
                });

            this.frCenter
                .draggable((x: number) => {
                    return { x: x > this.cuboidModel.fl.points[0].x, y: this.frCenter.attr('y1') };
                })
                .on('dragstart', (event: CustomEvent) => {
                    this.fire(new CustomEvent('resizestart', event));
                })
                .on('dragmove', (event: CustomEvent) => {
                    this.frontRightEdge.center(this.frCenter.cx(), this.frCenter.cy());

                    const x = this.frontRightEdge.attr('x1');
                    const y1 = this.cuboidModel.ft.getEquation().getY(x);
                    const y2 = this.cuboidModel.fb.getEquation().getY(x);
                    const topPoint = { x, y: y1 };
                    const botPoint = { x, y: y2 };

                    this.cuboidModel.fr.points = [topPoint, botPoint];
                    this.updateViewAndVM(true);
                    this.fire(new CustomEvent('resizing', event));
                })
                .on('dragend', (event: CustomEvent) => {
                    this.fire(new CustomEvent('resizedone', event));
                });

            this.ftCenter
                .draggable((x: number, y: number) => {
                    return { x: x === this.ftCenter.cx(), y: y < this.fbCenter.cy() - consts.MIN_EDGE_LENGTH };
                })
                .on('dragstart', (event: CustomEvent) => {
                    this.fire(new CustomEvent('resizestart', event));
                })
                .on('dragmove', (event: CustomEvent) => {
                    this.frontTopEdge.center(this.ftCenter.cx(), this.ftCenter.cy());
                    horizontalEdgeControl.call(
                        this,
                        this.cuboidModel.top,
                        this.frontTopEdge.attr('x2'),
                        this.frontTopEdge.attr('y2'),
                    );
                    this.updateViewAndVM();
                    this.fire(new CustomEvent('resizing', event));
                })
                .on('dragend', (event: CustomEvent) => {
                    this.fire(new CustomEvent('resizedone', event));
                });

            this.fbCenter
                .draggable((x: number, y: number) => {
                    return { x: x === this.fbCenter.cx(), y: y > this.ftCenter.cy() + consts.MIN_EDGE_LENGTH };
                })
                .on('dragstart', (event: CustomEvent) => {
                    this.fire(new CustomEvent('resizestart', event));
                })
                .on('dragmove', (event: CustomEvent) => {
                    this.frontBotEdge.center(this.fbCenter.cx(), this.fbCenter.cy());
                    horizontalEdgeControl.call(
                        this,
                        this.cuboidModel.bot,
                        this.frontBotEdge.attr('x2'),
                        this.frontBotEdge.attr('y2'),
                    );
                    this.updateViewAndVM();
                    this.fire(new CustomEvent('resizing', event));
                })
                .on('dragend', (event: CustomEvent) => {
                    this.fire(new CustomEvent('resizedone', event));
                });

            return this;
        },

        draggable(value: any, constraint: any) {
            const { cuboidModel } = this;
            const faces = [this.face, this.right, this.dorsal, this.left];
            const accumulatedOffset: Point = {
                x: 0,
                y: 0,
            };

            if (value === false) {
                faces.forEach((face: any) => {
                    face.draggable(false);
                    face.off('dragstart');
                    face.off('dragmove');
                    face.off('dragend');
                });
                return;
            }

            this.face
                .draggable()
                .on('dragstart', (event: CustomEvent) => {
                    accumulatedOffset.x = 0;
                    accumulatedOffset.y = 0;

                    this.fire(new CustomEvent('dragstart', event));
                })
                .on('dragmove', (event: CustomEvent) => {
                    const dx = event.detail.p.x - event.detail.handler.startPoints.point.x;
                    const dy = event.detail.p.y - event.detail.handler.startPoints.point.y;
                    let dxPortion = dx - accumulatedOffset.x;
                    let dyPortion = dy - accumulatedOffset.y;
                    accumulatedOffset.x += dxPortion;
                    accumulatedOffset.y += dyPortion;

                    this.dmove(dxPortion, dyPortion);

                    this.fire(new CustomEvent('dragmove', event));
                })
                .on('dragend', (event: CustomEvent) => {
                    this.fire(new CustomEvent('dragend', event));
                });

            this.left
                .draggable((x: number, y: number) => ({
                    x: x < Math.min(cuboidModel.dr.points[0].x, cuboidModel.fr.points[0].x) - consts.MIN_EDGE_LENGTH,
                    y,
                }))
                .on('dragstart', (event: CustomEvent) => {
                    this.fire(new CustomEvent('dragstart', event));
                })
                .on('dragmove', (event: CustomEvent) => {
                    this.cuboidModel.left.points = parsePoints(this.left.attr('points'));
                    this.updateViewAndVM();

                    this.fire(new CustomEvent('dragmove', event));
                })
                .on('dragend', (event: CustomEvent) => {
                    this.fire(new CustomEvent('dragend', event));
                });

            this.dorsal
                .draggable()
                .on('dragstart', (event: CustomEvent) => {
                    this.fire(new CustomEvent('dragstart', event));
                })
                .on('dragmove', (event: CustomEvent) => {
                    this.cuboidModel.dorsal.points = parsePoints(this.dorsal.attr('points'));
                    this.updateViewAndVM();

                    this.fire(new CustomEvent('dragmove', event));
                })
                .on('dragend', (event: CustomEvent) => {
                    this.fire(new CustomEvent('dragend', event));
                });

            this.right
                .draggable((x: number, y: number) => ({
                    x: x > Math.min(cuboidModel.dl.points[0].x, cuboidModel.fl.points[0].x) + consts.MIN_EDGE_LENGTH,
                    y,
                }))
                .on('dragstart', (event: CustomEvent) => {
                    this.fire(new CustomEvent('dragstart', event));
                })
                .on('dragmove', (event: CustomEvent) => {
                    this.cuboidModel.right.points = parsePoints(this.right.attr('points'));
                    this.updateViewAndVM(true);

                    this.fire(new CustomEvent('dragmove', event));
                })
                .on('dragend', (event: CustomEvent) => {
                    this.fire(new CustomEvent('dragend', event));
                });

            return this;
        },

        _attr: SVG.Element.prototype.attr,

        attr(a: any, v: any, n: any) {
            if ((a === 'fill' || a === 'stroke' || a === 'face-stroke') && v !== undefined) {
                this._attr(a, v, n);
                this.paintOrientationLines();
            } else if (a === 'points' && typeof v === 'string') {
                const points = parsePoints(v);
                this.cuboidModel.setPoints(points);
                this.updateViewAndVM();
            } else if (a === 'projections') {
                this._attr(a, v, n);
                if (v === true) {
                    this.ftProj.show();
                    this.fbProj.show();
                    this.rtProj.show();
                    this.rbProj.show();
                } else {
                    this.ftProj.hide();
                    this.fbProj.hide();
                    this.rtProj.hide();
                    this.rbProj.hide();
                }
            } else if (a === 'stroke-width' && typeof v === 'number') {
                this._attr(a, v, n);
                this.updateThickness();
            } else if (a === 'data-z-order' && typeof v !== 'undefined') {
                this._attr(a, v, n);
                [this.face, this.left, this.dorsal, this.right, ...this.getEdges(), ...this.getGrabPoints()].forEach(
                    (el) => {
                        if (el) el.attr(a, v, n);
                    },
                );
            } else {
                return this._attr(a, v, n);
            }

            return this;
        },

        updateThickness() {
            const edges = [this.frontLeftEdge, this.frontRightEdge, this.frontTopEdge, this.frontBotEdge];
            const width = this.attr('stroke-width');
            edges.forEach((edge: SVG.Element) => {
                edge.attr('stroke-width', width * (this.strokeOffset || consts.CUBOID_UNACTIVE_EDGE_STROKE_WIDTH));
            });
            this.on('mouseover', () => {
                edges.forEach((edge: SVG.Element) => {
                    this.strokeOffset = this.node.classList.contains('cvat_canvas_shape_activated')
                        ? consts.CUBOID_ACTIVE_EDGE_STROKE_WIDTH
                        : consts.CUBOID_UNACTIVE_EDGE_STROKE_WIDTH;
                    edge.attr('stroke-width', width * this.strokeOffset);
                });
            }).on('mouseout', () => {
                edges.forEach((edge: SVG.Element) => {
                    this.strokeOffset = consts.CUBOID_UNACTIVE_EDGE_STROKE_WIDTH;
                    edge.attr('stroke-width', width * this.strokeOffset);
                });
            });
        },

        paintOrientationLines() {
            // style has higher priority than attr, so then try to fetch it if exists
            // https://stackoverflow.com/questions/47088409/svg-attributes-beaten-by-cssstyle-in-priority]
            // we use getComputedStyle to get actual, not-inlined css property (come from the corresponding css class)
            const computedStyles = getComputedStyle(this.node);
            const fillColor = computedStyles['fill'] || this.attr('fill');
            const strokeColor = computedStyles['stroke'] || this.attr('stroke');
            const selectedColor = this.attr('face-stroke') || '#b0bec5';
            this.frontTopEdge.stroke({ color: selectedColor });
            this.frontLeftEdge.stroke({ color: selectedColor });
            this.frontBotEdge.stroke({ color: selectedColor });
            this.frontRightEdge.stroke({ color: selectedColor });

            this.rightTopEdge.stroke({ color: strokeColor });
            this.rightBotEdge.stroke({ color: strokeColor });
            this.dorsalRightEdge.stroke({ color: strokeColor });
            this.dorsalLeftEdge.stroke({ color: strokeColor });

            this.bot.stroke({ color: strokeColor }).fill({ color: fillColor });
            this.top.stroke({ color: strokeColor }).fill({ color: fillColor });
            this.face.stroke({ color: strokeColor, width: 0 }).fill({ color: fillColor });
            this.right.stroke({ color: strokeColor }).fill({ color: fillColor });
            this.dorsal.stroke({ color: strokeColor }).fill({ color: fillColor });
            this.left.stroke({ color: strokeColor }).fill({ color: fillColor });
        },

        dmove(dx: number, dy: number) {
            this.cuboidModel.points.forEach((point: Point) => {
                point.x += dx;
                point.y += dy;
            });

            this.updateViewAndVM();
        },

        x(x?: number) {
            if (typeof x === 'number') {
                const { x: xInitial } = this.bbox();
                this.dmove(x - xInitial, 0);
                return this;
            } else {
                return this.bbox().x;
            }
        },

        y(y?: number) {
            if (typeof y === 'number') {
                const { y: yInitial } = this.bbox();
                this.dmove(0, y - yInitial);
                return this;
            } else {
                return this.bbox().y;
            }
        },

        resetPerspective() {
            if (this.cuboidModel.orientation === Orientation.LEFT) {
                const edgePoints = this.cuboidModel.dl.points;
                const constraints = this.cuboidModel.computeSideEdgeConstraints(this.cuboidModel.dl);
                edgePoints[0].y = constraints.y1Range.min;
                this.cuboidModel.dl.points = [edgePoints[0], edgePoints[1]];
                this.updateViewAndVM(true);
            } else {
                const edgePoints = this.cuboidModel.dr.points;
                const constraints = this.cuboidModel.computeSideEdgeConstraints(this.cuboidModel.dr);
                edgePoints[0].y = constraints.y1Range.min;
                this.cuboidModel.dr.points = [edgePoints[0], edgePoints[1]];
                this.updateViewAndVM();
            }
        },

        updateViewAndVM(build: boolean) {
            this.cuboidModel.updateOrientation();
            this.cuboidModel.buildBackEdge(build);
            this.updateView();

            // to correct getting of points in resizedone, dragdone
            this._attr(
                'points',
                this.cuboidModel
                    .getPoints()
                    .reduce((acc: string, point: Point): string => `${acc} ${point.x},${point.y}`, '')
                    .trim(),
            );
        },

        computeHeightFace(point: Point, index: number) {
            switch (index) {
                // fl
                case 1: {
                    const p2 = this.updatedEdge(this.cuboidModel.fr.points[0], point, this.cuboidModel.vpl);
                    const p3 = this.updatedEdge(this.cuboidModel.dr.points[0], p2, this.cuboidModel.vpr);
                    const p4 = this.updatedEdge(this.cuboidModel.dl.points[0], point, this.cuboidModel.vpr);
                    return [point, p2, p3, p4];
                }
                // fr
                case 2: {
                    const p1 = this.updatedEdge(this.cuboidModel.fl.points[0], point, this.cuboidModel.vpl);
                    const p3 = this.updatedEdge(this.cuboidModel.dr.points[0], point, this.cuboidModel.vpr);
                    const p4 = this.updatedEdge(this.cuboidModel.dl.points[0], p3, this.cuboidModel.vpr);
                    return [p1, point, p3, p4];
                }
                // dr
                case 3: {
                    const p2 = this.updatedEdge(this.cuboidModel.dl.points[0], point, this.cuboidModel.vpl);
                    const p3 = this.updatedEdge(this.cuboidModel.fr.points[0], point, this.cuboidModel.vpr);
                    const p4 = this.updatedEdge(this.cuboidModel.fl.points[0], p2, this.cuboidModel.vpr);
                    return [p4, p3, point, p2];
                }
                // dl
                case 4: {
                    const p2 = this.updatedEdge(this.cuboidModel.dr.points[0], point, this.cuboidModel.vpl);
                    const p3 = this.updatedEdge(this.cuboidModel.fl.points[0], point, this.cuboidModel.vpr);
                    const p4 = this.updatedEdge(this.cuboidModel.fr.points[0], p2, this.cuboidModel.vpr);
                    return [p3, p4, p2, point];
                }
                default: {
                    return [null, null, null, null];
                }
            }
        },

        updatedEdge(target: Point, base: Point, pivot: Point) {
            const targetX = target.x;
            const line = new Equation(pivot, base);
            const newY = line.getY(targetX);
            return { x: targetX, y: newY };
        },

        updateView() {
            this.updateFaces();
            this.updateEdges();
            this.updateProjections();
            this.updateGrabPoints();
        },

        updateFaces() {
            const viewModel = this.cuboidModel;

            this.bot.plot(viewModel.bot.points);
            this.top.plot(viewModel.top.points);
            this.right.plot(viewModel.right.points);
            this.dorsal.plot(viewModel.dorsal.points);
            this.left.plot(viewModel.left.points);
            this.face.plot(viewModel.front.points);
        },

        updateEdges() {
            const viewModel = this.cuboidModel;

            this.frontLeftEdge.plot(viewModel.fl.points);
            this.frontRightEdge.plot(viewModel.fr.points);
            this.dorsalRightEdge.plot(viewModel.dr.points);
            this.dorsalLeftEdge.plot(viewModel.dl.points);

            this.frontTopEdge.plot(viewModel.ft.points);
            this.rightTopEdge.plot(viewModel.rt.points);
            this.frontBotEdge.plot(viewModel.fb.points);
            this.rightBotEdge.plot(viewModel.rb.points);
        },

        updateProjections() {
            const viewModel = this.cuboidModel;

            this.ftProj.plot(
                this.updateProjectionLine(viewModel.ft.getEquation(), viewModel.ft.points[0], viewModel.vpl),
            );
            this.fbProj.plot(
                this.updateProjectionLine(viewModel.fb.getEquation(), viewModel.ft.points[0], viewModel.vpl),
            );
            this.rtProj.plot(
                this.updateProjectionLine(viewModel.rt.getEquation(), viewModel.rt.points[1], viewModel.vpr),
            );
            this.rbProj.plot(
                this.updateProjectionLine(viewModel.rb.getEquation(), viewModel.rt.points[1], viewModel.vpr),
            );
        },

        updateGrabPoints() {
            const centers = this.getGrabPoints();
            const edges = this.getEdges();
            for (let i = 0; i < centers.length; i += 1) {
                const edge = edges[i];
                if (centers[i]) centers[i].center(edge.cx(), edge.cy());
            }
        },
    },
    construct: {
        cube(points: string) {
            return this.put(new (SVG as any).Cube()).constructorMethod(points);
        },
    },
});
