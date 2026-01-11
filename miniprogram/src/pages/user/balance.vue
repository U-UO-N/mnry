<template>
  <view class="balance-page">
    <view class="balance-card">
      <text class="label">账户余额</text>
      <text class="amount">¥{{ formatPrice(balance) }}</text>
      <view class="recharge-btn" @click="showRechargeModal = true">充值</view>
    </view>

    <view class="section-title">余额明细</view>
    <view class="record-list">
      <view v-for="record in records" :key="record.id" class="record-item">
        <view class="record-info">
          <text class="record-title">{{ record.description }}</text>
          <text class="record-time">{{ formatDate(record.createdAt) }}</text>
        </view>
        <text :class="['record-amount', record.amount > 0 ? 'income' : 'expense']">
          {{ record.amount > 0 ? '+' : '' }}{{ formatPrice(record.amount) }}
        </text>
      </view>
      <view v-if="records.length === 0" class="empty">暂无记录</view>
    </view>

    <!-- 充值弹窗 -->
    <view v-if="showRechargeModal" class="modal-mask" @click="showRechargeModal = false">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">充值余额</text>
          <text class="modal-close" @click="showRechargeModal = false">×</text>
        </view>
        <view class="modal-body">
          <view class="quick-amounts">
            <view 
              v-for="val in quickAmounts" 
              :key="val"
              :class="['quick-item', { active: rechargeAmount === val }]"
              @click="rechargeAmount = val"
            >
              ¥{{ val }}
            </view>
          </view>
          <view class="custom-amount">
            <text class="label">自定义金额</text>
            <input 
              class="input" 
              type="digit" 
              v-model="customAmount" 
              placeholder="请输入金额"
              @input="rechargeAmount = 0"
            />
          </view>
        </view>
        <view class="modal-footer">
          <view class="confirm-btn" @click="handleRecharge">确认充值</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getBalance, getBalanceRecords, rechargeBalance } from '@/api/user'
import { formatPrice, formatDate, showToast } from '@/utils'

const balance = ref(0)
const records = ref<any[]>([])
const showRechargeModal = ref(false)
const rechargeAmount = ref(0)
const customAmount = ref('')
const quickAmounts = [10, 50, 100, 200]

onMounted(async () => {
  await loadData()
})

async function loadData() {
  try {
    const data = await getBalance()
    balance.value = data.balance
    const recordsData = await getBalanceRecords()
    // 兼容 items 和 list 字段
    records.value = recordsData.list || (recordsData as any).items || []
  } catch (error) {
    console.error('加载余额信息失败', error)
  }
}

async function handleRecharge() {
  const amount = rechargeAmount.value || parseFloat(customAmount.value)
  if (!amount || amount <= 0) {
    showToast('请选择或输入充值金额')
    return
  }

  try {
    // 直接传元，后端会处理
    const result = await rechargeBalance(amount)
    balance.value = result.balance
    showRechargeModal.value = false
    rechargeAmount.value = 0
    customAmount.value = ''
    showToast('充值成功', 'success')
    // 重新加载记录
    await loadData()
  } catch (error) {
    console.error('充值失败', error)
    showToast('充值失败')
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.balance-page {
  min-height: 100vh;
  background-color: $bg-page;
}

.balance-card {
  @include flex(column, center, center);
  background: linear-gradient(135deg, $primary-color, $primary-light);
  padding: $spacing-lg;
  color: #fff;
  position: relative;
  
  .label {
    font-size: $font-sm;
    opacity: 0.9;
    margin-bottom: $spacing-sm;
  }
  
  .amount {
    font-size: 64rpx;
    font-weight: bold;
    margin-bottom: $spacing-base;
  }
  
  .recharge-btn {
    background-color: rgba(255, 255, 255, 0.2);
    padding: $spacing-sm $spacing-lg;
    border-radius: $radius-round;
    font-size: $font-sm;
    border: 1px solid rgba(255, 255, 255, 0.5);
  }
}

.section-title {
  padding: $spacing-base;
  font-size: $font-md;
  font-weight: bold;
}

.record-list {
  background-color: $bg-white;
  
  .record-item {
    @include flex-between;
    padding: $spacing-base;
    @include border-1px($border-color, bottom);
    
    .record-info {
      .record-title {
        font-size: $font-base;
        display: block;
        margin-bottom: $spacing-xs;
      }
      
      .record-time {
        font-size: $font-sm;
        color: $text-placeholder;
      }
    }
    
    .record-amount {
      font-size: $font-md;
      font-weight: bold;
      
      &.income {
        color: $success-color;
      }
      
      &.expense {
        color: $text-primary;
      }
    }
  }
  
  .empty {
    @include flex-center;
    padding: $spacing-lg;
    color: $text-placeholder;
  }
}

.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  @include flex-center;
  z-index: 1000;
}

.modal-content {
  width: 80%;
  background-color: $bg-white;
  border-radius: $radius-lg;
  overflow: hidden;
}

.modal-header {
  @include flex-between;
  padding: $spacing-base;
  @include border-1px($border-color, bottom);
  
  .modal-title {
    font-size: $font-md;
    font-weight: bold;
  }
  
  .modal-close {
    font-size: 48rpx;
    color: $text-placeholder;
    line-height: 1;
  }
}

.modal-body {
  padding: $spacing-base;
  
  .quick-amounts {
    @include flex(row, space-between, center);
    flex-wrap: wrap;
    margin-bottom: $spacing-base;
    
    .quick-item {
      width: 48%;
      padding: $spacing-base;
      background-color: $bg-gray;
      border-radius: $radius-md;
      text-align: center;
      margin-bottom: $spacing-sm;
      font-size: $font-md;
      
      &.active {
        background-color: rgba($primary-color, 0.1);
        color: $primary-color;
        border: 1px solid $primary-color;
      }
    }
  }
  
  .custom-amount {
    .label {
      font-size: $font-sm;
      color: $text-secondary;
      margin-bottom: $spacing-xs;
      display: block;
    }
    
    .input {
      width: 100%;
      padding: $spacing-base;
      background-color: $bg-gray;
      border-radius: $radius-md;
      font-size: $font-md;
    }
  }
}

.modal-footer {
  padding: $spacing-base;
  
  .confirm-btn {
    @include flex-center;
    height: 88rpx;
    background: linear-gradient(135deg, $primary-color, $primary-light);
    color: #fff;
    border-radius: $radius-round;
    font-size: $font-md;
  }
}
</style>
