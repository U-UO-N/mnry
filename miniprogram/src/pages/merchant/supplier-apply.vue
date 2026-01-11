<template>
  <view class="apply-page">
    <view class="form-section card">
      <view class="form-item">
        <text class="label required">公司名称</text>
        <input class="input" v-model="form.companyName" placeholder="请输入公司名称" />
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
        <text class="label required">营业执照</text>
        <view class="upload-area" @click="uploadLicense">
          <image v-if="form.businessLicense" :src="form.businessLicense" mode="aspectFit" />
          <text v-else class="upload-text">+ 上传营业执照</text>
        </view>
      </view>
      <view class="form-item">
        <text class="label required">主营品类</text>
        <view class="category-tags">
          <view 
            v-for="cat in categories" 
            :key="cat"
            :class="['category-tag', { active: form.productCategories.includes(cat) }]"
            @click="toggleCategory(cat)"
          >
            {{ cat }}
          </view>
        </view>
      </view>
    </view>

    <view class="tips card">
      <text class="tips-title">申请说明</text>
      <text class="tips-content">1. 请如实填写公司信息</text>
      <text class="tips-content">2. 营业执照需清晰可辨</text>
      <text class="tips-content">3. 审核时间为3-5个工作日</text>
    </view>

    <view class="submit-btn" @click="submitApply">提交申请</view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { applySupplier } from '@/api/merchant'
import { isValidPhone, navigateBack, showToast } from '@/utils'

const categories = ['食品', '饮品', '日用品', '美妆', '服饰', '数码', '家居', '其他']

const form = ref({
  companyName: '',
  contactName: '',
  contactPhone: '',
  businessLicense: '',
  productCategories: [] as string[]
})

function toggleCategory(cat: string) {
  const index = form.value.productCategories.indexOf(cat)
  if (index > -1) {
    form.value.productCategories.splice(index, 1)
  } else {
    form.value.productCategories.push(cat)
  }
}

function uploadLicense() {
  uni.chooseImage({
    count: 1,
    success: (res) => {
      form.value.businessLicense = res.tempFilePaths[0]
    }
  })
}

async function submitApply() {
  if (!form.value.companyName) {
    showToast('请输入公司名称')
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
  if (!form.value.businessLicense) {
    showToast('请上传营业执照')
    return
  }
  if (form.value.productCategories.length === 0) {
    showToast('请选择主营品类')
    return
  }
  
  try {
    await applySupplier(form.value)
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
    
    .category-tags {
      @include flex(row, flex-start, center);
      flex-wrap: wrap;
      
      .category-tag {
        padding: $spacing-sm $spacing-base;
        background-color: $bg-gray;
        border-radius: $radius-round;
        font-size: $font-sm;
        margin-right: $spacing-sm;
        margin-bottom: $spacing-sm;
        
        &.active {
          background-color: rgba($primary-color, 0.1);
          color: $primary-color;
        }
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
