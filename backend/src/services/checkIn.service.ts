import { CheckInModel, CheckIn, CheckInStatus } from '../models/checkIn.model';
import { UserModel } from '../models/user.model';
import { PointsRecordModel, RecordType } from '../models/benefits.model';

// 里程碑配置
export const MILESTONES = [
  { days: 7, bonusPoints: 50 },
  { days: 14, bonusPoints: 100 },
  { days: 30, bonusPoints: 200 },
];

// 里程碑信息
export interface MilestoneInfo {
  days: number;
  bonusPoints: number;
  daysRemaining: number;
}

// Check-in result interface
export interface CheckInResult {
  success: boolean;
  checkIn?: CheckIn;
  pointsEarned: number;
  bonusPoints: number;  // 里程碑奖励
  consecutiveDays: number;
  milestone?: MilestoneInfo;
  message: string;
}

// Extended check-in status
export interface ExtendedCheckInStatus extends CheckInStatus {
  nextMilestone: MilestoneInfo | null;
}

// Points configuration based on consecutive days
const getPointsForConsecutiveDays = (days: number): number => {
  // Base points: 10
  // Bonus for consecutive days: +2 per day, max 30 points
  const basePoints = 10;
  const bonusPerDay = 2;
  const maxPoints = 30;
  
  const points = basePoints + (days - 1) * bonusPerDay;
  return Math.min(points, maxPoints);
};

// Get next milestone info
const getNextMilestone = (consecutiveDays: number): MilestoneInfo | null => {
  for (const milestone of MILESTONES) {
    if (consecutiveDays < milestone.days) {
      return {
        days: milestone.days,
        bonusPoints: milestone.bonusPoints,
        daysRemaining: milestone.days - consecutiveDays,
      };
    }
  }
  return null;
};

// Check if reached a milestone
const checkMilestone = (consecutiveDays: number): { reached: boolean; bonusPoints: number } => {
  for (const milestone of MILESTONES) {
    if (consecutiveDays === milestone.days) {
      return { reached: true, bonusPoints: milestone.bonusPoints };
    }
  }
  return { reached: false, bonusPoints: 0 };
};

// Extended status with calendar
export interface ExtendedCheckInStatusWithCalendar extends ExtendedCheckInStatus {
  calendar: CheckIn[];
}

export class CheckInService {
  // Get check-in status for a user
  static async getCheckInStatus(userId: string): Promise<ExtendedCheckInStatusWithCalendar | null> {
    const user = await UserModel.findById(userId);
    if (!user) return null;

    const status = await CheckInModel.getCheckInStatus(userId);
    const nextMilestone = getNextMilestone(status.consecutiveDays);

    // 获取最近7天的签到记录
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const startDate = sevenDaysAgo.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];
    const calendar = await CheckInModel.findByUserInDateRange(userId, startDate, endDate);

    return {
      ...status,
      nextMilestone,
      calendar,
    };
  }

  // Perform check-in for a user
  static async checkIn(userId: string): Promise<CheckInResult> {
    const user = await UserModel.findById(userId);
    if (!user) {
      return {
        success: false,
        pointsEarned: 0,
        bonusPoints: 0,
        consecutiveDays: 0,
        message: 'User not found',
      };
    }

    const today = new Date().toISOString().split('T')[0];

    // Check if already checked in today
    const existingCheckIn = await CheckInModel.findByUserAndDate(userId, today);
    if (existingCheckIn) {
      return {
        success: false,
        checkIn: existingCheckIn,
        pointsEarned: 0,
        bonusPoints: 0,
        consecutiveDays: existingCheckIn.consecutiveDays,
        message: 'Already checked in today',
      };
    }

    // Calculate consecutive days
    const latest = await CheckInModel.findLatestByUser(userId);
    let consecutiveDays = 1;

    if (latest) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (latest.checkInDate === yesterdayStr) {
        // Continue the streak
        consecutiveDays = latest.consecutiveDays + 1;
      }
      // Otherwise, streak is broken, start from 1
    }

    // Calculate points based on consecutive days
    const pointsEarned = getPointsForConsecutiveDays(consecutiveDays);

    // Create check-in record
    const checkIn = await CheckInModel.create({
      userId,
      checkInDate: today,
      pointsEarned,
      consecutiveDays,
    });

    // Add base points to user
    await PointsRecordModel.create(
      {
        userId,
        type: RecordType.CHECK_IN,
        points: pointsEarned,
        description: `签到获得积分 (连续${consecutiveDays}天)`,
        relatedId: checkIn.id,
      },
      user.points
    );

    // Update user points
    await UserModel.updatePoints(userId, pointsEarned);

    // Check for milestone bonus
    let bonusPoints = 0;
    const milestoneCheck = checkMilestone(consecutiveDays);
    if (milestoneCheck.reached) {
      bonusPoints = milestoneCheck.bonusPoints;
      
      // Add milestone bonus points
      const updatedUser = await UserModel.findById(userId);
      await PointsRecordModel.create(
        {
          userId,
          type: RecordType.MILESTONE,
          points: bonusPoints,
          description: `连续签到${consecutiveDays}天里程碑奖励`,
          relatedId: checkIn.id,
        },
        updatedUser!.points
      );
      
      await UserModel.updatePoints(userId, bonusPoints);
    }

    const nextMilestone = getNextMilestone(consecutiveDays);

    return {
      success: true,
      checkIn,
      pointsEarned,
      bonusPoints,
      consecutiveDays,
      milestone: nextMilestone || undefined,
      message: `Check-in successful! Earned ${pointsEarned} points.${bonusPoints > 0 ? ` Milestone bonus: ${bonusPoints} points!` : ''}`,
    };
  }

  // Get check-in calendar for a month
  static async getCheckInCalendar(
    userId: string,
    year: number,
    month: number
  ): Promise<CheckIn[]> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    return CheckInModel.findByUserInDateRange(userId, startDate, endDate);
  }
}
