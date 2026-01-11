# Implementation Plan: 签到系统和积分制度

## Overview

基于现有代码结构，完善签到系统和积分制度功能。主要涉及后端服务增强、小程序页面优化和新功能开发。

## Tasks

- [x] 1. 完善后端积分类型和服务
  - [x] 1.1 扩展积分类型枚举
    - 在 benefits.model.ts 中添加新的 RecordType: review, share, invite, order_use
    - 更新数据库 points_records 表的 type 枚举
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 1.2 实现积分服务增强
    - 创建 PointsService 类，封装积分操作
    - 实现 addPoints、deductPoints 方法
    - 实现 calculateOrderPointsDiscount 计算订单可用积分
    - _Requirements: 4.1, 4.4_

  - [ ]* 1.3 编写积分计算属性测试
    - **Property 2: 连续签到积分计算正确性**
    - **Validates: Requirements 2.1**

- [x] 2. 完善签到服务
  - [x] 2.1 增强签到服务功能
    - 在 checkIn.service.ts 中添加里程碑奖励逻辑
    - 实现 7天、14天、30天里程碑检测和奖励
    - 添加 nextMilestone 信息到签到状态
    - _Requirements: 2.1, 2.2, 2.4_

  - [x] 2.2 优化连续签到计算
    - 修复连续天数计算逻辑
    - 确保中断后正确重置
    - _Requirements: 2.3_

  - [ ]* 2.3 编写签到幂等性属性测试
    - **Property 1: 签到幂等性**
    - **Validates: Requirements 1.2**

  - [ ]* 2.4 编写连续签到重置属性测试
    - **Property 3: 连续签到中断重置**
    - **Validates: Requirements 2.3**

- [x] 3. Checkpoint - 确保后端服务测试通过
  - 运行所有测试，确保通过
  - 如有问题请询问用户

- [x] 4. 完善积分使用和退款
  - [x] 4.1 实现订单积分抵扣
    - 在 order.service.ts 中添加积分抵扣逻辑
    - 实现 100积分=1元 的换算
    - 添加最大抵扣限制（50%订单金额）
    - _Requirements: 4.1, 4.4_

  - [x] 4.2 实现退款积分返还
    - 在退款流程中添加积分返还逻辑
    - 创建退款积分记录
    - _Requirements: 4.3_

  - [ ]* 4.3 编写积分退款返还属性测试
    - **Property 7: 积分退款返还**
    - **Validates: Requirements 4.3**

- [x] 5. 完善兑换服务
  - [x] 5.1 增强兑换服务
    - 在 exchange.service.ts 中添加库存检查
    - 添加积分余额检查
    - 优化兑换流程
    - _Requirements: 5.2, 5.3, 5.4_

  - [ ]* 5.2 编写兑换属性测试
    - **Property 8: 兑换积分扣减正确性**
    - **Property 9: 库存不足阻止兑换**
    - **Property 10: 积分不足阻止操作**
    - **Validates: Requirements 5.2, 5.3, 5.4**

- [x] 6. 完善小程序签到页面
  - [x] 6.1 优化签到页面UI
    - 添加签到动画效果
    - 显示里程碑进度
    - 优化签到日历显示
    - _Requirements: 1.3, 1.4, 2.4_

  - [x] 6.2 添加签到状态指示
    - 在个人中心添加签到入口红点
    - 显示连续签到天数
    - _Requirements: 7.2, 7.3_

- [x] 7. 完善小程序积分页面
  - [x] 7.1 优化积分明细页面
    - 添加筛选功能（获取/消费）
    - 优化分页加载
    - 显示记录详情
    - _Requirements: 6.2, 6.3, 6.4, 6.5_

  - [x] 7.2 优化积分商城页面
    - 显示库存状态
    - 添加积分不足提示
    - 优化兑换确认流程
    - _Requirements: 5.1, 5.3, 5.4_

- [x] 8. 完善订单积分功能
  - [x] 8.1 订单确认页积分抵扣
    - 在 confirm.vue 中添加积分抵扣选项
    - 显示可用积分和最大抵扣金额
    - 实时计算抵扣后金额
    - _Requirements: 4.1, 4.2, 4.4_

- [x] 9. Final Checkpoint - 全面测试
  - 测试签到流程
  - 测试积分获取和消费
  - 测试兑换流程
  - 如有问题请询问用户

## Notes

- 任务标记 `*` 为可选测试任务
- 基于现有代码结构进行增强，避免大规模重构
- 优先完成核心功能，UI优化可后续迭代

