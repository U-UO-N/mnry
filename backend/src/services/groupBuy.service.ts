import {
  GroupBuyActivityModel,
  GroupBuyGroupModel,
  GroupBuyOrderModel,
  GroupBuyActivity,
  GroupBuyGroup,
  GroupBuyOrder,
  GroupBuyActivityDetail,
  GroupBuyGroupDetail,
  GroupBuyParticipant,
  ActivityStatus,
  GroupBuyStatus,
  CreateActivityDTO,
  UpdateActivityDTO,
  ActivityQuery,
} from '../models/groupBuy.model';
import { ProductModel } from '../models/product.model';
import { UserModel } from '../models/user.model';
import { BusinessError } from '../middlewares/errorHandler';
import { BusinessErrorCode, PaginatedResult } from '../types';

// Group buy activity with product info for list display
export interface GroupBuyActivityWithProduct extends GroupBuyActivity {
  productName: string;
  productImage: string;
  productStock: number;
}

// My group buy order with details
export interface MyGroupBuyOrder extends GroupBuyOrder {
  activity: GroupBuyActivity;
  group: GroupBuyGroup;
  productName: string;
  productImage: string;
}

export class GroupBuyService {
  // Get active group buy activities with pagination
  static async getActivities(
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResult<GroupBuyActivityWithProduct>> {
    const result = await GroupBuyActivityModel.findMany({
      status: ActivityStatus.ACTIVE,
      page,
      pageSize,
    });

    // Enrich with product info
    const items: GroupBuyActivityWithProduct[] = [];
    for (const activity of result.items) {
      const product = await ProductModel.findById(activity.productId);
      items.push({
        ...activity,
        productName: product?.name || '',
        productImage: product?.mainImage || '',
        productStock: product?.stock || 0,
      });
    }

    return {
      items,
      total: result.total,
      page,
      pageSize,
      totalPages: Math.ceil(result.total / pageSize),
    };
  }


  // Get activity detail with product info
  static async getActivityDetail(activityId: string): Promise<GroupBuyActivityDetail> {
    const activity = await GroupBuyActivityModel.findById(activityId);
    if (!activity) {
      throw new BusinessError('Group buy activity not found', BusinessErrorCode.GROUP_BUY_NOT_FOUND);
    }

    const product = await ProductModel.findById(activity.productId);

    return {
      ...activity,
      productName: product?.name,
      productImage: product?.mainImage,
      productStock: product?.stock,
      productDescription: product?.description,
    };
  }

  // Validate group price is less than original price
  static validateGroupPrice(groupPrice: number, originalPrice: number): boolean {
    return groupPrice < originalPrice && groupPrice > 0 && originalPrice > 0;
  }

  // Get group detail with participants
  static async getGroupDetail(groupId: string): Promise<GroupBuyGroupDetail> {
    const group = await GroupBuyGroupModel.findById(groupId);
    if (!group) {
      throw new BusinessError('Group buy group not found', BusinessErrorCode.GROUP_BUY_NOT_FOUND);
    }

    const activity = await GroupBuyActivityModel.findById(group.activityId);
    const orders = await GroupBuyOrderModel.findByGroupId(groupId);

    // Get participant info
    const participants: GroupBuyParticipant[] = [];
    for (const order of orders) {
      const user = await UserModel.findById(order.userId);
      participants.push({
        userId: order.userId,
        nickname: user?.nickname ?? undefined,
        avatar: user?.avatar ?? undefined,
        joinedAt: order.createdAt,
      });
    }

    return {
      ...group,
      activity: activity || undefined,
      participants,
    };
  }

  // Initiate a new group buy
  static async initiateGroupBuy(userId: string, activityId: string): Promise<GroupBuyGroupDetail> {
    // Validate activity
    const activity = await GroupBuyActivityModel.findById(activityId);
    if (!activity) {
      throw new BusinessError('Group buy activity not found', BusinessErrorCode.GROUP_BUY_NOT_FOUND);
    }

    if (activity.status !== ActivityStatus.ACTIVE) {
      throw new BusinessError('Group buy activity is not active', BusinessErrorCode.GROUP_BUY_EXPIRED);
    }

    // Check if activity has ended
    if (new Date() > activity.endTime) {
      throw new BusinessError('Group buy activity has ended', BusinessErrorCode.GROUP_BUY_EXPIRED);
    }

    // Calculate expire time based on activity time limit
    const expireTime = new Date();
    expireTime.setHours(expireTime.getHours() + activity.timeLimit);

    // Make sure expire time doesn't exceed activity end time
    if (expireTime > activity.endTime) {
      expireTime.setTime(activity.endTime.getTime());
    }

    // Create group
    const group = await GroupBuyGroupModel.create({
      activityId,
      initiatorId: userId,
      expireTime,
    });

    // Create group buy order for initiator
    await GroupBuyOrderModel.create({
      groupId: group.id,
      userId,
      activityId,
    });

    return this.getGroupDetail(group.id);
  }


  // Join an existing group
  static async joinGroupBuy(userId: string, groupId: string): Promise<GroupBuyGroupDetail> {
    // Validate group
    const group = await GroupBuyGroupModel.findById(groupId);
    if (!group) {
      throw new BusinessError('Group buy group not found', BusinessErrorCode.GROUP_BUY_NOT_FOUND);
    }

    // Check if group is still in progress
    if (group.status !== GroupBuyStatus.IN_PROGRESS) {
      throw new BusinessError('Group buy has ended', BusinessErrorCode.GROUP_BUY_EXPIRED);
    }

    // Check if group has expired
    if (new Date() > group.expireTime) {
      throw new BusinessError('Group buy has expired', BusinessErrorCode.GROUP_BUY_EXPIRED);
    }

    // Validate activity
    const activity = await GroupBuyActivityModel.findById(group.activityId);
    if (!activity) {
      throw new BusinessError('Group buy activity not found', BusinessErrorCode.GROUP_BUY_NOT_FOUND);
    }

    // Check if group is full
    if (group.currentCount >= activity.requiredCount) {
      throw new BusinessError('Group buy is full', BusinessErrorCode.GROUP_BUY_FULL);
    }

    // Check if user already joined this group
    const existingOrder = await GroupBuyOrderModel.findByUserAndGroup(userId, groupId);
    if (existingOrder) {
      throw new BusinessError('You have already joined this group', BusinessErrorCode.GROUP_BUY_FULL);
    }

    // Check if user has reached max participation limit for this activity
    const userParticipationCount = await GroupBuyOrderModel.countByUserAndActivity(userId, group.activityId);
    if (userParticipationCount >= activity.maxPerUser) {
      throw new BusinessError(`每人最多参与${activity.maxPerUser}次`, BusinessErrorCode.GROUP_BUY_FULL);
    }

    // Create group buy order for participant
    await GroupBuyOrderModel.create({
      groupId,
      userId,
      activityId: group.activityId,
    });

    // Increment group count
    const updatedGroup = await GroupBuyGroupModel.incrementCount(groupId);

    // Check if group is now complete
    if (updatedGroup && updatedGroup.currentCount >= activity.requiredCount) {
      // Mark group as success
      await GroupBuyGroupModel.updateStatus(groupId, GroupBuyStatus.SUCCESS);
      // Update all orders in the group
      await GroupBuyOrderModel.updateStatusByGroupId(groupId, GroupBuyStatus.SUCCESS);
    }

    return this.getGroupDetail(groupId);
  }

  // Get user's group buy orders
  static async getMyGroupBuys(
    userId: string,
    status?: GroupBuyStatus
  ): Promise<MyGroupBuyOrder[]> {
    const orders = await GroupBuyOrderModel.findByUserId(userId, status);

    const result: MyGroupBuyOrder[] = [];
    for (const order of orders) {
      const activity = await GroupBuyActivityModel.findById(order.activityId);
      const group = await GroupBuyGroupModel.findById(order.groupId);
      const product = activity ? await ProductModel.findById(activity.productId) : null;

      if (activity && group) {
        result.push({
          ...order,
          activity,
          group,
          productName: product?.name || '',
          productImage: product?.mainImage || '',
        });
      }
    }

    return result;
  }


  // Process expired groups (for scheduled task)
  static async processExpiredGroups(): Promise<{ processed: number; refunded: number }> {
    const expiredGroups = await GroupBuyGroupModel.findExpiredInProgress();
    let processed = 0;
    let refunded = 0;

    for (const group of expiredGroups) {
      // Mark group as failed
      await GroupBuyGroupModel.updateStatus(group.id, GroupBuyStatus.FAILED);
      
      // Update all orders in the group to failed
      await GroupBuyOrderModel.updateStatusByGroupId(group.id, GroupBuyStatus.FAILED);
      
      // Get all orders for refund processing
      const orders = await GroupBuyOrderModel.findByGroupId(group.id);
      
      // TODO: Process refunds for each order
      // This would integrate with the payment service
      refunded += orders.length;
      processed++;
    }

    return { processed, refunded };
  }

  // Check if a group should be marked as success
  static async checkGroupCompletion(groupId: string): Promise<boolean> {
    const group = await GroupBuyGroupModel.findById(groupId);
    if (!group || group.status !== GroupBuyStatus.IN_PROGRESS) {
      return false;
    }

    const activity = await GroupBuyActivityModel.findById(group.activityId);
    if (!activity) {
      return false;
    }

    if (group.currentCount >= activity.requiredCount) {
      await GroupBuyGroupModel.updateStatus(groupId, GroupBuyStatus.SUCCESS);
      await GroupBuyOrderModel.updateStatusByGroupId(groupId, GroupBuyStatus.SUCCESS);
      return true;
    }

    return false;
  }

  // Get available groups to join for an activity
  static async getAvailableGroups(activityId: string): Promise<GroupBuyGroupDetail[]> {
    const groups = await GroupBuyGroupModel.findActiveByActivityId(activityId);
    
    const result: GroupBuyGroupDetail[] = [];
    for (const group of groups) {
      const detail = await this.getGroupDetail(group.id);
      result.push(detail);
    }

    return result;
  }

  // Admin: Create activity
  static async createActivity(data: CreateActivityDTO): Promise<GroupBuyActivity> {
    // Validate product exists
    const product = await ProductModel.findById(data.productId);
    if (!product) {
      throw new BusinessError('Product not found', BusinessErrorCode.PRODUCT_NOT_FOUND);
    }

    // Validate prices
    if (!this.validateGroupPrice(data.groupPrice, data.originalPrice)) {
      throw new BusinessError(
        'Group price must be less than original price',
        BusinessErrorCode.ORDER_STATUS_INVALID
      );
    }

    return GroupBuyActivityModel.create(data);
  }

  // Admin: Update activity
  static async updateActivity(
    activityId: string,
    data: UpdateActivityDTO
  ): Promise<GroupBuyActivity> {
    const activity = await GroupBuyActivityModel.findById(activityId);
    if (!activity) {
      throw new BusinessError('Group buy activity not found', BusinessErrorCode.GROUP_BUY_NOT_FOUND);
    }

    // Validate prices if both are provided
    const newGroupPrice = data.groupPrice ?? activity.groupPrice;
    const newOriginalPrice = data.originalPrice ?? activity.originalPrice;
    if (!this.validateGroupPrice(newGroupPrice, newOriginalPrice)) {
      throw new BusinessError(
        'Group price must be less than original price',
        BusinessErrorCode.ORDER_STATUS_INVALID
      );
    }

    const updated = await GroupBuyActivityModel.update(activityId, data);
    if (!updated) {
      throw new Error('Failed to update activity');
    }
    return updated;
  }

  // Admin: Get all activities with pagination
  static async getAllActivities(
    query: ActivityQuery
  ): Promise<PaginatedResult<GroupBuyActivityWithProduct>> {
    const result = await GroupBuyActivityModel.findMany(query);

    const items: GroupBuyActivityWithProduct[] = [];
    const now = new Date();
    
    for (const activity of result.items) {
      const product = await ProductModel.findById(activity.productId);
      
      // 计算显示状态（不自动更新数据库，让用户手动控制）
      let displayStatus = activity.status;
      const startTime = new Date(activity.startTime);
      const endTime = new Date(activity.endTime);
      
      // 只有当状态是 active 且已过期时，才自动更新为 ended
      if (displayStatus === ActivityStatus.ACTIVE && now >= endTime) {
        displayStatus = ActivityStatus.ENDED;
        await GroupBuyActivityModel.updateStatus(activity.id, ActivityStatus.ENDED);
      }
      
      items.push({
        ...activity,
        status: displayStatus,
        productName: product?.name || '',
        productImage: product?.mainImage || '',
        productStock: product?.stock || 0,
      });
    }

    return {
      items,
      total: result.total,
      page: query.page || 1,
      pageSize: query.pageSize || 20,
      totalPages: Math.ceil(result.total / (query.pageSize || 20)),
    };
  }

  // Admin: Manually start activity
  static async startActivity(activityId: string): Promise<GroupBuyActivity> {
    const activity = await GroupBuyActivityModel.findById(activityId);
    if (!activity) {
      throw new BusinessError('Group buy activity not found', BusinessErrorCode.GROUP_BUY_NOT_FOUND);
    }
    
    if (activity.status === ActivityStatus.ENDED) {
      throw new BusinessError('Cannot start an ended activity', BusinessErrorCode.ORDER_STATUS_INVALID);
    }
    
    // 检查活动是否已过期
    const now = new Date();
    const endTime = new Date(activity.endTime);
    if (now >= endTime) {
      throw new BusinessError('活动已过期，无法开始。请先修改活动结束时间。', BusinessErrorCode.ORDER_STATUS_INVALID);
    }
    
    const updated = await GroupBuyActivityModel.updateStatus(activityId, ActivityStatus.ACTIVE);
    if (!updated) {
      throw new Error('Failed to start activity');
    }
    return updated;
  }

  // Admin: Manually end activity
  static async endActivity(activityId: string): Promise<GroupBuyActivity> {
    const activity = await GroupBuyActivityModel.findById(activityId);
    if (!activity) {
      throw new BusinessError('Group buy activity not found', BusinessErrorCode.GROUP_BUY_NOT_FOUND);
    }
    
    const updated = await GroupBuyActivityModel.updateStatus(activityId, ActivityStatus.ENDED);
    if (!updated) {
      throw new Error('Failed to end activity');
    }
    return updated;
  }
}
