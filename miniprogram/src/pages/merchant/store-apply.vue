<template>
  <view class="apply-page">
    <view class="form-section card">
      <view class="form-item">
        <text class="label required">门店名称</text>
        <input class="input" v-model="form.storeName" placeholder="请输入门店名称" />
      </view>
      <view class="form-item">
        <text class="label required">联系人</text>
        <input class="input" v-model="form.contactName" placeholder="请输入联系人姓名" />
      </view>
      <view class="form-item">
        <text class="label required">联系电话</text>
        <input class="input" type="number" v-model="form.contactPhone" placeholder="请输入联系电话" />
      </view>
      <view class="form-item">
        <text class="label required">门店地址</text>
        <input class="input" v-model="form.address" placeholder="请输入门店详细地址" />
      </view>
      <view class="form-item">
        <text class="label">营业执照</text>
        <view class="upload-area" @click="uploadLicense">
          <image v-if="form.businessLicense" :src="form.businessLicense" mode="aspectFit" />
          <text v-else class="upload-text">+ 上传营业执照</text>
        </view>
      </view>
    </view>

    <view class="tips card">
      <text class="tips-title">申请说明</text>
      <text class="tips-content">1. 请如实填写门店信息</text>
      <text class="tips-content">2. 审核时间为1-3个工作日</text>
      <text class="tips-content">3. 审核结果将通过消息通知</text>
    </view>

    <view class="submit-btn" @click="submitApply">提交申请</view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { applyStore } from '@/api/merchant'
import { isValidPhone, navigateBack, showToast } from '@/utils'

const form = ref({
  storeName: '',
  contactName: '',
  contactPhone: '',
  address: '',
  businessLicense: ''
})

function uploadLicense() {
  uni.chooseImage({
    count: 1,
    success: (res) => {
      // 这里应该上传图片到服务器，获取URL
      form.value.businessLicense = res.tempFilePaths[0]
    }
  })
}

async function submitApply() {
  if (!form.value.storeName) {
    showToast('请输入门店名称')
    return
  }
  if (!form.value.contactName) {
    showToast('请输入联系人')
    return
  }
  if (!form.value.contactPhone || !isValidPhone(form.value.contactPhone)) {
    showToast('请输入正确的联系电话')
    return
  }
  if (!form.value.address) {
    showToast('请输入门店地址')
    return
  }
  
  try {
    await applyStore(form.value)
    showToast('申请已提交', 'success')
    navigateBack()
  } catch (error) {
    console.error('提交申请失败', error)
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.apply-page {
  min-height: 100vh;
  background-color: $bg-page;
  padding: $spacing-base;
}

.form-section {
  .form-item {
    padding: $spacing-base 0;
    @include border-1px($border-color, bottom);
    
    &:last-child::after {
      display: none;
    }
    
    .label {
      font-size: $font-base;
      color: $text-primary;
      display: block;
      margin-bottom: $spacing-sm;
      
      &.required::before {
        content: '*';
        color: $error-color;
        margin-right: 4rpx;
      }
    }
    
    .input {
      width: 100%;
      font-size: $font-base;
      padding: $spacing-sm 0;
    }
    
    .upload-area {
      @include flex-center;
      width: 200rpx;
      height: 200rpx;
      background-color: $bg-gray;
      border-radius: $radius-md;
      
      image {
        width: 100%;
        height: 100%;
        border-radius: $radius-md;
      }
      
      .upload-text {
        font-size: $font-sm;
        color: $text-placeholder;
      }
    }
  }
}

.tips {
  .tips-title {
    font-size: $font-md;
    font-weight: bold;
    display: block;
    margin-bottom: $spacing-sm;
  }
  
  .tips-content {
    display: block;
    font-size: $font-sm;
    color: $text-secondary;
    line-height: 1.8;
  }
}

.submit-btn {
  @include flex-center;
  height: 88rpx;
  background: linear-gradient(135deg, $primary-color, $primary-light);
  color: #fff;
  border-radius: $radius-round;
  font-size: $font-md;
  margin-top: $spacing-lg;
}
</style>
