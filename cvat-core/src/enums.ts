// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier = MIT

/**
 * 表示共享文件类型的枚举
 * 用于定义不同类型的共享文件，如目录和常规文件
 */
export enum ShareFileType {
    /** 目录类型 */
    DIR = 'DIR',
    /** 常规文件类型 */
    REG = 'REG',
}

/**
 * 表示数据块类型的枚举
 * 用于定义不同类型的数据块，如图像集和视频
 */
export enum ChunkType {
    /** 图像集类型 - 包含一系列图像的数据块 */
    IMAGESET = 'imageset',
    /** 视频类型 - 包含视频内容的数据块 */
    VIDEO = 'video',
}

/**
 * 表示任务状态的枚举
 * 用于定义标注任务的不同阶段
 */
export enum TaskStatus {
    /** 标注阶段 - 正在进行标注工作 */
    ANNOTATION = 'annotation',
    /** 验证阶段 - 正在验证已完成的标注 */
    VALIDATION = 'validation',
    /** 完成阶段 - 任务已完成所有标注和验证 */
    COMPLETED = 'completed',
}

/** 项目状态类型，复用任务状态 */
export type ProjectStatus = TaskStatus;

/**
 * 表示作业阶段的枚举
 * 用于定义标注作业的不同阶段
 */
export enum JobStage {
    /** 标注阶段 - 作业正在进行标注 */
    ANNOTATION = 'annotation',
    /** 验证阶段 - 作业正在被验证 */
    VALIDATION = 'validation',
    /** 验收阶段 - 作业正在被最终验收 */
    ACCEPTANCE = 'acceptance',
}

/**
 * 表示作业状态的枚举
 * 用于定义标注作业的当前状态
 */
export enum JobState {
    /** 新建状态 - 作业已创建但尚未开始 */
    NEW = 'new',
    /** 进行中状态 - 作业正在被处理 */
    IN_PROGRESS = 'in progress',
    /** 完成状态 - 作业已完成 */
    COMPLETED = 'completed',
    /** 拒绝状态 - 作业被拒绝，可能需要重新处理 */
    REJECTED = 'rejected',
}

/**
 * 表示作业类型的枚举
 * 用于定义不同类型的标注作业
 */
export enum JobType {
    /** 标注作业 - 常规的标注任务 */
    ANNOTATION = 'annotation',
    /** 真实标注作业 - 作为参考标准的标注 */
    GROUND_TRUTH = 'ground_truth',
    /** 共识副本作业 - 用于共识评估的副本 */
    CONSENSUS_REPLICA = 'consensus_replica',
}

/**
 * 表示维度类型的枚举
 * 用于定义数据的维度
 */
export enum DimensionType {
    /** 二维数据 */
    DIMENSION_2D = '2d',
    /** 三维数据 */
    DIMENSION_3D = '3d',
}

/**
 * 表示RQ（Redis Queue）任务状态的枚举
 * 用于定义后台任务的不同状态
 */
export enum RQStatus {
    /** 排队中 - 任务已提交但尚未开始执行 */
    QUEUED = 'queued',
    /** 已开始 - 任务正在执行中 */
    STARTED = 'started',
    /** 已完成 - 任务成功执行完毕 */
    FINISHED = 'finished',
    /** 失败 - 任务执行过程中出错 */
    FAILED = 'failed',
    /** 未知状态 - 无法确定任务当前状态 */
    UNKNOWN = 'unknown',
}

/**
 * 表示任务模式的枚举
 * 用于定义标注任务的不同工作模式
 */
export enum TaskMode {
    /** 标注模式 - 逐帧标注对象 */
    ANNOTATION = 'annotation',
    /** 插值模式 - 在关键帧之间插值标注对象 */
    INTERPOLATION = 'interpolation',
}

/**
 * 表示属性类型的枚举
 * 用于定义标注对象的不同属性类型
 */
export enum AttributeType {
    /** 复选框类型 - 可以多选的属性 */
    CHECKBOX = 'checkbox',
    /** 单选按钮类型 - 只能单选的属性 */
    RADIO = 'radio',
    /** 下拉选择类型 - 从预定义选项中选择 */
    SELECT = 'select',
    /** 数字类型 - 数值输入属性 */
    NUMBER = 'number',
    /** 文本类型 - 自由文本输入属性 */
    TEXT = 'text',
}

/**
 * 表示对象类型的枚举
 * 用于定义不同类型的标注对象
 */
export enum ObjectType {
    /** 标签类型 - 用于图像分类的标签 */
    TAG = 'tag',
    /** 形状类型 - 静态形状标注 */
    SHAPE = 'shape',
    /** 轨迹类型 - 跨帧移动的对象轨迹 */
    TRACK = 'track',
}

/**
 * 表示形状类型的枚举
 * 用于定义不同类型的形状标注
 */
export enum ShapeType {
    /** 矩形 - 用于标注矩形区域 */
    RECTANGLE = 'rectangle',
    /** 多边形 - 用于标注不规则多边形区域 */
    POLYGON = 'polygon',
    /** 折线 - 用于标注由多个点连接的线 */
    POLYLINE = 'polyline',
    /** 点集 - 用于标注多个关键点 */
    POINTS = 'points',
    /** 椭圆 - 用于标注椭圆形区域 */
    ELLIPSE = 'ellipse',
    /** 立方体 - 用于标注三维立方体对象 */
    CUBOID = 'cuboid',
    /** 骨架 - 用于标注对象的骨架结构 */
    SKELETON = 'skeleton',
    /** 掩码 - 用于标注像素级精确区域 */
    MASK = 'mask',
}

/**
 * 表示标注来源的枚举
 * 用于定义标注对象的创建来源
 */
export enum Source {
    /** 手动创建 - 用户手动创建的标注 */
    MANUAL = 'manual',
    /** 半自动创建 - 用户引导的半自动标注 */
    SEMI_AUTO = 'semi-auto',
    /** 自动创建 - 完全自动生成的标注 */
    AUTO = 'auto',
    /** 文件导入 - 从文件导入的标注 */
    FILE = 'file',
    /** 真实标注 - 作为参考标准的标注 */
    GT = 'Ground truth',
}

/**
 * 表示事件范围的枚举
 * 用于定义系统中的各种事件类型，用于跟踪和日志记录
 */
export enum EventScope {
    /** 加载CVAT工具事件 */
    loadTool = 'load:cvat',

    /** 加载作业事件 */
    loadJob = 'load:job',
    /** 加载工作空间事件 */
    loadWorkspace = 'load:workspace',
    /** 保存作业事件 */
    saveJob = 'save:job',
    /** 异常事件 */
    exception = 'send:exception',

    /** 绘制对象事件 */
    drawObject = 'draw:object',
    /** 粘贴对象事件 */
    pasteObject = 'paste:object',
    /** 复制对象事件 */
    copyObject = 'copy:object',
    /** 传播对象事件 */
    propagateObject = 'propagate:object',
    /** 拖动对象事件 */
    dragObject = 'drag:object',
    /** 调整对象大小事件 */
    resizeObject = 'resize:object',
    /** 删除对象事件 */
    deleteObject = 'delete:object',
    /** 合并对象事件 */
    mergeObjects = 'merge:objects',
    /** 分割对象事件 */
    splitObjects = 'split:objects',
    /** 组合对象事件 */
    groupObjects = 'group:objects',
    /** 切片对象事件 */
    sliceObject = 'slice:object',
    /** 连接对象事件 */
    joinObjects = 'join:objects',

    /** 切换帧事件 */
    changeFrame = 'change:frame',
    /** 缩放图像事件 */
    zoomImage = 'zoom:image',
    /** 适应图像事件 */
    fitImage = 'fit:image',
    /** 旋转图像事件 */
    rotateImage = 'rotate:image',

    /** 撤销操作事件 */
    undoAction = 'action:undo',
    /** 重做操作事件 */
    redoAction = 'action:redo',

    /** 调试信息事件 */
    debugInfo = 'debug:info',

    /** 标注操作事件 */
    annotationsAction = 'run:annotations_action',
    /** 点击元素事件 */
    clickElement = 'click:element',
    /** 用户活动事件 */
    userActivity = 'user:activity',
}

/**
 * 表示历史操作类型的枚举
 * 用于定义用户可以执行的各种操作，用于撤销/重做功能
 */
export enum HistoryActions {
    /** 更改标签操作 */
    CHANGED_LABEL = 'Changed label',
    /** 更改属性操作 */
    CHANGED_ATTRIBUTES = 'Changed attributes',
    /** 更改点操作 */
    CHANGED_POINTS = 'Changed points',
    /** 对象旋转操作 */
    CHANGED_ROTATION = 'Object rotated',
    /** 更改外部区域操作 */
    CHANGED_OUTSIDE = 'Changed outside',
    /** 更改遮挡状态操作 */
    CHANGED_OCCLUDED = 'Changed occluded',
    /** 更改Z轴顺序操作 */
    CHANGED_ZORDER = 'Changed z-order',
    /** 更改关键帧操作 */
    CHANGED_KEYFRAME = 'Changed keyframe',
    /** 更改锁定状态操作 */
    CHANGED_LOCK = 'Changed lock',
    /** 更改固定状态操作 */
    CHANGED_PINNED = 'Changed pinned',
    /** 更改颜色操作 */
    CHANGED_COLOR = 'Changed color',
    /** 更改隐藏状态操作 */
    CHANGED_HIDDEN = 'Changed hidden',
    /** 更改来源操作 */
    CHANGED_SOURCE = 'Changed source',
    /** 合并对象操作 */
    MERGED_OBJECTS = 'Merged objects',
    /** 连接对象操作 */
    JOINED_OBJECTS = 'Joined objects',
    /** 切片对象操作 */
    SLICED_OBJECT = 'Sliced object',
    /** 分割轨迹操作 */
    SPLITTED_TRACK = 'Splitted track',
    /** 组合对象操作 */
    GROUPED_OBJECTS = 'Grouped objects',
    /** 创建对象操作 */
    CREATED_OBJECTS = 'Created objects',
    /** 删除对象操作 */
    REMOVED_OBJECT = 'Removed object',
    /** 删除帧操作 */
    REMOVED_FRAME = 'Removed frame',
    /** 恢复帧操作 */
    RESTORED_FRAME = 'Restored frame',
    /** 提交标注操作 */
    COMMIT_ANNOTATIONS = 'Commit annotations',
}

/**
 * 表示模型类型的枚举
 * 用于定义不同类型的AI模型
 */
export enum ModelKind {
    /** 检测器模型 - 用于检测对象 */
    DETECTOR = 'detector',
    /** 交互器模型 - 用于交互式标注 */
    INTERACTOR = 'interactor',
    /** 跟踪器模型 - 用于跟踪对象 */
    TRACKER = 'tracker',
    /** 重识别模型 - 用于重新识别对象 */
    REID = 'reid',
}

/**
 * 表示模型提供者的枚举
 * 用于定义AI模型的来源
 */
export enum ModelProviders {
    /** CVAT内置模型 */
    CVAT = 'cvat',
}

/**
 * 默认颜色调色板
 * 用于标注对象的默认颜色设置，提供一系列视觉上区分明显的颜色
 * 颜色选择考虑了视觉辨识度和对比度，确保在不同背景下都能清晰可见
 */
export const colors = [
    '#33ddff', // 浅青色
    '#fa3253', // 红色
    '#34d1b7', // 青绿色
    '#ff007c', // 深粉色
    '#ff6037', // 橙色
    '#ddff33', // 黄绿色
    '#24b353', // 绿色
    '#b83df5', // 紫色
    '#66ff66', // 浅绿色
    '#32b7fa', // 天蓝色
    '#ffcc33', // 金黄色
    '#83e070', // 浅橄榄绿
    '#fafa37', // 浅黄色
    '#5986b3', // 钢蓝色
    '#8c78f0', // 淡紫色
    '#ff6a4d', // 珊瑚色
    '#f078f0', // 淡粉色
    '#2a7dd1', // 蓝色
    '#b25050', // 棕红色
    '#cc3366', // 深粉色
    '#cc9933', // 橄榄色
    '#aaf0d1', // 浅薄荷绿
    '#ff00cc', // 洋红色
    '#3df53d', // 亮绿色
    '#fa32b7', // 深粉色
    '#fa7dbb', // 浅粉色
    '#ff355e', // 玫瑰红
    '#f59331', // 深橙色
    '#3d3df5', // 蓝紫色
    '#733380', // 深紫色
];

/**
 * 表示云存储提供者类型的枚举
 * 用于定义不同的云存储服务提供商
 */
export enum CloudStorageProviderType {
    /** AWS S3存储桶 */
    AWS_S3_BUCKET = 'AWS_S3_BUCKET',
    /** Azure容器存储 */
    AZURE_CONTAINER = 'AZURE_CONTAINER',
    /** 谷歌云存储 */
    GOOGLE_CLOUD_STORAGE = 'GOOGLE_CLOUD_STORAGE',
}

/**
 * 表示云存储凭证类型的枚举
 * 用于定义访问云存储的不同认证方式
 */
export enum CloudStorageCredentialsType {
    /** 密钥对认证 - 使用访问密钥和秘密密钥 */
    KEY_SECRET_KEY_PAIR = 'KEY_SECRET_KEY_PAIR',
    /** 账户名和令牌对认证 - 使用账户名和访问令牌 */
    ACCOUNT_NAME_TOKEN_PAIR = 'ACCOUNT_NAME_TOKEN_PAIR',
    /** 匿名访问 - 无需凭证的公开访问 */
    ANONYMOUS_ACCESS = 'ANONYMOUS_ACCESS',
    /** 密钥文件路径认证 - 使用密钥文件进行认证 */
    KEY_FILE_PATH = 'KEY_FILE_PATH',
}

/**
 * 表示云存储状态的枚举
 * 用于定义云存储的连接和访问状态
 */
export enum CloudStorageStatus {
    /** 可用状态 - 云存储正常连接且可访问 */
    AVAILABLE = 'AVAILABLE',
    /** 未找到状态 - 云存储不存在或路径错误 */
    NOT_FOUND = 'NOT_FOUND',
    /** 禁止访问状态 - 没有访问权限或凭证错误 */
    FORBIDDEN = 'FORBIDDEN',
}

/**
 * 表示成员角色的枚举
 * 用于定义组织或项目中的不同角色和权限级别
 */
export enum MembershipRole {
    /** 工作者角色 - 基础标注权限 */
    WORKER = 'worker',
    /** 监督者角色 - 可以验证和管理标注 */
    SUPERVISOR = 'supervisor',
    /** 维护者角色 - 可以管理项目设置和成员 */
    MAINTAINER = 'maintainer',
    /** 所有者角色 - 拥有完全控制权限 */
    OWNER = 'owner',
}

/**
 * 表示排序方法的枚举
 * 用于定义不同的数据排序方式
 */
export enum SortingMethod {
    /** 字典序排序 - 按字母顺序排序 */
    LEXICOGRAPHICAL = 'lexicographical',
    /** 自然排序 - 按自然语言习惯排序（如数字按数值大小） */
    NATURAL = 'natural',
    /** 预定义排序 - 按预定义的顺序排序 */
    PREDEFINED = 'predefined',
    /** 随机排序 - 随机排列顺序 */
    RANDOM = 'random',
}

/**
 * 表示存储位置的枚举
 * 用于定义数据存储的物理位置
 */
export enum StorageLocation {
    /** 本地存储 - 数据存储在本地文件系统 */
    LOCAL = 'local',
    /** 云存储 - 数据存储在云端 */
    CLOUD_STORAGE = 'cloud_storage',
}

/**
 * 表示数据存储位置的枚举
 * 扩展了基本存储位置，添加了共享选项
 */
export enum DataStorageLocation {
    /** 本地存储 - 数据存储在本地文件系统 */
    LOCAL = StorageLocation.LOCAL,
    /** 云存储 - 数据存储在云端 */
    CLOUD_STORAGE = StorageLocation.CLOUD_STORAGE,
    /** 共享存储 - 数据存储在共享位置 */
    SHARE = 'share',
}

/**
 * 表示Webhook来源类型的枚举
 * 用于定义Webhook的触发来源
 */
export enum WebhookSourceType {
    /** 组织级别 - 组织范围内的事件触发 */
    ORGANIZATION = 'organization',
    /** 项目级别 - 项目范围内的事件触发 */
    PROJECT = 'project',
}

/**
 * 表示Webhook内容类型的枚举
 * 用于定义Webhook发送的数据格式
 */
export enum WebhookContentType {
    /** JSON格式 - 使用JSON格式发送数据 */
    JSON = 'application/json',
}

/**
 * 表示标签类型的枚举
 * 用于定义不同类型的标签，用于标注对象的分类
 */
export enum LabelType {
    /** 任意类型 - 可以是任何类型的标注 */
    ANY = 'any',
    /** 矩形标签 - 用于矩形区域标注 */
    RECTANGLE = 'rectangle',
    /** 多边形标签 - 用于多边形区域标注 */
    POLYGON = 'polygon',
    /** 折线标签 - 用于折线标注 */
    POLYLINE = 'polyline',
    /** 点集标签 - 用于关键点标注 */
    POINTS = 'points',
    /** 椭圆标签 - 用于椭圆区域标注 */
    ELLIPSE = 'ellipse',
    /** 立方体标签 - 用于三维立方体标注 */
    CUBOID = 'cuboid',
    /** 骨架标签 - 用于骨架结构标注 */
    SKELETON = 'skeleton',
    /** 掩码标签 - 用于像素级精确区域标注 */
    MASK = 'mask',
    /** 标签 - 用于图像分类的标签 */
    TAG = 'tag',
}