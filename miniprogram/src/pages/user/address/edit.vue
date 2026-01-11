<template>
  <view class="address-edit-page">
    <view class="form-section">
      <!-- 收货人 -->
      <view class="form-item">
        <text class="label">收货人</text>
        <input 
          class="input" 
          :value="form.name"
          @input="form.name = $event.detail.value"
          placeholder="请输入收货人姓名"
          maxlength="20"
        />
      </view>
      
      <!-- 手机号 -->
      <view class="form-item">
        <text class="label">手机号</text>
        <input 
          class="input" 
          :value="form.phone"
          @input="form.phone = $event.detail.value"
          type="number"
          placeholder="请输入手机号"
          maxlength="11"
        />
      </view>
      
      <!-- 所在地区 -->
      <picker mode="region" :value="regionValue" @change="onRegionChange">
        <view class="form-item picker-item">
          <text class="label">所在地区</text>
          <view class="picker-value">
            <text v-if="form.province">{{ form.province }} {{ form.city }} {{ form.district }}</text>
            <text v-else class="placeholder">请选择省/市/区</text>
            <text class="arrow">›</text>
          </view>
        </view>
      </picker>
      
      <!-- 详细地址 -->
      <view class="form-item">
        <text class="label">详细地址</text>
        <input 
          class="input" 
          :value="form.detail"
          @input="form.detail = $event.detail.value"
          placeholder="街道、门牌号等"
          maxlength="100"
        />
      </view>
      
      <!-- 设为默认 -->
      <view class="form-item switch-item">
        <text class="label">设为默认地址</text>
        <switch 
          :checked="form.isDefault" 
          @change="form.isDefault = $event.detail.value"
          color="#ff6b35"
        />
      </view>
    </view>

    <!-- 保存按钮 -->
    <view class="save-btn-wrapper safe-bottom">
      <view class="save-btn" @click="saveAddress">
        保存
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getAddress, createAddress, updateAddress, getDeliveryAreas, type AddressDTO } from '@/api/address'
import { navigateBack, showToast } from '@/utils'

const addressId = ref<string>('')
const isEdit = ref(false)
const enabledProvinces = ref<string[]>([])

const form = reactive<AddressDTO & { isDefault: boolean }>({
  name: '',
  phone: '',
  province: '',
  city: '',
  district: '',
  detail: '',
  isDefault: false
})

const regionValue = ref<string[]>([])

onLoad(async (options) => {
  if (options?.id) {
    addressId.value = options.id
    isEdit.value = true
    await loadAddress()
  }
  await loadDeliveryAreas()
})

async function loadAddress() {
  try {
    const address = await getAddress(addressId.value)
    form.name = address.name
    form.phone = address.phone
    form.province = address.province
    form.city = address.city
    form.district = address.district
    form.detail = address.detail
    form.isDefault = address.isDefault
    regionValue.value = [address.province, address.city, address.district]
  } catch (error) {
    console.error('加载地址失败', error)
    showToast('加载失败')
  }
}

async function loadDeliveryAreas() {
  try {
    const result = await getDeliveryAreas()
    enabledProvinces.value = result.provinces || []
  } catch (error) {
    console.error('加载配送区域失败', error)
  }
}

function onRegionChange(e: any) {
  const [province, city, district] = e.detail.value
  
  console.log('选择地区:', province, city, district)
  console.log('已启用省份:', enabledProvinces.value)
  
  // 如果配置了配送区域限制，检查省份是否可配送
  // 如果没有配置任何省份，则允许所有省份
  if (enabledProvinces.value.length > 0) {
    // 检查省份是否在启用列表中（支持模糊匹配，如"北京"匹配"北京市"）
    const isProvinceEnabled = enabledProvinces.value.some(p => 
      p.includes(province) || province.includes(p.replace(/省|市|自治区|特别行政区|壮族|回族|维吾尔/g, ''))
    )
    
    if (!isProvinceEnabled) {
      showToast('该地区暂不支持配送')
      return
    }
  }
  
  form.province = province
  form.city = city
  form.district = district
  regionValue.value = [province, city, district]
}

async function saveAddress() {
  // 验证表单
  if (!form.name.trim()) {
    showToast('请输入收货人姓名')
    return
  }
  if (!form.phone.trim() || !/^1\d{10}$/.test(form.phone)) {
    showToast('请输入正确的手机号')
    return
  }
  if (!form.province || !form.city || !form.district) {
    showToast('请选择所在地区')
    return
  }
  if (!form.detail.trim()) {
    showToast('请输入详细地址')
    return
  }

  try {
    const data: AddressDTO = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      province: form.province,
      city: form.city,
      district: form.district,
      detail: form.detail.trim(),
      isDefault: form.isDefault
    }

    if (isEdit.value) {
      await updateAddress(addressId.value, data)
      showToast('修改成功', 'success')
    } else {
      await createAddress(data)
      showToast('添加成功', 'success')
    }
    
    navigateBack()
  } catch (error: any) {
    console.error('保存失败', error)
    showToast(error.message || '保存失败')
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.address-edit-page {
  min-height: 100vh;
  background-color: $bg-page;
  padding-bottom: 140rpx;
}

.form-section {
  background-color: $bg-white;
  margin: $spacing-base;
  border-radius: $radius-md;
  padding: 0 $spacing-base;
}

.form-item {
  @include flex(row, flex-start, center);
  padding: $spacing-base 0;
  border-bottom: 1rpx solid $border-color;
  
  &:last-child {
    border-bottom: none;
  }
  
  .label {
    width: 160rpx;
    font-size: $font-base;
    color: $text-primary;
    flex-shrink: 0;
  }
  
  .input {
    flex: 1;
    font-size: $font-base;
    color: $text-primary;
  }
  
  .picker-value {
    flex: 1;
    @include flex(row, space-between, center);
    
    .placeholder {
      color: $text-placeholder;
    }
    
    .arrow {
      color: $text-placeholder;
      font-size: $font-lg;
    }
  }
  
  &.switch-item {
    @include flex-between;
  }
  
  &.picker-item {
    cursor: pointer;
  }
}

.save-btn-wrapper {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: $spacing-base;
  background-color: $bg-white;
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
  
  .save-btn {
    @include flex-center;
    height: 88rpx;
    background: linear-gradient(135deg, $primary-color, $primary-light);
    color: #fff;
    border-radius: $radius-md;
    font-size: $font-base;
  }
}
</style>
