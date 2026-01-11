<template>
  <view class="home-page">
    <!-- 顶部搜索栏 -->
    <view class="header">
      <view class="search-bar" @click="goToSearch">
        <view class="search-input">
          <text class="search-icon">🔍</text>
          <text class="search-placeholder">搜索商品</text>
        </view>
      </view>
    </view>

    <scroll-view class="main-content" scroll-y>
      <!-- 轮播图 -->
      <view class="banner-section">
        <swiper 
          v-if="banners.length > 0"
          class="banner-swiper" 
          :indicator-dots="true" 
          indicator-color="rgba(255,255,255,0.5)"
          indicator-active-color="#fff"
          :autoplay="true" 
          :interval="4000"
          :circular="true"
        >
          <swiper-item v-for="banner in banners" :key="banner.id" @click="onBannerClick(banner)">
            <image class="banner-image" :src="getImageUrl(banner.image)" mode="aspectFill" />
          </swiper-item>
        </swiper>
        <!-- 轮播图占位 -->
        <view v-else class="banner-placeholder">
          <text class="placeholder-text">暂无轮播图</text>
        </view>
      </view>

      <!-- 分类快捷入口 -->
      <view class="category-section" v-if="categoryShortcuts.length > 0">
        <view class="category-grid">
          <view 
            v-for="shortcut in categoryShortcuts" 
            :key="shortcut.id" 
            class="category-item"
            @click="goToCategory(shortcut.categoryId)"
          >
            <view class="category-icon-wrap">
              <image class="category-icon" :src="getImageUrl(shortcut.icon)" mode="aspectFit" />
            </view>
            <text class="category-name">{{ shortcut.name }}</text>
          </view>
        </view>
      </view>

      <!-- 拼团活动 -->
      <view class="groupbuy-section" v-if="groupBuyActivities.length > 0">
        <view class="section-header">
          <view class="section-title-wrap">
            <text class="section-title">🔥 限时拼团</text>
            <text class="section-subtitle">多人成团 超值优惠</text>
          </view>
          <view class="more-btn" @click="goToGroupBuyList">
            <text>更多</text>
            <text class="arrow">›</text>
          </view>
        </view>
        
        <scroll-view class="groupbuy-scroll" scroll-x>
          <view class="groupbuy-list">
            <view 
              v-for="activity in groupBuyActivities" 
              :key="activity.id" 
              class="groupbuy-card"
              @click="goToGroupBuy(activity.id)"
            >
              <view class="groupbuy-image-wrap">
                <image class="groupbuy-image" :src="getImageUrl(activity.productImage)" mode="aspectFill" />
                <view class="groupbuy-tag">{{ activity.requiredCount }}人团</view>
              </view>
              <view class="groupbuy-info">
                <text class="groupbuy-name">{{ activity.productName }}</text>
                <view class="groupbuy-price-row">
                  <view class="group-price">
                    <text class="price-label">拼团价</text>
                    <text class="price-symbol">¥</text>
                    <text class="price-value">{{ formatPrice(activity.groupPrice) }}</text>
                  </view>
                  <text class="original-price">¥{{ formatPrice(activity.originalPrice) }}</text>
                </view>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 热门商品 -->
      <view class="hot-section" v-if="hotProducts.length > 0">
        <view class="section-header">
          <view class="section-title-wrap">
            <text class="section-title">🛒 热门推荐</text>
            <text class="section-subtitle">精选好物 品质保证</text>
          </view>
          <view class="more-btn" @click="goToAllProducts">
            <text>更多</text>
            <text class="arrow">›</text>
          </view>
        </view>
        
        <view class="product-grid">
          <view 
            v-for="product in hotProducts" 
            :key="product.id" 
            class="product-card"
            @click="goToProduct(product.id)"
          >
            <view class="product-image-wrap">
              <image class="product-image" :src="getImageUrl(product.mainImage)" mode="aspectFill" />
              <view v-if="product.originalPrice" class="discount-tag">
                {{ Math.round((1 - product.price / product.originalPrice) * 100) }}%OFF
              </view>
            </view>
            <view class="product-info">
              <text class="product-name">{{ product.name }}</text>
              <view class="product-meta">
                <view class="product-price-row">
                  <text class="price-symbol">¥</text>
                  <text class="price-value">{{ formatPrice(product.price) }}</text>
                </view>
                <text class="product-sales">已售{{ product.sales || 0 }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getBanners, getHotProducts, getCategoryShortcuts, getGroupBuyActivities } from '@/api/home'
import type { Banner, CategoryShortcut, GroupBuyActivity } from '@/api/home'
import type { Product } from '@/api/product'
import { formatPrice, navigateTo, getImageUrl } from '@/utils'

const banners = ref<Banner[]>([])
const hotProducts = ref<Product[]>([])
const categoryShortcuts = ref<CategoryShortcut[]>([])
const groupBuyActivities = ref<GroupBuyActivity[]>([])

onMounted(() => {
  loadData()
})

async function loadData() {
  try {
    const [bannersData, productsData, shortcutsData, groupBuyData] = await Promise.all([
      getBanners(),
      getHotProducts(),
      getCategoryShortcuts(),
      getGroupBuyActivities(4)
    ])
    banners.value = bannersData
    hotProducts.value = productsData
    categoryShortcuts.value = shortcutsData
    groupBuyActivities.value = groupBuyData || []
  } catch (error) {
    console.error('加载首页数据失败', error)
  }
}

function goToSearch() {
  navigateTo('/pages/search/index')
}

function onBannerClick(banner: Banner) {
  if (banner.linkType === 'product') {
    navigateTo(`/pages/product/detail?id=${banner.linkValue}`)
  } else if (banner.linkType === 'category') {
    navigateTo(`/pages/product/list?categoryId=${banner.linkValue}`)
  }
}

function goToCategory(categoryId: string) {
  navigateTo(`/pages/product/list?categoryId=${categoryId}`)
}

function goToProduct(productId: string) {
  navigateTo(`/pages/product/detail?id=${productId}`)
}

function goToAllProducts() {
  navigateTo('/pages/category/index')
}

function goToGroupBuy(activityId: string) {
  navigateTo(`/pages/groupbuy/detail?id=${activityId}`)
}

function goToGroupBuyList() {
  navigateTo('/pages/groupbuy/index')
}
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';
@import '@/styles/mixins.scss';

.home-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8f8f8 0%, #ffffff 100%);
}

.header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: linear-gradient(180deg, $primary-color 0%, $primary-light 100%);
  padding: $spacing-sm $spacing-base;
  padding-top: calc(var(--status-bar-height, 20px) + #{$spacing-sm});
}

.search-bar {
  .search-input {
    @include flex(row, flex-start, center);
    height: 64rpx;
    background-color: rgba(255, 255, 255, 0.9);
    border-radius: $radius-round;
    padding: 0 $spacing-base;
    
    .search-icon {
      margin-right: $spacing-sm;
      font-size: 26rpx;
    }
    
    .search-placeholder {
      color: $text-placeholder;
      font-size: $font-sm;
    }
  }
}

.main-content {
  height: calc(100vh - 100rpx - var(--status-bar-height, 20px));
}

.banner-section {
  padding: $spacing-base;
  
  .banner-swiper {
    height: 400rpx;
    border-radius: $radius-lg;
    overflow: hidden;
    
    .banner-image {
      width: 100%;
      height: 100%;
    }
  }
  
  .banner-placeholder {
    height: 400rpx;
    border-radius: $radius-lg;
    background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
    @include flex-center;
    
    .placeholder-text {
      color: $text-placeholder;
      font-size: $font-base;
    }
  }
}

.category-section {
  background-color: $bg-white;
  margin: 0 $spacing-base $spacing-base;
  border-radius: $radius-lg;
  padding: $spacing-md $spacing-sm;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
  
  .category-grid {
    @include flex(row, space-around, flex-start);
    flex-wrap: wrap;
  }
  
  .category-item {
    @include flex(column, center, center);
    width: 20%;
    margin-bottom: $spacing-sm;
    
    .category-icon-wrap {
      width: 96rpx;
      height: 96rpx;
      border-radius: 50%;
      background: linear-gradient(135deg, #fff5f5 0%, #fff0f0 100%);
      @include flex-center;
      margin-bottom: $spacing-xs;
    }
    
    .category-icon {
      width: 56rpx;
      height: 56rpx;
    }
    
    .category-name {
      font-size: $font-sm;
      color: $text-primary;
    }
  }
}

// 拼团活动区域
.groupbuy-section {
  background-color: $bg-white;
  margin: 0 $spacing-base $spacing-base;
  border-radius: $radius-lg;
  padding: $spacing-md;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
  
  .groupbuy-scroll {
    white-space: nowrap;
    margin: 0 -#{$spacing-md};
    padding: 0 $spacing-md;
  }
  
  .groupbuy-list {
    display: inline-flex;
    gap: $spacing-base;
  }
  
  .groupbuy-card {
    display: inline-block;
    width: 280rpx;
    background-color: #fff;
    border-radius: $radius-md;
    overflow: hidden;
    box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.08);
    
    .groupbuy-image-wrap {
      position: relative;
      
      .groupbuy-image {
        width: 280rpx;
        height: 200rpx;
      }
      
      .groupbuy-tag {
        position: absolute;
        top: $spacing-sm;
        left: 0;
        background: linear-gradient(90deg, #ff4d4f, #ff7875);
        color: #fff;
        font-size: 20rpx;
        padding: 4rpx 16rpx;
        border-radius: 0 20rpx 20rpx 0;
      }
    }
    
    .groupbuy-info {
      padding: $spacing-sm;
      
      .groupbuy-name {
        display: block;
        font-size: $font-sm;
        color: $text-primary;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-bottom: $spacing-xs;
      }
      
      .groupbuy-price-row {
        @include flex(row, space-between, flex-end);
        
        .group-price {
          @include flex(row, flex-start, baseline);
          
          .price-label {
            font-size: 20rpx;
            color: #ff4d4f;
            margin-right: 4rpx;
          }
          
          .price-symbol {
            font-size: 20rpx;
            color: #ff4d4f;
            font-weight: bold;
          }
          
          .price-value {
            font-size: $font-md;
            color: #ff4d4f;
            font-weight: bold;
          }
        }
        
        .original-price {
          font-size: $font-xs;
          color: $text-placeholder;
          text-decoration: line-through;
        }
      }
    }
  }
}

.hot-section {
  background-color: $bg-white;
  margin: 0 $spacing-base $spacing-base;
  border-radius: $radius-lg;
  padding: $spacing-md;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
}

.section-header {
  @include flex-between;
  margin-bottom: $spacing-md;
  
  .section-title-wrap {
    @include flex(column);
    
    .section-title {
      font-size: $font-md;
      font-weight: bold;
      color: $text-primary;
    }
    
    .section-subtitle {
      font-size: $font-xs;
      color: $text-placeholder;
      margin-top: 4rpx;
    }
  }
  
  .more-btn {
    @include flex(row, center, center);
    font-size: $font-sm;
    color: $text-secondary;
    
    .arrow {
      margin-left: 4rpx;
      font-size: $font-md;
    }
  }
}

.product-grid {
  display: flex;
  flex-wrap: wrap;
  margin: 0 -#{$spacing-xs};
  
  .product-card {
    width: calc(50% - #{$spacing-sm});
    margin: 0 $spacing-xs $spacing-base;
    background-color: $bg-white;
    border-radius: $radius-md;
    overflow: hidden;
    box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
    
    .product-image-wrap {
      position: relative;
      
      .product-image {
        width: 100%;
        height: 320rpx;
      }
      
      .discount-tag {
        position: absolute;
        top: $spacing-sm;
        left: 0;
        background: linear-gradient(90deg, #ff6b6b, #ff8e8e);
        color: #fff;
        font-size: 20rpx;
        padding: 4rpx 12rpx;
        border-radius: 0 20rpx 20rpx 0;
      }
    }
    
    .product-info {
      padding: $spacing-sm;
      
      .product-name {
        @include ellipsis(2);
        font-size: $font-base;
        color: $text-primary;
        line-height: 1.4;
        height: 76rpx;
      }
      
      .product-meta {
        @include flex-between;
        margin-top: $spacing-xs;
        
        .product-price-row {
          @include flex(row, flex-start, baseline);
          
          .price-symbol {
            color: $primary-color;
            font-size: $font-xs;
            font-weight: bold;
          }
          
          .price-value {
            color: $primary-color;
            font-size: $font-lg;
            font-weight: bold;
          }
        }
        
        .product-sales {
          font-size: $font-xs;
          color: $text-placeholder;
        }
      }
    }
  }
}
</style>
