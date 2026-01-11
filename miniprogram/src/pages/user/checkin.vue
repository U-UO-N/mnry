<template>
  <view class="checkin-page">
    <view class="checkin-header">
      <text class="continuous-days">已连续签到 {{ continuousDays }} 天</text>
      <view 
        :class="['checkin-btn', { checked: checkedIn, animating: isAnimating }]"
        @click="doCheckIn"
      >
        <text class="btn-text">{{ checkedIn ? '今日已签到' : '立即签到' }}</text>
        <text v-if="!checkedIn" class="btn-points">+{{ todayPoints }}积分</text>
      </view>
      <!-- 里程碑进度 -->
      <view v-if="nextMilestone" class="milestone-info">
        <text>再签{{ nextMilestone.daysRemaining }}天可获得{{ nextMilestone.bonusPoints }}积分奖励</text>
      </view>
    </view>

    <!-- 里程碑奖励 -->
    <view class="milestone-section card">
      <view class="section-title">连续签到奖励</view>
      <view class="milestone-list">
        <view 
          v-for="milestone in milestones" 
          :key="milestone.days"
          :class="['milestone-item', { reached: continuousDays >= milestone.days }]"
        >
          <view class="milestone-icon">{{ continuousDays >= milestone.days ? '🎁' : '🎀' }}</view>
          <text class="milestone-days">{{ milestone.days }}天</text>
          <text class="milestone-points">+{{ milestone.bonusPoints }}积分</text>
        </view>
      </view>
    </view>

    <view class="calendar-section card">
      <view class="section-title">签到日历</view>
      <view class="calendar-grid">
        <view 
          v-for="day in calendarDays" 
          :key="day.date"
          :class="['calendar-day', { checked: day.checked, today: day.isToday }]"
        >
          <text class="day-num">{{ day.day }}</text>
          <text v-if="day.checked" class="check-icon">✓</text>
        </view>
      </view>
    </view>

    <view class="rules-section card">
      <view class="section-title">签到规则</view>
      <view class="rules-content">
        <text>1. 每日签到可获得10-30积分（连续签到越多积分越高）</text>
        <text>2. 连续签到7天额外奖励50积分</text>
        <text>3. 连续签到14天额外奖励100积分</text>
        <text>4. 连续签到30天额外奖励200积分</text>
        <text>5. 签到中断后连续天数重新计算</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getCheckInStatus, checkIn } from '@/api/user'
import { showToast } from '@/utils'

interface MilestoneInfo {
  days: number
  bonusPoints: number
  daysRemaining?: number
}

const checkedIn = ref(false)
const continuousDays = ref(0)
const calendar = ref<any[]>([])
const nextMilestone = ref<MilestoneInfo | null>(null)
const isAnimating = ref(false)

// 里程碑配置
const milestones: MilestoneInfo[] = [
  { days: 7, bonusPoints: 50 },
  { days: 14, bonusPoints: 100 },
  { days: 30, bonusPoints: 200 }
]

// 计算今日可获得积分
const todayPoints = computed(() => {
  const basePoints = 10
  const bonusPerDay = 2
  const maxPoints = 30
  const days = continuousDays.value + 1
  return Math.min(basePoints + (days - 1) * bonusPerDay, maxPoints)
})

const calendarDays = computed(() => {
  const today = new Date()
  const days = []
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    
    days.push({
      date: dateStr,
      day: date.getDate(),
      isToday: i === 0,
      checked: calendar.value.some((c: any) => c.checkInDate === dateStr || c.date === dateStr)
    })
  }
  
  return days
})

onMounted(async () => {
  await loadStatus()
})

async function loadStatus() {
  try {
    const data = await getCheckInStatus()
    checkedIn.value = data.hasCheckedInToday || false
    continuousDays.value = data.consecutiveDays || 0
    calendar.value = data.calendar || []
    nextMilestone.value = data.nextMilestone || null
  } catch (error) {
    console.error('加载签到状态失败', error)
  }
}

async function doCheckIn() {
  if (checkedIn.value) {
    showToast('今日已签到')
    return
  }
  
  try {
    isAnimating.value = true
    const result = await checkIn()
    checkedIn.value = true
    continuousDays.value = result.consecutiveDays
    
    // 显示获得的积分
    let message = `签到成功，获得${result.pointsEarned}积分`
    if (result.bonusPoints && result.bonusPoints > 0) {
      message += `，里程碑奖励${result.bonusPoints}积分！`
    }
    showToast(message, 'success')
    
    // 更新里程碑信息
    nextMilestone.value = result.milestone || null
    
    await loadStatus()
  } catch (error) {
    console.error('签到失败', error)
  } finally {
    setTimeout(() => {
      isAnimating.value = false
    }, 500)
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.checkin-page {
  min-height: 100vh;
  background-color: $bg-page;
  padding-bottom: $spacing-lg;
}

.checkin-header {
  @include flex(column, center, center);
  background: linear-gradient(135deg, $primary-color, $primary-light);
  padding: $spacing-lg;
  color: #fff;
  
  .continuous-days {
    font-size: $font-md;
    margin-bottom: $spacing-md;
  }
  
  .checkin-btn {
    @include flex(column, center, center);
    width: 200rpx;
    height: 200rpx;
    border-radius: 50%;
    background-color: rgba(255, 255, 255, 0.2);
    font-weight: bold;
    transition: transform 0.3s ease;
    
    .btn-text {
      font-size: $font-md;
    }
    
    .btn-points {
      font-size: $font-sm;
      margin-top: 8rpx;
      opacity: 0.9;
    }
    
    &.checked {
      background-color: rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.7);
    }
    
    &.animating {
      transform: scale(1.1);
    }
  }
  
  .milestone-info {
    margin-top: $spacing-md;
    font-size: $font-sm;
    opacity: 0.9;
  }
}

.milestone-section {
  margin: $spacing-base;
  
  .section-title {
    font-size: $font-md;
    font-weight: bold;
    margin-bottom: $spacing-base;
  }
  
  .milestone-list {
    @include flex(row, space-around, center);
    
    .milestone-item {
      @include flex(column, center, center);
      padding: $spacing-sm;
      
      .milestone-icon {
        font-size: 48rpx;
        margin-bottom: 8rpx;
      }
      
      .milestone-days {
        font-size: $font-sm;
        color: $text-secondary;
      }
      
      .milestone-points {
        font-size: $font-sm;
        color: $primary-color;
        font-weight: bold;
      }
      
      &.reached {
        .milestone-days,
        .milestone-points {
          color: $success-color;
        }
      }
    }
  }
}

.calendar-section {
  margin: $spacing-base;
  
  .section-title {
    font-size: $font-md;
    font-weight: bold;
    margin-bottom: $spacing-base;
  }
  
  .calendar-grid {
    @include flex(row, space-between, center);
    
    .calendar-day {
      @include flex(column, center, center);
      width: 80rpx;
      height: 80rpx;
      border-radius: 50%;
      background-color: $bg-gray;
      position: relative;
      
      .day-num {
        font-size: $font-base;
      }
      
      .check-icon {
        position: absolute;
        bottom: -4rpx;
        font-size: $font-xs;
        color: $success-color;
      }
      
      &.checked {
        background-color: rgba($primary-color, 0.1);
        color: $primary-color;
      }
      
      &.today {
        border: 2rpx solid $primary-color;
      }
    }
  }
}

.rules-section {
  margin: 0 $spacing-base;
  
  .section-title {
    font-size: $font-md;
    font-weight: bold;
    margin-bottom: $spacing-base;
  }
  
  .rules-content {
    text {
      display: block;
      font-size: $font-sm;
      color: $text-secondary;
      line-height: 2;
    }
  }
}
</style>
