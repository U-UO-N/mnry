# Requirements Document

## Introduction

完善电商小程序的签到系统和积分制度，包括每日签到、连续签到奖励、积分获取与消费、积分商城等功能，提升用户活跃度和粘性。

## Glossary

- **Check_In_System**: 签到系统，用户每日签到获取积分的功能模块
- **Points_System**: 积分系统，管理用户积分的获取、消费和记录
- **Consecutive_Days**: 连续签到天数，用户不间断签到的累计天数
- **Points_Record**: 积分记录，记录用户积分变动的明细
- **Exchange_Item**: 兑换商品，可用积分兑换的商品或优惠券

## Requirements

### Requirement 1: 每日签到功能

**User Story:** As a user, I want to check in daily, so that I can earn points and rewards.

#### Acceptance Criteria

1. WHEN a user clicks the check-in button THEN the Check_In_System SHALL record the check-in and award base points
2. WHEN a user has already checked in today THEN the Check_In_System SHALL display "已签到" status and prevent duplicate check-in
3. WHEN a user checks in THEN the Check_In_System SHALL display the points earned with animation feedback
4. THE Check_In_System SHALL display a 7-day calendar showing check-in history
5. WHEN the check-in page loads THEN the Check_In_System SHALL show current consecutive days and today's check-in status

### Requirement 2: 连续签到奖励

**User Story:** As a user, I want to receive bonus rewards for consecutive check-ins, so that I am motivated to check in daily.

#### Acceptance Criteria

1. THE Points_System SHALL calculate points based on consecutive days: base 10 points + 2 bonus per consecutive day (max 30)
2. WHEN a user reaches 7 consecutive days THEN the Points_System SHALL award an additional 50 bonus points
3. WHEN a user misses a day THEN the Check_In_System SHALL reset consecutive days to 0
4. THE Check_In_System SHALL display the consecutive day milestone rewards (7天、14天、30天)
5. WHEN a user is close to a milestone THEN the Check_In_System SHALL show reminder notification

### Requirement 3: 积分获取渠道

**User Story:** As a user, I want to earn points through various activities, so that I can accumulate more rewards.

#### Acceptance Criteria

1. WHEN a user completes an order THEN the Points_System SHALL award points based on order amount (1 point per yuan)
2. WHEN a user writes a product review THEN the Points_System SHALL award 10 points
3. WHEN a user shares a product THEN the Points_System SHALL award 5 points (once per product per day)
4. WHEN a user invites a new user who registers THEN the Points_System SHALL award 100 points
5. THE Points_System SHALL record all points transactions with type, amount, and description

### Requirement 4: 积分消费功能

**User Story:** As a user, I want to use my points for discounts and exchanges, so that my points have value.

#### Acceptance Criteria

1. WHEN placing an order THEN the Points_System SHALL allow using points for discount (100 points = 1 yuan)
2. WHEN a user has insufficient points THEN the Points_System SHALL disable the points usage option
3. WHEN an order is cancelled or refunded THEN the Points_System SHALL return the used points
4. THE Points_System SHALL set a maximum points usage limit per order (e.g., 50% of order amount)
5. WHEN points are used THEN the Points_System SHALL create a deduction record

### Requirement 5: 积分商城

**User Story:** As a user, I want to exchange points for products or coupons, so that I can redeem my accumulated points.

#### Acceptance Criteria

1. THE Exchange_System SHALL display available exchange items with points cost and stock
2. WHEN a user exchanges an item THEN the Exchange_System SHALL deduct points and create exchange order
3. WHEN a user has insufficient points THEN the Exchange_System SHALL disable the exchange button
4. WHEN an exchange item is out of stock THEN the Exchange_System SHALL show "已兑完" status
5. THE Exchange_System SHALL support exchanging for coupons or physical products

### Requirement 6: 积分明细查询

**User Story:** As a user, I want to view my points history, so that I can track my points transactions.

#### Acceptance Criteria

1. THE Points_System SHALL display total available points prominently
2. THE Points_System SHALL list all points records with date, type, amount, and description
3. THE Points_System SHALL support filtering records by type (获取/消费)
4. THE Points_System SHALL support pagination for large record lists
5. WHEN viewing a record THEN the Points_System SHALL show related order or activity details

### Requirement 7: 签到提醒

**User Story:** As a user, I want to receive check-in reminders, so that I don't miss my daily check-in.

#### Acceptance Criteria

1. WHEN a user enables notifications THEN the Check_In_System SHALL send daily check-in reminder
2. THE Check_In_System SHALL show a check-in entry point on the user center page
3. WHEN a user hasn't checked in today THEN the Check_In_System SHALL display a red dot indicator
4. IF a user is about to break their streak THEN the Check_In_System SHALL send a special reminder

