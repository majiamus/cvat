// Copyright (C) 2019-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/**
 * 主控器接口，提供观察者模式的核心功能
 * 用于管理监听器并通知它们状态变化
 */
export interface Master {
    /**
     * 订阅主控器的状态变化通知
     * @param listener - 要添加的监听器对象
     */
    subscribe(listener: Listener): void;
    
    /**
     * 通知所有已订阅的监听器状态发生变化
     * @param reason - 状态变化的原因描述
     */
    notify(reason: string): void;
}

/**
 * 监听器接口，定义接收主控器通知的方法
 */
export interface Listener {
    /**
     * 接收主控器的状态变化通知
     * @param master - 发送通知的主控器实例
     * @param reason - 状态变化的原因描述
     */
    notify(master: Master, reason: string): void;
}

/**
 * 主控器实现类，提供观察者模式的具体实现
 * 管理监听器列表并提供订阅和通知功能
 */
export class MasterImpl implements Master {
    /** 存储所有已订阅的监听器 */
    private listeners: Listener[];

    /**
     * 创建主控器实例
     */
    public constructor() {
        // 初始化监听器数组
        this.listeners = [];
    }

    /**
     * 订阅主控器的状态变化通知
     * @param listener - 要添加的监听器对象
     */
    public subscribe(listener: Listener): void {
        // 将监听器添加到监听器数组
        this.listeners.push(listener);
    }

    /**
     * 通知所有已订阅的监听器状态发生变化
     * @param reason - 状态变化的原因描述
     */
    public notify(reason: string): void {
        // 遍历所有监听器并调用其通知方法
        for (const listener of this.listeners) {
            // 调用监听器的通知方法，传入主控器实例和变化原因
            listener.notify(this, reason);
        }
    }
}
