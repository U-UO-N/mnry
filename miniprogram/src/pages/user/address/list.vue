<template>
  <view class="address-list-page">
    <!-- 地址列表 -->
    <view v-if="addresses.length > 0" class="address-list">
      <view 
        v-for="item in addresses" 
        :key="item.id" 
        class="address-item"
        @click="selectAddress(item)"
      >
        <view class="address-info">
          <view class="address-header">
            <text class="name">{{ item.name }}</text>
            <text class="phone">{{ item.phone }}</text>
            <text v-if="item.isDefault" class="default-tag">默认</text>
          </view>
          <view class="address-detail">
            {{ item.province }} {{ item.city }} {{ item.district }} {{ item.detail }}
          </view>
        </view>
        <view class="address-actions">
          <view class="action-btn" @click.stop="editAddress(item)">
            <text>编辑</text>
          </view>
          <view class="action-btn" @click.stop="deleteAddressItem(item)">
            <text>删除</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-else class="empty">
      <text class="empty-icon">📍</text>
      <text class="empty-text">暂无收货地址</text>
    </view>

    <!-- 添加地址按钮 -->
    <view class="add-btn-wrapper safe-bottom">
      <view class="add-btn" @click="addAddress">
        + 新增收货地址
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getAddresses, deleteAddress, type Address } from '@/api/address'
import { navigateTo, navigateBack, showConfirm, showToast } from '@/utils'

// 是否是选择模式（从订单确认页进入）
const isSelectMode = ref(false)

const addresses = ref<Address[]>([])

onLoad((options) => {
  // 从URL参数获取select模式
  if (options?.select === '1') {
    isSelectMode.value = true
  }
})

onShow(async () => {
  await loadAddresses()
})

async function loadAddresses() {
  try {
    const list = await getAddresses()
    addresses.value = list
  } catch (error) {
    console.error('加载地址失败', error)
  }
}

function addAddress() {
  navigateTo('/pages/user/address/edit')
}

function editAddress(item: Address) {
  navigateTo(`/pages/user/address/edit?id=${item.id}`)
}

async function deleteAddressItem(item: Address) {
  const confirmed = await showConfirm('确定要删除该地址吗？')
  if (confirmed) {
    try {
      await deleteAddress(item.id)
      showToast('删除成功', 'success')
      await loadAddresses()
    } catch (error) {
      console.error('删除失败', error)
    }
  }
}

function selectAddress(item: Address) {
  // 如果是选择模式，返回选中的地址
  if (isSelectMode.value) {
    // 存储选中的地址到全局
    uni.setStorageSync('selectedAddress', item)
    navigateBack()
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.address-list-page {
  min-height: 100vh;
  background-color: $bg-page;
  padding-bottom: 140rpx;
}

.address-list {
  padding: $spacing-base;
}

.address-item {
  background-color: $bg-white;
  border-radius: $radius-md;
  padding: $spacing-base;
  margin-bottom: $spacing-base;
  
  .address-info {
    .address-header {
      @include flex(row, flex-start, center);
      margin-bottom: $spacing-sm;
      
      .name {
        font-size: $font-md;
        font-weight: bold;
        margin-right: $spacing-base;
      }
      
      .phone {
        font-size: $font-base;
        color: $text-secondary;
      }
      
      .default-tag {
        margin-left: $spacing-sm;
        padding: 4rpx 12rpx;
        background-color: $primary-color;
        color: #fff;
        font-size: $font-xs;
        border-radius: $radius-sm;
      }
    }
    
    .address-detail {
      font-size: $font-base;
      color: $text-secondary;
      line-height: 1.5;
    }
  }
  
  .address-actions {
    @include flex(row, flex-end, center);
    margin-top: $spacing-base;
    padding-top: $spacing-base;
    border-top: 1rpx solid $border-color;
    
    .action-btn {
      padding: $spacing-xs $spacing-base;
      font-size: $font-sm;
      color: $text-secondary;
      
      &:last-child {
        color: #ff4d4f;
      }
    }
  }
}

.empty {
  @include flex(column, center, center);
  padding-top: 200rpx;
  
  .empty-icon {
    font-size: 120rpx;
    margin-bottom: $spacing-md;
  }
  
  .empty-text {
    color: $text-placeholder;
    font-size: $font-base;
  }
}

.add-btn-wrapper {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: $spacing-base;
  background-color: $bg-white;
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
  
  .add-btn {
    @include flex-center;
    height: 88rpx;
    background: linear-gradient(135deg, $primary-color, $primary-light);
    color: #fff;
    border-radius: $radius-md;
    font-size: $font-base;
  }
}
</style>
