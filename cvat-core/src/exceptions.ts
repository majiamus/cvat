// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

// 导入平台检测库，用于获取操作系统和浏览器信息
import Platform from 'platform';
// 导入错误堆栈解析库，用于解析错误堆栈信息
import ErrorStackParser from 'error-stack-parser';

/**
 * 基础异常类，继承自Error类
 * 提供了详细的错误信息，包括时间、系统、客户端、文件位置等
 */
export class Exception extends Error {
    // 只读属性，用于存储异常发生的时间
    private readonly time: string;
    // 只读属性，用于存储操作系统信息
    private readonly system: string;
    // 只读属性，用于存储客户端（浏览器）信息
    private readonly client: string;
    // 只读属性，用于存储错误堆栈信息
    private readonly info: string;
    // 只读属性，用于存储错误发生的文件名
    private readonly filename: string;
    // 只读属性，用于存储错误发生的行号
    private readonly line: number;
    // 只读属性，用于存储错误发生的列号
    private readonly column: number;

    /**
     * 创建Exception实例
     * @param message 错误消息
     */
    constructor(message) {
        // 调用父类Error的构造函数
        super(message);
        // 获取当前时间的ISO字符串格式
        const time = new Date().toISOString();
        // 获取操作系统信息
        const system = Platform.os.toString();
        // 获取浏览器信息，包括名称和版本
        const client = `${Platform.name} ${Platform.version}`;
        // 解析错误堆栈，获取第一个堆栈帧（通常是错误发生的位置）
        const info = ErrorStackParser.parse(this)[0];
        // 获取错误发生的文件名
        const filename = `${info.fileName}`;
        // 获取错误发生的行号
        const line = info.lineNumber;
        // 获取错误发生的列号
        const column = info.columnNumber;

        // 使用Object.defineProperties定义只读属性
        Object.defineProperties(
            this,
            Object.freeze({
                system: {
                    /**
                     * @name system
                     * @type {string}
                     * @memberof module:API.cvat.exceptions.Exception
                     * @readonly
                     * @instance
                     * @description 获取操作系统信息
                     */
                    get: () => system,
                },
                client: {
                    /**
                     * @name client
                     * @type {string}
                     * @memberof module:API.cvat.exceptions.Exception
                     * @readonly
                     * @instance
                     * @description 获取客户端（浏览器）信息
                     */
                    get: () => client,
                },
                time: {
                    /**
                     * @name time
                     * @type {string}
                     * @memberof module:API.cvat.exceptions.Exception
                     * @readonly
                     * @instance
                     * @description 获取异常发生的时间
                     */
                    get: () => time,
                },
                filename: {
                    /**
                     * @name filename
                     * @type {string}
                     * @memberof module:API.cvat.exceptions.Exception
                     * @readonly
                     * @instance
                     * @description 获取异常发生的文件名
                     */
                    get: () => filename,
                },
                line: {
                    /**
                     * @name line
                     * @type {number}
                     * @memberof module:API.cvat.exceptions.Exception
                     * @readonly
                     * @instance
                     * @description 获取异常发生的行号
                     */
                    get: () => line,
                },
                column: {
                    /**
                     * @name column
                     * @type {number}
                     * @memberof module:API.cvat.exceptions.Exception
                     * @readonly
                     * @instance
                     * @description 获取异常发生的列号
                     */
                    get: () => column,
                },
            }),
        );
    }
}

/**
 * 参数错误异常类，继承自Exception
 * 用于处理函数参数错误
 */
export class ArgumentError extends Exception {}

/**
 * 数据错误异常类，继承自Exception
 * 用于处理数据格式或内容错误
 */
export class DataError extends Exception {}

/**
 * 脚本错误异常类，继承自Exception
 * 用于处理脚本执行错误
 */
export class ScriptingError extends Exception {}

/**
 * 请求错误异常类，继承自Exception
 * 用于处理网络请求错误
 */
export class RequestError extends Exception {}

/**
 * 服务器错误异常类，继承自Exception
 * 用于处理服务器返回的错误响应
 */
export class ServerError extends Exception {
    // 公共属性，用于存储服务器错误代码
    public code: number;
    
    /**
     * 创建ServerError实例
     * @param message 错误消息
     * @param code 服务器错误代码
     */
    constructor(message, code) {
        // 调用父类Exception的构造函数
        super(message);

        // 使用Object.defineProperties定义只读属性
        Object.defineProperties(
            this,
            Object.freeze({
                code: {
                    /**
                     * @name code
                     * @type {number}
                     * @memberof module:API.cvat.exceptions.ServerError
                     * @readonly
                     * @instance
                     * @description 获取服务器错误代码
                     */
                    get: () => code,
                },
            }),
        );
    }
}