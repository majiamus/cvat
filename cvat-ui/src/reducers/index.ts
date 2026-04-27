// Copyright (C) 2020-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

import { Canvas3d } from 'cvat-canvas3d/src/typescript/canvas3d';
import { Canvas, RectDrawingMethod, CuboidDrawingMethod } from 'cvat-canvas-wrapper';
import { OrientationVisibility } from 'cvat-canvas3d-wrapper';
import {
    Webhook, MLModel, Organization, Job, Task, Project, Label, User,
    QualityConflict, FramesMetaData, RQStatus, Event, Invitation, SerializedAPISchema,
    Request, JobValidationLayout, QualitySettings, TaskValidationLayout, ObjectState,
    ConsensusSettings, AboutData, ShapeType, ObjectType,
    Membership,
} from 'cvat-core-wrapper';
import { IntelligentScissors } from 'utils/opencv-wrapper/intelligent-scissors';
import { KeyMap, KeyMapItem } from 'utils/mousetrap-react';
import { OpenCVTracker } from 'utils/opencv-wrapper/opencv-interfaces';
import { ImageFilter } from 'utils/image-processing';

/**
 * 认证状态接口
 * 定义用户认证相关的状态信息
 */
export interface AuthState {
    /** 初始化标志，表示认证状态是否已初始化 */
    initialized: boolean;
    /** 获取标志，表示是否正在获取认证信息 */
    fetching: boolean;
    /** 用户信息，当前登录的用户对象 */
    user: User | null;
    /** 显示修改密码对话框标志，控制修改密码对话框的显示 */
    showChangePasswordDialog: boolean;
    /** 已发送邮件验证标志，表示是否已发送验证邮件 */
    hasEmailVerificationBeenSent: boolean;
}

/**
 * 项目查询参数接口
 * 定义项目列表查询的参数结构
 */
export interface ProjectsQuery {
    /** 页码，当前请求的页码 */
    page: number;
    /** 每页大小，每页显示的项目数量 */
    pageSize: number;
    /** 项目ID，筛选特定ID的项目 */
    id: number | null;
    /** 搜索关键词，用于搜索项目名称或描述 */
    search: string | null;
    /** 过滤条件，用于过滤项目列表 */
    filter: string | null;
    /** 排序方式，定义项目列表的排序规则 */
    sort: string | null;
}

/**
 * 预览接口
 * 定义项目或任务预览的状态信息
 */
interface Preview {
    /** 获取标志，表示是否正在获取预览内容 */
    fetching: boolean;
    /** 初始化标志，表示预览是否已初始化 */
    initialized: boolean;
    /** 预览内容，预览图片的URL或内容 */
    preview: string;
}

/**
 * 实例类型枚举
 * 定义系统中不同类型的实例
 */
export enum InstanceType {
    /** 项目类型 */
    PROJECT = 'project',
    /** 任务类型 */
    TASK = 'task',
    /** 作业类型 */
    JOB = 'job',
}

/**
 * 项目状态接口
 * 定义项目管理相关的状态信息
 */
export interface ProjectsState {
    /** 获取时间戳，记录最后一次获取项目数据的时间 */
    fetchingTimestamp: number;
    /** 初始化标志，表示项目状态是否已初始化 */
    initialized: boolean;
    /** 获取标志，表示是否正在获取项目数据 */
    fetching: boolean;
    /** 总数，项目总数 */
    count: number;
    /** 当前项目列表，当前显示的项目数组 */
    current: Project[];
    /** 已选择项目ID列表，用户选择的项目ID数组 */
    selected: number[];
    /** 预览集合，每个项目的预览信息 */
    previews: {
        [index: number]: Preview;
    };
    /** 获取查询参数，当前项目列表的查询参数 */
    gettingQuery: ProjectsQuery;
    /** 任务获取查询参数，项目下任务的查询参数 */
    tasksGettingQuery: TasksQuery & { ordering: string };
    /** 活动状态，记录项目的各种操作活动 */
    activities: {
        /** 创建活动，记录项目创建操作 */
        creates: {
            /** ID，新创建项目的ID */
            id: null | number;
            /** 错误信息，创建过程中的错误信息 */
            error: string;
        };
        /** 删除活动，记录项目删除操作 */
        deletes: {
            /** 删除状态，键为项目ID，值为是否已删除 */
            [projectId: number]: boolean; // deleted (deleting if in dictionary)
        };
        /** 更新活动，记录项目更新操作 */
        updates: {
            /** 更新状态，键为项目ID，值为是否已更新 */
            [projectId: number]: boolean; // updated (updating if in dictionary)
        };
    };
}

/**
 * 任务查询参数接口
 * 定义任务列表查询的参数结构
 */
export interface TasksQuery {
    /** 页码，当前请求的页码 */
    page: number;
    /** 每页大小，每页显示的任务数量 */
    pageSize: number;
    /** 任务ID，筛选特定ID的任务 */
    id: number | null;
    /** 搜索关键词，用于搜索任务名称或描述 */
    search: string | null;
    /** 过滤条件，用于过滤任务列表 */
    filter: string | null;
    /** 排序方式，定义任务列表的排序规则 */
    sort: string | null;
    /** 项目ID，筛选特定项目下的任务 */
    projectId: number | null;
}

/**
 * 作业查询参数接口
 * 定义作业列表查询的参数结构
 */
export interface JobsQuery {
    /** 页码，当前请求的页码 */
    page: number;
    /** 每页大小，每页显示的作业数量 */
    pageSize: number;
    /** 排序方式，定义作业列表的排序规则 */
    sort: string | null;
    /** 搜索关键词，用于搜索作业名称或描述 */
    search: string | null;
    /** 过滤条件，用于过滤作业列表 */
    filter: string | null;
}

/**
 * 作业状态接口
 * 定义作业管理相关的状态信息
 */
export interface JobsState {
    /** 获取时间戳，记录最后一次获取作业数据的时间 */
    fetchingTimestamp: number;
    /** 查询参数，当前作业列表的查询参数 */
    query: JobsQuery;
    /** 获取标志，表示是否正在获取作业数据 */
    fetching: boolean;
    /** 总数，作业总数 */
    count: number;
    /** 当前作业列表，当前显示的作业数组 */
    current: Job[];
    /** 已选择作业ID列表，用户选择的作业ID数组 */
    selected: number[];
    /** 预览集合，每个作业的预览信息 */
    previews: {
        [index: number]: Preview;
    };
    /** 活动状态，记录作业的各种操作活动 */
    activities: {
        /** 删除活动，记录作业删除操作 */
        deletes: {
            /** 删除状态，键为任务ID，值为是否已删除 */
            [tid: number]: boolean;
        };
    };
}

/**
 * 任务状态接口
 * 定义任务管理相关的状态信息
 */
export interface TasksState {
    /** 获取时间戳，记录最后一次获取任务数据的时间 */
    fetchingTimestamp: number;
    /** 初始化标志，表示任务状态是否已初始化 */
    initialized: boolean;
    /** 获取标志，表示是否正在获取任务数据 */
    fetching: boolean;
    /** 移动任务状态，控制任务移动操作 */
    moveTask: {
        /** 模态框可见性，控制移动任务对话框的显示 */
        modalVisible: boolean;
        /** 任务ID，待移动的任务ID */
        taskId: number | null;
    };
    /** 获取查询参数，当前任务列表的查询参数 */
    gettingQuery: TasksQuery;
    /** 总数，任务总数 */
    count: number;
    /** 当前任务列表，当前显示的任务数组 */
    current: Task[];
    /** 已选择任务ID列表，用户选择的任务ID数组 */
    selected: number[];
    /** 预览集合，每个任务的预览信息 */
    previews: {
        [index: number]: Preview;
    };
    /** 活动状态，记录任务的各种操作活动 */
    activities: {
        /** 删除活动，记录任务删除操作 */
        deletes: {
            /** 删除状态，键为任务ID，值为是否已删除 */
            [tid: number]: boolean; // deleted (deleting if in dictionary)
        };
        /** 更新活动，记录任务更新操作 */
        updates: {
            /** 更新状态，键为任务ID，值为是否已更新 */
            [taskId: number]: boolean;
        };
    };
}

/**
 * 导出状态接口
 * 定义数据导出相关的状态信息
 */
export interface ExportState {
    /** 项目导出状态 */
    projects: {
        /** 数据集导出 */
        dataset: {
            /** 模态框实例，当前选择导出的项目 */
            modalInstance: Project | null;
        };
        /** 备份导出 */
        backup: {
            /** 模态框实例，当前选择导出的项目 */
            modalInstance: Project | null;
        };
    };
    /** 任务导出状态 */
    tasks: {
        /** 数据集导出 */
        dataset: {
            /** 模态框实例，当前选择导出的任务 */
            modalInstance: Task | null;
        };
        /** 备份导出 */
        backup: {
            /** 模态框实例，当前选择导出的任务 */
            modalInstance: Task | null;
        };
    };
    /** 作业导出状态 */
    jobs: {
        /** 数据集导出 */
        dataset: {
            /** 模态框实例，当前选择导出的作业 */
            modalInstance: Job | null;
        };
    };
    /** 实例类型，当前导出的实例类型 */
    instanceType: 'project' | 'task' | 'job' | null;
}

/**
 * 导入状态接口
 * 定义数据导入相关的状态信息
 */
export interface ImportState {
    /** 项目导入状态 */
    projects: {
        /** 数据集导入 */
        dataset: {
            /** 模态框实例，当前选择导入的项目 */
            modalInstance: Project | null;
            /** 上传状态，记录文件上传的进度和状态 */
            uploadState: {
                /** ID，上传任务的ID */
                id: number | null,
                /** 格式，导入文件的格式 */
                format: string;
                /** 进度，上传进度百分比 */
                progress: number;
                /** 状态，上传状态描述 */
                status: string;
            };
        };
        /** 备份导入 */
        backup: {
            /** 模态框可见性，控制备份导入对话框的显示 */
            modalVisible: boolean;
            /** 导入标志，表示是否正在导入 */
            importing: boolean;
        }
    };
    /** 任务导入状态 */
    tasks: {
        /** 数据集导入 */
        dataset: {
            /** 模态框实例，当前选择导入的任务 */
            modalInstance: Task | null;
        };
        /** 备份导入 */
        backup: {
            /** 模态框可见性，控制备份导入对话框的显示 */
            modalVisible: boolean;
            /** 导入标志，表示是否正在导入 */
            importing: boolean;
        }
    };
    /** 作业导入状态 */
    jobs: {
        /** 数据集导入 */
        dataset: {
            /** 模态框实例，当前选择导入的作业 */
            modalInstance: Job | null;
        };
    };
    /** 实例类型，当前导入的实例类型 */
    instanceType: 'project' | 'task' | 'job' | null;
}

/**
 * 定义共识机制的状态信息，用于管理多标注者之间的标注一致性
 */
export interface ConsensusState {
    fetching: boolean; // 是否正在获取共识数据
    consensusSettings: ConsensusSettings | null; // 共识设置
    taskInstance: Task | null; // 当前任务实例
    jobInstance: Job | null; // 当前作业实例
    actions: {
        merging: {
            [instanceKey: string]: boolean; // 合并操作状态，键为实例键，值为是否正在合并
        };
    }
}

/**
 * 定义注解格式的状态信息，用于管理支持的注解格式
 */
export interface FormatsState {
    annotationFormats: any; // 注解格式列表
    fetching: boolean; // 是否正在获取注解格式
    initialized: boolean; // 注解格式是否已初始化
}

/**
 * 定义云存储查询参数的结构
 */
export interface CloudStoragesQuery {
    page: number; // 页码
    pageSize: number; // 每页大小
    id: number | null; // 云存储ID过滤器
    search: string | null; // 搜索关键词
    sort: string | null; // 排序方式
    filter: string | null; // 过滤条件
}

/**
 * 定义云存储状态信息
 */
interface CloudStorageStatus {
    fetching: boolean; // 是否正在获取云存储状态
    initialized: boolean; // 云存储状态是否已初始化
    status: string | null; // 云存储状态值
}

/**
 * 定义云存储类型
 */
export type CloudStorage = any;

/**
 * 定义云存储管理的状态信息
 */
export interface CloudStoragesState {
    initialized: boolean; // 云存储是否已初始化
    fetching: boolean; // 是否正在获取云存储数据
    count: number; // 云存储总数
    current: CloudStorage[]; // 当前云存储列表
    statuses: {
        [index: number]: CloudStorageStatus; // 云存储状态映射，键为云存储ID
    };
    previews: {
        [index: number]: Preview; // 云存储预览信息映射，键为云存储ID
    };
    gettingQuery: CloudStoragesQuery; // 当前查询参数
    activities: {
        creates: {
            attaching: boolean; // 是否正在附加云存储
            id: null | number; // 新创建的云存储ID
            error: string; // 创建错误信息
        };
        updates: {
            updating: boolean; // 是否正在更新云存储
            cloudStorageID: null | number; // 正在更新的云存储ID
            error: string; // 更新错误信息
        };
        deletes: {
            [cloudStorageID: number]: boolean; // 删除操作状态，键为云存储ID，值为是否正在删除
        };
        contentLoads: {
            cloudStorageID: number | null; // 正在加载内容的云存储ID
            content: any | null; // 加载的内容
            fetching: boolean; // 是否正在加载内容
            error: string; // 加载错误信息
        };
    };
    updateWorkspace: {
        instances: Task[] | Project[] | null, // 需要更新工作空间的实例列表
        onUpdate: (() => void) | null; // 更新回调函数
    }
    selected: number[]; // 已选中的云存储ID列表
}

/**
 * 定义批量操作状态信息
 */
export interface BulkActionStatus {
    message: string; // 操作状态消息
    percent: number; // 操作完成百分比
}

/**
 * 定义所选资源类型枚举
 */
export enum SelectedResourceType {
    PROJECTS = 'projects', // 项目资源
    TASKS = 'tasks', // 任务资源
    JOBS = 'jobs', // 作业资源
    REQUESTS = 'requests', // 请求资源
    MEMBERS = 'members', // 成员资源
    WEBHOOKS = 'webhooks', // Webhook资源
    CLOUD_STORAGES = 'cloudStorages', // 云存储资源
    MODELS = 'models', // 模型资源
}

/**
 * 定义批量操作的状态信息
 */
export interface BulkActionsState {
    fetching: boolean; // 是否正在执行批量操作
    status: BulkActionStatus | null; // 批量操作状态
    cancelled: boolean; // 操作是否已取消
}

/**
 * 定义支持的插件类型枚举
 */
export enum SupportedPlugins {
    ANALYTICS = 'ANALYTICS', // 分析插件
    MODELS = 'MODELS', // 模型插件
}

/**
 * 定义插件列表类型，映射插件名称到是否启用
 */
export type PluginsList = {
    [name in SupportedPlugins]: boolean; // 插件名称到启用状态的映射
};

/**
 * 定义回调函数返回类型
 */
export type CallbackReturnType = Promise<void | { preventJobStatusChange: boolean }>; // 回调返回值，可以是空或阻止作业状态变更的对象

/**
 * 定义插件组件结构
 */
export interface PluginComponent {
    component: any; // 插件组件
    data: {
        weight: number; // 组件权重，用于排序
        shouldBeRendered: (props?: object, state?: object) => boolean; // 判断组件是否应该渲染的函数
    };
}

/**
 * 定义插件系统的状态信息，包含插件列表、当前活动插件、回调和组件等
 */
export interface PluginsState {
    fetching: boolean; // 是否正在获取插件数据
    initialized: boolean; // 插件系统是否已初始化
    list: PluginsList; // 可用插件列表
    current: {
        [index: string]: {
            destructor: CallableFunction; // 插件销毁函数
            globalStateDidUpdate?: CallableFunction; // 全局状态更新回调函数
        };
    };
    callbacks: {
        annotationPage: {
            header: {
                menu: {
                    beforeJobFinish: (() => CallbackReturnType)[]; // 任务完成前的回调函数列表
                };
            };
        };
    };
    overridableComponents: {
        annotationPage: {
            header: {
                saveAnnotationButton: (() => JSX.Element)[]; // 可覆盖的保存按钮组件列表
            };
        };
        qualityControlPage: {
            task: {
                overviewTab: ((props: {
                    instance: Task; // 任务实例
                    qualitySettings: {
                        settings: QualitySettings | null; // 质量控制设置
                        childrenSettings: QualitySettings[] | null; // 子任务质量控制设置
                    };
                }) => JSX.Element)[]; // 任务概览标签页组件列表

                allocationTable: ((
                    props: {
                        task: Task; // 任务实例
                        gtJobId: number; // 真值任务ID
                        gtJobMeta: FramesMetaData; // 真值任务元数据
                        qualitySettings: QualitySettings; // 质量控制设置
                        validationLayout: TaskValidationLayout; // 验证布局
                        onDeleteFrames: (frames: number[]) => void; // 删除帧回调函数
                        onRestoreFrames: (frames: number[]) => void; // 恢复帧回调函数
                    }) => JSX.Element)[]; // 分配表格组件列表
            }
            project : {
                overviewTab: ((props: {
                    instance: Project; // 项目实例
                    qualitySettings: {
                        settings: QualitySettings | null; // 质量控制设置
                        childrenSettings: QualitySettings[] | null; // 子任务质量控制设置
                    };
                }) => JSX.Element)[]; // 项目概览标签页组件列表
            }
        };
        analyticsReportPage: {
            content: ((
                props: {
                    resource: Project | Task | Job; // 资源对象（项目/任务/作业）
                    timePeriod: { startDate: string; endDate: string; } | null; // 时间范围
                },
            ) => JSX.Element)[]; // 分析报告页面内容组件列表
        };
    },
    components: {
        header: {
            userMenu: {
                items: PluginComponent[]; // 用户菜单插件组件列表
            };
        };
        loginPage: {
            loginForm: PluginComponent[]; // 登录表单插件组件列表
        };
        modelsPage: {
            topBar: {
                items: PluginComponent[]; // 模型页面顶部栏插件组件列表
            };
            modelItem: {
                menu: {
                    items: PluginComponent[]; // 模型项菜单插件组件列表
                };
                topBar:{
                    menu: {
                        items: PluginComponent[]; // 模型项顶部栏菜单插件组件列表
                    };
                };
            };
        };
        projectActions: {
            items: PluginComponent[]; // 项目操作插件组件列表
        };
        taskActions: {
            items: PluginComponent[]; // 任务操作插件组件列表
        };
        jobActions: {
            items: PluginComponent[]; // 作业操作插件组件列表
        };
        taskItem: {
            ribbon: PluginComponent[]; // 任务项丝带插件组件列表
        };
        projectItem: {
            ribbon: PluginComponent[]; // 项目项丝带插件组件列表
        };
        settings: {
            player: PluginComponent[]; // 播放器设置插件组件列表
        };
        about: {
            links: {
                items: PluginComponent[]; // 关于页面链接插件组件列表
            };
        };
        router: PluginComponent[]; // 路由插件组件列表
    }
}

/**
 * 定义关于页面的状态信息，包含服务器信息和UI版本等
 */
export interface AboutState {
    server: AboutData; // 服务器相关信息
    packageVersion: {
        ui: string; // UI界面版本号
    };
    fetching: boolean; // 是否正在获取关于页面数据
    initialized: boolean; // 关于页面数据是否已初始化
}

/**
 * 定义服务器API的状态信息，包含API模式和配置
 */
export interface ServerAPIState {
    schema: SerializedAPISchema | null; // 序列化的API模式
    fetching: boolean; // 是否正在获取API数据
    initialized: boolean; // API数据是否已初始化
    configuration: {
        isRegistrationEnabled: boolean; // 是否启用用户注册
        isBasicLoginEnabled: boolean; // 是否启用基础登录
        isPasswordResetEnabled: boolean; // 是否启用密码重置
        isPasswordChangeEnabled: boolean; // 是否启用密码修改
    };
}

/**
 * 定义用户协议的结构信息
 */
export interface UserAgreement {
    name: string; // 协议名称
    urlDisplayText: string; // URL显示文本
    url: string; // 协议链接地址
    textPrefix: string; // 文本前缀
    required: boolean; // 是否为必须接受的协议
}

/**
 * 定义用户协议列表的状态信息
 */
export interface UserAgreementsState {
    list: UserAgreement[]; // 用户协议列表
    fetching: boolean; // 是否正在获取用户协议
    initialized: boolean; // 用户协议是否已初始化
}

/**
 * 定义远程文件类型
 */
export type RemoteFileType = 'DIR' | 'REG'; // 'DIR'表示目录，'REG'表示常规文件

/**
 * 定义模型属性的结构信息
 */
export interface ModelAttribute {
    name: string; // 属性名称
    values: string[]; // 属性可选值列表
    input_type: 'select' | 'number' | 'checkbox' | 'radio' | 'text'; // 输入类型
}

/**
 * 定义模型查询参数的结构
 */
export interface ModelsQuery {
    page: number; // 页码
    pageSize: number; // 每页大小
    id: number | null; // 模型ID过滤器
    search: string | null; // 搜索关键词
    filter: string | null; // 过滤条件
    sort: string | null; // 排序方式
}

/**
 * 定义OpenCV工具类型，可以是智能剪刀或OpenCV跟踪器
 */
export type OpenCVTool = IntelligentScissors | OpenCVTracker;

/**
 * 定义工具阻止状态，用于控制算法工具的可用性
 */
export interface ToolsBlockerState {
    algorithmsLocked?: boolean; // 算法是否被锁定
    buttonVisible?: boolean; // 按钮是否可见
}

/**
 * 定义活动推理的状态信息
 */
export interface ActiveInference {
    status: RQStatus; // 推理状态
    progress: number; // 推理进度（0-100）
    error: string; // 错误信息
    id: string; // 推理任务ID
    functionID: string | number; // 功能ID
}

/**
 * 定义模型管理的状态信息
 */
export interface ModelsState {
    initialized: boolean; // 模型数据是否已初始化
    fetching: boolean; // 是否正在获取模型数据
    creatingStatus: string; // 创建状态信息
    interactors: MLModel[]; // 交互模型列表
    detectors: MLModel[]; // 检测模型列表
    trackers: MLModel[]; // 跟踪模型列表
    reid: MLModel[]; // 重识别模型列表
    totalCount: number; // 模型总数
    requestedInferenceIDs: {
        [index: string]: boolean; // 请求推理的ID映射
    };
    inferences: {
        [index: number]: ActiveInference; // 活动推理映射
    };
    modelRunnerIsVisible: boolean; // 模型运行器是否可见
    modelRunnerTask: any; // 模型运行器任务
    query: ModelsQuery; // 模型查询参数
    previews: {
        [index: string]: Preview; // 模型预览映射
    };
    selected: (number | string)[]; // 选中的模型ID列表
}

/**
 * 定义错误状态的结构信息
 */
export interface ErrorState {
    message: string; // 错误消息
    reason: Error; // 错误原因
    shouldLog?: boolean; // 是否应该记录日志
    className?: string; // 错误类名
    ignore?: boolean; // 是否忽略此错误
}

/**
 * 定义通知状态的结构信息
 */
export interface NotificationState {
    message: string; // 通知消息
    description?: string; // 通知描述
    duration?: number; // 通知持续时间（毫秒）
}

/**
 * 定义批量操作错误状态，继承自ErrorState并添加批量操作特定信息
 */
export interface BulkOperationsErrorState extends ErrorState {
    remainingItemsCount: number; // 剩余待处理项数量
    retryPayload: {
        items: any[]; // 待重试的项目列表
        operation: (item: any, idx: number, total: number) => Promise<void>; // 重试操作函数
        statusMessage: (item: any, idx: number, total: number) => string; // 状态消息函数
    };
}

/**
 * 定义应用程序的通知状态结构，包含错误和消息两部分
 * 用于跟踪和管理系统中各种操作的状态反馈
 */
export interface NotificationsState {
    /**
     * 错误状态集合，按功能模块分类存储各种操作可能产生的错误
     */
    errors: {
        /**
         * 认证相关错误状态
         */
        auth: {
            authenticated: null | ErrorState; // 用户认证状态检查错误
            login: null | ErrorState; // 用户登录错误
            logout: null | ErrorState; // 用户登出错误
            register: null | ErrorState; // 用户注册错误
            changePassword: null | ErrorState; // 密码修改错误
            requestPasswordReset: null | ErrorState; // 请求密码重置错误
            resetPassword: null | ErrorState; // 密码重置错误
        };
        /**
         * 服务器API相关错误状态
         */
        serverAPI: {
            fetching: null | ErrorState; // 服务器API获取数据错误
        };
        /**
         * 项目管理相关错误状态
         */
        projects: {
            fetching: null | ErrorState; // 项目列表获取错误
            updating: null | ErrorState; // 项目更新错误
            deleting: null | ErrorState; // 项目删除错误
            creating: null | ErrorState; // 项目创建错误
            restoring: null | ErrorState; // 项目恢复错误
            backuping: null | ErrorState; // 项目备份错误
        };
        /**
         * 任务管理相关错误状态
         */
        tasks: {
            fetching: null | ErrorState; // 任务列表获取错误
            updating: null | ErrorState; // 任务更新错误
            dumping: null | ErrorState; // 任务导出错误
            loading: null | ErrorState; // 任务加载错误
            exportingAsDataset: null | ErrorState; // 任务导出为数据集错误
            deleting: null | ErrorState; // 任务删除错误
            creating: null | ErrorState; // 任务创建错误
            exporting: null | ErrorState; // 任务导出错误
            importing: null | ErrorState; // 任务导入错误
            moving: null | ErrorState; // 任务移动错误
            mergingConsensus: null | ErrorState; // 合并共识任务错误
        };
        /**
         * 作业管理相关错误状态
         */
        jobs: {
            updating: null | ErrorState; // 作业更新错误
            fetching: null | ErrorState; // 作业获取错误
            creating: null | ErrorState; // 作业创建错误
            deleting: null | ErrorState; // 作业删除错误
        };
        /**
         * 格式相关错误状态
         */
        formats: {
            fetching: null | ErrorState; // 格式获取错误
        };
        /**
         * 用户管理相关错误状态
         */
        users: {
            fetching: null | ErrorState; // 用户信息获取错误
        };
        /**
         * 关于页面相关错误状态
         */
        about: {
            fetching: null | ErrorState; // 关于信息获取错误
        };
        /**
         * 模型相关错误状态
         */
        models: {
            starting: null | ErrorState; // 模型启动错误
            fetching: null | ErrorState; // 模型获取错误
            canceling: null | ErrorState; // 模型取消错误
            metaFetching: null | ErrorState; // 模型元数据获取错误
            inferenceStatusFetching: null | ErrorState; // 推理状态获取错误
            creating: null | ErrorState; // 模型创建错误
            deleting: null | ErrorState; // 模型删除错误
        };
        /**
         * 标注相关错误状态
         */
        annotation: {
            saving: null | ErrorState; // 标注保存错误
            jobFetching: null | ErrorState; // 作业获取错误
            jobUpdating: null | ErrorState; // 作业更新错误
            frameFetching: null | ErrorState; // 帧获取错误
            changingLabelColor: null | ErrorState; // 标签颜色更改错误
            updating: null | ErrorState; // 标注更新错误
            creating: null | ErrorState; // 标注创建错误
            merging: null | ErrorState; // 标注合并错误
            grouping: null | ErrorState; // 标注分组错误
            joining: null | ErrorState; // 标注连接错误
            slicing: null | ErrorState; // 标注切片错误
            splitting: null | ErrorState; // 标注分割错误
            removing: null | ErrorState; // 标注删除错误
            propagating: null | ErrorState; // 标注传播错误
            collectingStatistics: null | ErrorState; // 统计信息收集错误
            savingJob: null | ErrorState; // 作业保存错误
            uploadAnnotations: null | ErrorState; // 标注上传错误
            removeAnnotations: null | ErrorState; // 标注移除错误
            fetchingAnnotations: null | ErrorState; // 标注获取错误
            undo: null | ErrorState; // 撤销操作错误
            redo: null | ErrorState; // 重做操作错误
            search: null | ErrorState; // 搜索错误
            deleteFrame: null | ErrorState; // 删除帧错误
            restoreFrame: null | ErrorState; // 恢复帧错误
            savingLogs: null | ErrorState; // 保存日志错误
            canvas: null | ErrorState; // 画布操作错误
        };
        /**
         * 边界相关错误状态
         */
        boundaries: {
            resetError: null | ErrorState; // 边界重置错误
        };
        /**
         * 用户协议相关错误状态
         */
        userAgreements: {
            fetching: null | ErrorState; // 用户协议获取错误
        };
        /**
         * 审核相关错误状态
         */
        review: {
            finishingIssue: null | ErrorState; // 完成问题错误
            resolvingIssue: null | ErrorState; // 解决问题错误
            reopeningIssue: null | ErrorState; // 重新打开问题错误
            commentingIssue: null | ErrorState; // 评论问题错误
            submittingReview: null | ErrorState; // 提交审核错误
            deletingIssue: null | ErrorState; // 删除问题错误
        };
        /**
         * 导出相关错误状态
         */
        exporting: {
            dataset: null | ErrorState; // 数据集导出错误
            annotation: null | ErrorState; // 标注导出错误
            backup: null | ErrorState; // 备份导出错误
        };
        /**
         * 导入相关错误状态
         */
        importing: {
            dataset: null | ErrorState; // 数据集导入错误
            annotation: null | ErrorState; // 标注导入错误
            backup: null | ErrorState; // 备份导入错误
        };
        /**
         * 云存储相关错误状态
         */
        cloudStorages: {
            creating: null | ErrorState; // 云存储创建错误
            fetching: null | ErrorState; // 云存储获取错误
            updating: null | ErrorState; // 云存储更新错误
            deleting: null | ErrorState; // 云存储删除错误
        };
        /**
         * 组织管理相关错误状态
         */
        organizations: {
            fetching: null | ErrorState; // 组织获取错误
            creating: null | ErrorState; // 组织创建错误
            updating: null | ErrorState; // 组织更新错误
            activation: null | ErrorState; // 组织激活错误
            deleting: null | ErrorState; // 组织删除错误
            leaving: null | ErrorState; // 离开组织错误
            inviting: null | ErrorState; // 邀请成员错误
            updatingMembership: null | ErrorState; // 更新成员关系错误
            removingMembership: null | ErrorState; // 移除成员错误
            deletingInvitation: null | ErrorState; // 删除邀请错误
        };
        /**
         * Webhook相关错误状态
         */
        webhooks: {
            fetching: null | ErrorState; // Webhook获取错误
            creating: null | ErrorState; // Webhook创建错误
            updating: null | ErrorState; // Webhook更新错误
            deleting: null | ErrorState; // Webhook删除错误
        };
        /**
         * 分析相关错误状态
         */
        analytics: {
            fetching: null | ErrorState; // 分析数据获取错误
            fetchingSettings: null | ErrorState; // 分析设置获取错误
            updatingSettings: null | ErrorState; // 分析设置更新错误
        };
        /**
         * 邀请相关错误状态
         */
        invitations: {
            fetching: null | ErrorState; // 邀请获取错误
            acceptingInvitation: null | ErrorState; // 接受邀请错误
            decliningInvitation: null | ErrorState; // 拒绝邀请错误
            resendingInvitation: null | ErrorState; // 重新发送邀请错误
        };
        /**
         * 请求相关错误状态
         */
        requests: {
            fetching: null | ErrorState; // 请求获取错误
            canceling: null | ErrorState; // 取消请求错误
            deleting: null | ErrorState; // 删除请求错误
        };
        /**
         * 批量操作相关错误状态
         */
        bulkOperation: {
            processing: BulkOperationsErrorState | null; // 批量操作处理错误
        }
    };
    /**
     * 消息通知状态集合，按功能模块分类存储各种操作成功后的通知消息
     */
    messages: {
        /**
         * 任务相关消息通知
         */
        tasks: {
            loadingDone: null | NotificationState; // 任务加载完成通知
            importingDone: null | NotificationState; // 任务导入完成通知
            movingDone: null | NotificationState; // 任务移动完成通知
            mergingConsensusDone: null | NotificationState; // 合并共识任务完成通知
        };
        /**
         * 模型相关消息通知
         */
        models: {
            inferenceDone: null | NotificationState; // 模型推理完成通知
        };
        /**
         * 认证相关消息通知
         */
        auth: {
            changePasswordDone: null | NotificationState; // 密码修改完成通知
            registerDone: null | NotificationState; // 用户注册完成通知
            requestPasswordResetDone: null | NotificationState; // 请求密码重置完成通知
            resetPasswordDone: null | NotificationState; // 密码重置完成通知
        };
        /**
         * 项目相关消息通知
         */
        projects: {
            restoringDone: null | NotificationState; // 项目恢复完成通知
        };
        /**
         * 导出相关消息通知
         */
        exporting: {
            dataset: null | NotificationState; // 数据集导出完成通知
            annotation: null | NotificationState; // 标注导出完成通知
            backup: null | NotificationState; // 备份导出完成通知
        };
        /**
         * 导入相关消息通知
         */
        importing: {
            dataset: null | NotificationState; // 数据集导入完成通知
            annotation: null | NotificationState; // 标注导入完成通知
            backup: null | NotificationState; // 备份导入完成通知
        };
        /**
         * 邀请相关消息通知
         */
        invitations: {
            newInvitations: null | NotificationState; // 新邀请通知
            acceptInvitationDone: null | NotificationState; // 接受邀请完成通知
            declineInvitationDone: null | NotificationState; // 拒绝邀请完成通知
            resendingInvitation: null | NotificationState; // 重新发送邀请通知
        }
    };
}

/**
 * 活动控件枚举，定义CVAT应用中所有可用的用户交互模式和工具
 */
export enum ActiveControl {
    /** 标准光标模式，用于选择和操作对象 */
    CURSOR = 'cursor',
    /** 拖拽画布模式，用于平移视图 */
    DRAG_CANVAS = 'drag_canvas',
    /** 缩放画布模式，用于放大/缩小视图 */
    ZOOM_CANVAS = 'zoom_canvas',
    /** 绘制矩形模式 */
    DRAW_RECTANGLE = 'draw_rectangle',
    /** 绘制多边形模式 */
    DRAW_POLYGON = 'draw_polygon',
    /** 绘制折线模式 */
    DRAW_POLYLINE = 'draw_polyline',
    /** 绘制点模式 */
    DRAW_POINTS = 'draw_points',
    /** 绘制椭圆模式 */
    DRAW_ELLIPSE = 'draw_ellipse',
    /** 绘制遮罩模式 */
    DRAW_MASK = 'draw_mask',
    /** 绘制立方体模式 */
    DRAW_CUBOID = 'draw_cuboid',
    /** 绘制骨架模式 */
    DRAW_SKELETON = 'draw_skeleton',
    /** 合并对象模式 */
    MERGE = 'merge',
    /** 组合对象模式 */
    GROUP = 'group',
    /** 连接对象模式 */
    JOIN = 'join',
    /** 分割对象模式 */
    SPLIT = 'split',
    /** 切片对象模式 */
    SLICE = 'slice',
    /** 编辑对象模式 */
    EDIT = 'edit',
    /** 打开问题模式 */
    OPEN_ISSUE = 'open_issue',
    /** AI工具模式 */
    AI_TOOLS = 'ai_tools',
    /** 照片上下文模式 */
    PHOTO_CONTEXT = 'PHOTO_CONTEXT',
    /** OpenCV工具模式 */
    OPENCV_TOOLS = 'opencv_tools',
}

/**
 * 状态排序枚举
 * 定义标注对象列表的不同排序方式
 */
export enum StatesOrdering {
    /** ID降序，按照ID从大到小排序 */
    ID_DESCENT = 'ID - descent',
    /** ID升序，按照ID从小到大排序 */
    ID_ASCENT = 'ID - ascent',
    /** 更新时间，按照最后更新时间排序 */
    UPDATED = 'Updated time',
    /** Z顺序，按照标注对象的Z轴层级排序 */
    Z_ORDER = 'Z Order',
}

/**
 * 上下文菜单类型枚举
 * 定义画布上不同类型对象的上下文菜单
 */
export enum ContextMenuType {
    /** 画布形状，针对画布上形状对象的上下文菜单 */
    CANVAS_SHAPE = 'canvas_shape',
    /** 画布形状点，针对形状上特定点的上下文菜单 */
    CANVAS_SHAPE_POINT = 'canvas_shape_point',
}

/**
 * 旋转枚举
 * 定义图像或对象的旋转方向
 */
export enum Rotation {
    /** 逆时针90度旋转 */
    ANTICLOCKWISE90,
    /** 顺时针90度旋转 */
    CLOCKWISE90,
}

/**
 * 导航类型枚举
 * 定义播放器导航的不同模式
 */
export enum NavigationType {
    /** 常规模式，按顺序浏览所有帧 */
    REGULAR = 'regular',
    /** 过滤模式，只浏览符合过滤条件的帧 */
    FILTERED = 'filtered',
    /** 空模式，没有可导航的帧 */
    EMPTY = 'empty',
}

/**
 * 编辑状态接口
 * 定义当前编辑操作的状态信息
 */
export interface EditingState {
    /** 对象状态，当前正在编辑的标注对象状态 */
    objectState: ObjectState | null;
}

/**
 * 标注状态接口
 * 定义了标注工作区的完整状态结构，包括活动、画布、任务、播放器、绘制、编辑、标注对象等各个方面的状态
 */
export interface AnnotationState {
    /** 活动状态，跟踪当前进行的各种操作活动 */
    activities: {
        /** 加载状态，跟踪当前正在进行的加载操作 */
        loads: {
            /** 同时只能有一个加载操作，键为任务ID，值为加载器名称 */
            [jid: number]: string; // loader name
        };
    };
    /** 画布状态，管理标注画布的各种状态和交互 */
    canvas: {
        /** 上下文菜单状态，控制右键菜单的显示和内容 */
        contextMenu: {
            /** 可见性标志，控制上下文菜单是否显示 */
            visible: boolean;
            /** 菜单顶部位置，相对于视口的Y坐标 */
            top: number;
            /** 菜单左侧位置，相对于视口的X坐标 */
            left: number;
            /** 菜单类型，定义上下文菜单的类型和行为 */
            type: ContextMenuType;
            /** 点ID，上下文菜单关联的点对象ID */
            pointID: number | null;
            /** 父对象ID，上下文菜单关联的父对象ID */
            parentID: number | null;
            /** 标注对象ID，上下文菜单关联的标注对象ID */
            clientID: number | null;
        };
        /** 画笔工具状态，控制画笔工具面板的显示 */
        brushTools: {
            /** 可见性标志，控制画笔工具面板是否显示 */
            visible: boolean;
            /** 面板顶部位置，相对于视口的Y坐标 */
            top: number;
            /** 面板左侧位置，相对于视口的X坐标 */
            left: number;
        };
        /** 画布实例，存储当前活动的画布对象 */
        instance: Canvas | Canvas3d | null;
        /** 就绪标志，表示画布是否已初始化并准备好交互 */
        ready: boolean;
        /** 活动控件，当前活动的画布控件 */
        activeControl: ActiveControl;
        /** 活动对象隐藏标志，控制当前活动对象是否隐藏 */
        activeObjectHidden: boolean;
    };
    /** 任务状态，管理当前标注任务的相关信息 */
    job: {
        /** 打开时间，记录任务打开的时间戳 */
        openTime: null | number;
        /** 标签列表，任务中可用的标注标签 */
        labels: Label[];
        /** 请求ID，当前请求的任务ID */
        requestedId: number | null;
        /** 元数据，帧的元数据信息 */
        meta: FramesMetaData | null;
        /** 任务实例，当前加载的任务对象 */
        instance: Job | null | undefined;
        /** 帧编号列表，任务中包含的所有帧编号 */
        frameNumbers: number[];
        /** 查询参数，任务初始化时的查询参数 */
        queryParameters: {
            /** 初始打开指南标志，控制是否在打开时显示指南 */
            initialOpenGuide: boolean;
            /** 默认标签，新标注对象的默认标签 */
            defaultLabel: string | null;
            /** 默认点数，点标注对象的默认点数 */
            defaultPointsCount: number | null;
        };
        /** 真值信息，用于验证标注质量的真实标注数据 */
        groundTruthInfo: {
            /** 验证布局，定义验证界面的布局结构 */
            validationLayout: JobValidationLayout | null;
            /** 真值任务帧元数据，真值任务的帧元数据信息 */
            groundTruthJobFramesMeta: FramesMetaData | null;
            /** 真值任务实例，真值任务的对象实例 */
            groundTruthInstance: Job | null;
        },
        /** 属性映射，存储标签ID与对应属性列表的映射关系 */
        attributes: Record<number, any[]>;
        /** 获取标志，表示是否正在获取任务数据 */
        fetching: boolean;
        /** 保存标志，表示是否正在保存任务数据 */
        saving: boolean;
    };
    /** 播放器状态，管理视频/序列播放器的状态 */
    player: {
        /** 帧信息，当前显示帧的详细信息 */
        frame: {
            /** 帧编号，当前显示的帧序号 */
            number: number;
            /** 文件名，当前帧的文件名 */
            filename: string;
            /** 相关文件数量，与当前帧相关的文件数量 */
            relatedFiles: number;
            /** 帧数据，当前帧的原始数据 */
            data: any | null;
            /** 获取标志，表示是否正在获取帧数据 */
            fetching: boolean;
            /** 延迟，帧切换的延迟时间（毫秒） */
            delay: number;
            /** 变更时间，最后一次帧变更的时间戳 */
            changeTime: number | null;
            /** 变更帧事件，帧变更时触发的事件对象 */
            changeFrameEvent: Event | null;
        };
        /** 导航类型，定义播放器的导航方式 */
        navigationType: NavigationType;
        /** 范围，定义播放的帧范围 */
        ranges: string;
        /** 导航阻塞标志，控制是否阻塞导航操作 */
        navigationBlocked: boolean;
        /** 播放标志，表示是否正在播放序列 */
        playing: boolean;
        /** 帧角度数组，存储各帧的旋转角度信息 */
        frameAngles: number[];
    };
    /** 绘制状态，管理当前绘制操作的状态和设置 */
    drawing: {
        /** 活动交互器，当前活动的AI模型或OpenCV工具 */
        activeInteractor?: MLModel | OpenCVTool;
        /** 活动交互器参数，当前活动交互器的参数配置 */
        activeInteractorParameters?: MLModel['params']['canvas'];
        /** 活动形状类型，当前选择的绘制形状类型 */
        activeShapeType: ShapeType | null;
        /** 活动矩形绘制方法，绘制矩形时使用的方法 */
        activeRectDrawingMethod?: RectDrawingMethod;
        /** 活动立方体绘制方法，绘制立方体时使用的方法 */
        activeCuboidDrawingMethod?: CuboidDrawingMethod;
        /** 活动点数，点标注对象需要的点数 */
        activeNumOfPoints?: number;
        /** 活动标签ID，新标注对象的标签ID */
        activeLabelID: number | null;
        /** 活动对象类型，当前标注的对象类型 */
        activeObjectType: ObjectType;
        /** 活动初始状态，新标注对象的初始状态 */
        activeInitialState?: any;
    };
    /** 编辑状态，管理当前编辑操作的状态 */
    editing: EditingState;
    /** 标注对象状态，管理标注对象列表和相关操作 */
    annotations: {
        /** 活动状态ID，当前激活的标注状态ID */
        activatedStateID: number | null;
        /** 活动元素ID，当前激活的标注元素ID */
        activatedElementID: number | null;
        /** 活动属性ID，当前激活的属性ID */
        activatedAttributeID: number | null;
        /** 高亮冲突，当前高亮显示的质量冲突 */
        highlightedConflict: QualityConflict | null;
        /** 折叠状态，记录每个标注对象的折叠状态 */
        collapsed: Record<number, boolean>;
        /** 全部折叠标志，控制是否折叠所有标注对象 */
        collapsedAll: boolean;
        /** 状态列表，存储所有标注状态 */
        states: any[];
        /** 过滤器列表，应用于标注对象的过滤器 */
        filters: object[];
        /** 重置组标志，控制是否重置标注对象分组 */
        resetGroupFlag: boolean;
        /** 初始化标志，表示标注状态是否已初始化 */
        initialized: boolean;
        /** 历史记录，存储撤销和重做操作的历史 */
        history: {
            /** 撤销列表，可撤销的操作历史 */
            undo: [string, number][];
            /** 重做列表，可重做的操作历史 */
            redo: [string, number][];
        };
        /** 保存状态，跟踪保存操作的状态 */
        saving: {
            /** 强制退出标志，控制是否强制退出保存操作 */
            forceExit: boolean;
            /** 上传标志，表示是否正在上传标注数据 */
            uploading: boolean;
        };
        /** Z层级，管理标注对象的层级关系 */
        zLayer: {
            /** 最小层级，Z层级的最小值 */
            min: number;
            /** 最大层级，Z层的最大值 */
            max: number;
            /** 当前层级，当前活动的Z层级 */
            cur: number;
        };
    };
    /** 删除状态，管理标注对象删除操作的状态 */
    remove: {
        /** 对象状态，待删除的标注对象状态 */
        objectState: any;
        /** 强制标志，控制是否强制删除对象 */
        force: boolean;
    }
    /** 统计状态，管理标注统计信息 */
    statistics: {
        /** 收集标志，表示是否正在收集统计数据 */
        collecting: boolean;
        /** 可见性标志，控制统计面板是否显示 */
        visible: boolean;
        /** 统计数据，收集到的统计信息 */
        data: any;
    };
    /** 搜索状态，管理标注搜索功能 */
    search: {
        /** 可见性标志，控制搜索面板是否显示 */
        visible: boolean;
    }
    /** 传播状态，管理标注传播功能 */
    propagate: {
        /** 可见性标志，控制传播面板是否显示 */
        visible: boolean;
    };
    /** 颜色列表，用于标注对象的颜色配置 */
    colors: any[];
    /** 过滤器面板可见性，控制过滤器面板是否显示 */
    filtersPanelVisible: boolean;
    /** 侧边栏折叠状态，控制侧边栏是否折叠 */
    sidebarCollapsed: boolean;
    /** 外观面板折叠状态，控制外观设置面板是否折叠 */
    appearanceCollapsed: boolean;
    /** 工作区类型，当前使用的工作区类型 */
    workspace: Workspace;
}

/**
 * 工作区类型枚举
 * 定义了CVAT中可用的不同标注工作区模式，每种模式适用于不同的标注场景
 */
export enum Workspace {
    /** 3D标准标注工作区 - 用于处理3D数据集的标注任务 */
    STANDARD3D = 'Standard 3D',
    /** 标准标注工作区 - 默认的2D图像标注模式，支持多种标注工具 */
    STANDARD = 'Standard',
    /** 属性标注工作区 - 专注于对象属性标注的专用模式 */
    ATTRIBUTES = 'Attribute annotation',
    /** 单一形状标注工作区 - 仅支持单个形状标注的简化模式 */
    SINGLE_SHAPE = 'Single shape',
    /** 标签标注工作区 - 用于图像分类或打标签任务的专用模式 */
    TAGS = 'Tag annotation',
    /** 审核工作区 - 用于审核和验证已完成标注的专用模式 */
    REVIEW = 'Review',
}

/**
 * 网格颜色枚举
 * 定义了标注画布中可用的网格颜色选项
 */
export enum GridColor {
    /** 白色网格 */
    White = 'White',
    /** 黑色网格 */
    Black = 'Black',
    /** 红色网格 */
    Red = 'Red',
    /** 绿色网格 */
    Green = 'Green',
    /** 蓝色网格 */
    Blue = 'Blue',
}

/**
 * 帧播放速度枚举
 * 定义了视频序列播放时的速度选项，数值越大播放越快
 */
export enum FrameSpeed {
    /** 最快速度 - 100帧/秒 */
    Fastest = 100,
    /** 快速 - 50帧/秒 */
    Fast = 50,
    /** 常规速度 - 25帧/秒 */
    Usual = 25,
    /** 慢速 - 15帧/秒 */
    Slow = 15,
    /** 较慢速度 - 12帧/秒 */
    Slower = 12,
    /** 最慢速度 - 1帧/秒 */
    Slowest = 1,
}

/**
 * 颜色分类依据枚举
 * 定义了标注对象颜色的分类方式，用于控制不同标注对象的显示颜色
 */
export enum ColorBy {
    /** 按实例分类 - 每个标注对象有独立颜色 */
    INSTANCE = 'Instance',
    /** 按组分类 - 同一组内的标注对象使用相同颜色 */
    GROUP = 'Group',
    /** 按标签分类 - 相同标签的标注对象使用相同颜色 */
    LABEL = 'Label',
}

/**
 * 播放器设置状态接口
 * 定义了视频播放器相关的显示和行为设置
 */
export interface PlayerSettingsState {
    /** 画布背景颜色 */
    canvasBackgroundColor: string;
    /** 帧步进值，控制快进/快退时的帧数跳跃 */
    frameStep: number;
    /** 播放速度，引用FrameSpeed枚举值 */
    frameSpeed: FrameSpeed;
    /** 重置缩放标志，控制是否自动重置缩放 */
    resetZoom: boolean;
    /** 全部旋转标志，控制是否允许旋转所有对象 */
    rotateAll: boolean;
    /** 图像平滑标志，控制是否启用图像平滑处理 */
    smoothImage: boolean;
    /** 显示已删除帧标志，控制是否显示标记为删除的帧 */
    showDeletedFrames: boolean;
    /** 网格显示标志，控制是否显示辅助网格 */
    grid: boolean;
    /** 网格大小，控制网格单元的尺寸 */
    gridSize: number;
    /** 网格颜色，引用GridColor枚举值 */
    gridColor: GridColor;
    /** 网格不透明度，以百分比表示 */
    gridOpacity: number; // in %
    /** 亮度级别，控制图像显示亮度 */
    brightnessLevel: number;
    /** 对比度级别，控制图像显示对比度 */
    contrastLevel: number;
    /** 饱和度级别，控制图像显示饱和度 */
    saturationLevel: number;
}

/**
 * 工作区设置状态接口
 * 定义了标注工作区的各种行为和显示设置
 */
export interface WorkspaceSettingsState {
    /** 自动保存标志，控制是否启用自动保存功能 */
    autoSave: boolean;
    /** 自动保存间隔，以毫秒为单位 */
    autoSaveInterval: number; // in ms
    /** 高级标注模式缩放边距 */
    aamZoomMargin: number;
    /** 自动边框标志，控制是否自动添加边框 */
    automaticBordering: boolean;
    /** 自适应缩放标志，控制是否根据内容自动调整缩放 */
    adaptiveZoom: boolean;
    /** 始终显示对象文本标志，控制是否持续显示标注对象文本 */
    showObjectsTextAlways: boolean;
    /** 显示所有插值轨道标志，控制是否显示插值对象的完整轨道 */
    showAllInterpolationTracks: boolean;
    /** 智能多边形裁剪标志，控制是否启用智能多边形裁剪功能 */
    intelligentPolygonCrop: boolean;
    /** 默认多边形近似精度，控制多边形简化的精度级别 */
    defaultApproxPolyAccuracy: number;
    /** 工具阻塞状态，控制工具的可用性和交互状态 */
    toolsBlockerState: ToolsBlockerState;
    /** 文本字体大小，控制标注文本的显示大小 */
    textFontSize: number;
    /** 控制点大小，控制标注控制点的显示大小 */
    controlPointsSize: number;
    /** 文本位置，控制标注文本的显示位置 */
    textPosition: 'auto' | 'center';
    /** 文本内容，定义标注文本的默认内容模板 */
    textContent: string;
    /** 在帧上显示标签标志，控制是否在帧上显示标签信息 */
    showTagsOnFrame: boolean;
}

/**
 * 形状设置状态接口
 * 定义了标注形状的显示和渲染设置
 */
export interface ShapesSettingsState {
    /** 颜色分类依据，引用ColorBy枚举值 */
    colorBy: ColorBy;
    /** 不透明度，控制标注形状的透明度 */
    opacity: number;
    /** 选中状态不透明度，控制被选中标注形状的透明度 */
    selectedOpacity: number;
    /** 轮廓显示标志，控制是否显示标注形状的轮廓 */
    outlined: boolean;
    /** 轮廓颜色，定义标注形状轮廓的颜色 */
    outlineColor: string;
    /** 显示位图标志，控制是否显示位图形式的标注 */
    showBitmap: boolean;
    /** 显示投影标志，控制是否显示3D对象的投影 */
    showProjections: boolean;
    /** 显示真值标志，控制是否显示真实标注数据 */
    showGroundTruth: boolean;
    /** 方向可见性，控制对象方向指示器的显示方式 */
    orientationVisibility: OrientationVisibility;
}

/**
 * 设置状态接口
 * 整合了所有设置子模块的状态，形成完整的设置状态结构
 */
export interface SettingsState {
    /** 形状相关设置 */
    shapes: ShapesSettingsState;
    /** 工作区相关设置 */
    workspace: WorkspaceSettingsState;
    /** 播放器相关设置 */
    player: PlayerSettingsState;
    /** 图像滤镜列表 */
    imageFilters: ImageFilter[];
    /** 设置对话框显示标志，控制是否显示设置对话框 */
    showDialog: boolean;
}

/**
 * 快捷键状态接口
 * 定义了快捷键相关的状态和映射关系
 */
export interface ShortcutsState {
    /** 快捷键帮助可见性标志，控制是否显示快捷键帮助界面 */
    visibleShortcutsHelp: boolean;
    /** 键位映射，定义按键与功能的映射关系 */
    keyMap: KeyMap;
    /** 标准化键位映射，提供标准化的按键表示 */
    normalizedKeyMap: Record<string, string>;
    /** 默认状态，存储快捷键的默认配置 */
    defaultState: Record<string, KeyMapItem>
}

/**
 * 审核状态枚举
 * 定义了标注审核过程中的不同状态
 */
export enum ReviewStatus {
    /** 已接受 - 标注通过审核 */
    ACCEPTED = 'accepted',
    /** 已拒绝 - 标注未通过审核 */
    REJECTED = 'rejected',
    /** 需要进一步审核 - 标注需要更多审核工作 */
    REVIEW_FURTHER = 'review_further',
}

/**
 * 新问题来源枚举
 * 定义了创建审核问题的不同来源方式
 */
export enum NewIssueSource {
    /** 问题工具 - 通过专门的问题工具创建 */
    ISSUE_TOOL = 'tool',
    /** 快速问题 - 通过快速问题功能创建 */
    QUICK_ISSUE = 'quick_issue',
}

/**
 * 审核状态接口
 * 定义了标注审核过程中的状态和数据结构
 */
export interface ReviewState {
    /** 问题列表，存储所有审核问题 */
    issues: any[];
    /** 帧问题列表，存储与特定帧相关的问题 */
    frameIssues: any[];
    /** 最新评论列表，存储最近的审核评论 */
    latestComments: string[];
    /** 新问题对象，包含位置和来源信息 */
    newIssue: {
        /** 问题位置坐标数组 */
        position: number[] | null;
        /** 问题来源，引用NewIssueSource枚举 */
        source: NewIssueSource | null;
    }
    /** 问题隐藏标志，控制是否隐藏问题 */
    issuesHidden: boolean;
    /** 已解决问题隐藏标志，控制是否隐藏已解决的问题 */
    issuesResolvedHidden: boolean;
    /** 质量冲突列表，存储标注质量冲突 */
    conflicts: QualityConflict[];
    /** 帧质量冲突列表，存储与特定帧相关的质量冲突 */
    frameConflicts: QualityConflict[];
    /** 获取状态，跟踪当前获取操作的ID */
    fetching: {
        /** 任务ID，当前获取操作关联的任务 */
        jobId: number | null;
        /** 问题ID，当前获取操作关联的问题 */
        issueId: number | null;
    };
}

/**
 * 组织成员查询接口
 * 定义了查询组织成员的参数结构
 */
export interface OrganizationMembersQuery {
    /** 搜索关键词，用于过滤成员 */
    search: string | null;
    /** 过滤条件，用于筛选成员 */
    filter: string | null;
    /** 排序方式，定义成员列表的排序规则 */
    sort: string | null;
    /** 页码，分页查询的当前页 */
    page: number;
    /** 每页大小，每页显示的成员数量 */
    pageSize: number;
}

/**
 * 组织查询接口
 * 定义了查询组织的参数结构
 */
export interface OrganizationsQuery {
    /** 页码，分页查询的当前页 */
    page: number;
    /** 搜索关键词，用于过滤组织 */
    search: string;
}

/**
 * 组织状态接口
 * 定义了组织管理相关的状态和数据结构
 */
export interface OrganizationState {
    /** 当前组织信息，可能为空 */
    current?: Organization | null;
    /** 初始化标志，表示组织状态是否已初始化 */
    initialized: boolean;
    /** 获取标志，表示是否正在获取组织数据 */
    fetching: boolean;
    /** 更新标志，表示是否正在更新组织信息 */
    updating: boolean;
    /** 邀请标志，表示是否正在发送邀请 */
    inviting: boolean;
    /** 离开标志，表示是否正在离开组织 */
    leaving: boolean;
    /** 移除成员标志，表示是否正在移除成员 */
    removingMember: boolean;
    /** 更新成员标志，表示是否正在更新成员信息 */
    updatingMember: boolean;
    /** 获取成员标志，表示是否正在获取成员列表 */
    fetchingMembers: boolean;

    /** 获取查询参数，用于获取组织列表 */
    gettingQuery: OrganizationsQuery;
    /** 组织数组，存储当前获取的组织列表 */
    currentArray: Organization[];
    /** 组织数组获取标志，表示是否正在获取组织数组 */
    currentArrayFetching: boolean;
    /** 总数，组织列表的总数量 */
    count: number;
    /** 下一页URL，用于分页加载 */
    nextPageUrl: string | null;

    /** 选择模态框状态，控制组织选择对话框的显示和行为 */
    selectModal: {
        /** 可见性标志，控制模态框是否显示 */
        visible: boolean;
        /** 选择回调函数，组织选择后的回调处理 */
        onSelectCallback: ((org: Organization | null) => void) | null;
    };

    /** 成员列表，存储组织成员信息 */
    members: Membership[];
    /** 选中成员ID列表，存储当前选中的成员ID */
    selectedMembers: number[];
    /** 成员查询参数，用于查询组织成员 */
    membersQuery: OrganizationMembersQuery;
}

/**
 * Webhook查询接口
 * 定义了查询Webhook的参数结构
 */
export interface WebhooksQuery {
    /** 页码，分页查询的当前页 */
    page: number;
    /** 每页大小，每页显示的Webhook数量 */
    pageSize: number;
    /** ID过滤器，按ID筛选Webhook */
    id: number | null;
    /** 搜索关键词，用于过滤Webhook */
    search: string | null;
    /** 过滤条件，用于筛选Webhook */
    filter: string | null;
    /** 排序方式，定义Webhook列表的排序规则 */
    sort: string | null;
    /** 项目ID过滤器，按项目ID筛选Webhook */
    projectId: number | null;
}

/**
 * Webhook状态接口
 * 定义了Webhook管理相关的状态和数据结构
 */
export interface WebhooksState {
    /** 当前Webhook列表，存储所有Webhook */
    current: Webhook[],
    /** 选中ID列表，存储当前选中的Webhook ID */
    selected: number[];
    /** 总数，Webhook列表的总数量 */
    totalCount: number;
    /** 获取标志，表示是否正在获取Webhook数据 */
    fetching: boolean;
    /** 查询参数，用于查询Webhook */
    query: WebhooksQuery;
    /** 活动状态，跟踪Webhook的各种操作活动 */
    activities: {
        /** 删除活动，跟踪Webhook的删除状态 */
        deletes: {
            /** 删除状态映射，键为Webhook ID，值为是否已删除 */
            [webhookId: number]: boolean; // deleted (deleting if in dictionary)
        };
    }
}

/**
 * 邀请查询接口
 * 定义了查询邀请的参数结构
 */
export interface InvitationsQuery {
    /** 页码，分页查询的当前页 */
    page: number;
    /** 每页大小，每页显示的邀请数量 */
    pageSize: number;
}

/**
 * 邀请状态接口
 * 定义了邀请管理相关的状态和数据结构
 */
export interface InvitationsState {
    /** 获取标志，表示是否正在获取邀请数据 */
    fetching: boolean;
    /** 初始化标志，表示邀请状态是否已初始化 */
    initialized: boolean;
    /** 当前邀请列表，存储所有邀请 */
    current: Invitation[];
    /** 总数，邀请列表的总数量 */
    count: number;
    /** 查询参数，用于查询邀请 */
    query: InvitationsQuery;
}

/**
 * 请求查询接口
 * 定义了查询请求的参数结构
 */
export interface RequestsQuery {
    /** 页码，分页查询的当前页 */
    page: number;
    /** 每页大小，每页显示的请求数量 */
    pageSize: number;
}

/**
 * 请求状态接口
 * 定义了请求管理相关的状态和数据结构
 */
export interface RequestsState {
    /** 获取标志，表示是否正在获取请求数据 */
    fetching: boolean;
    /** 初始化标志，表示请求状态是否已初始化 */
    initialized: boolean;
    /** 请求映射，存储所有请求，键为请求ID */
    requests: Record<string, Request>;
    /** 取消状态映射，跟踪请求的取消状态 */
    cancelled: Record<string, boolean>;
    /** 选中ID列表，存储当前选中的请求ID */
    selected: string[];
    /** 查询参数，用于查询请求 */
    query: RequestsQuery;
}

/**
 * 导航状态接口
 * 定义了应用导航相关的状态
 */
export interface NavigationState {
    /** 前一个位置，记录用户上一个访问的位置 */
    prevLocation: string | null;
}

/**
 * 组合状态接口
 * 整合了应用中所有状态模块，形成完整的应用状态结构
 */
export interface CombinedState {
    /** 认证状态，管理用户登录和认证信息 */
    auth: AuthState;
    /** 项目状态，管理项目相关数据 */
    projects: ProjectsState;
    /** 任务状态，管理任务相关数据 */
    jobs: JobsState;
    /** 任务状态，管理任务相关数据 */
    tasks: TasksState;
    /** 关于状态，管理应用相关信息 */
    about: AboutState;
    /** 格式状态，管理数据格式相关设置 */
    formats: FormatsState;
    /** 用户协议状态，管理用户协议相关数据 */
    userAgreements: UserAgreementsState;
    /** 插件状态，管理插件相关数据 */
    plugins: PluginsState;
    /** 模型状态，管理AI模型相关数据 */
    models: ModelsState;
    /** 通知状态，管理通知相关数据 */
    notifications: NotificationsState;
    /** 标注状态，管理标注相关数据和操作 */
    annotation: AnnotationState;
    /** 设置状态，管理应用设置 */
    settings: SettingsState;
    /** 快捷键状态，管理快捷键相关设置 */
    shortcuts: ShortcutsState;
    /** 审核状态，管理标注审核相关数据 */
    review: ReviewState;
    /** 导出状态，管理数据导出相关操作 */
    export: ExportState;
    /** 导入状态，管理数据导入相关操作 */
    import: ImportState;
    /** 共识状态，管理标注共识相关数据 */
    consensus: ConsensusState;
    /** 云存储状态，管理云存储相关数据 */
    cloudStorages: CloudStoragesState;
    /** 组织状态，管理组织相关数据 */
    organizations: OrganizationState;
    /** 邀请状态，管理邀请相关数据 */
    invitations: InvitationsState;
    /** Webhook状态，管理Webhook相关数据 */
    webhooks: WebhooksState;
    /** 请求状态，管理请求相关数据 */
    requests: RequestsState;
    /** 批量操作状态，管理批量操作相关数据 */
    bulkActions: BulkActionsState;
    /** 服务器API状态，管理服务器API交互状态 */
    serverAPI: ServerAPIState;
    /** 导航状态，管理应用导航相关状态 */
    navigation: NavigationState;
}

/**
 * 可索引接口
 * 定义了可以通过字符串索引访问任意类型值的对象结构
 */
export interface Indexable {
    /** 索引签名，允许通过字符串键访问任意类型的值 */
    [index: string]: any;
}
