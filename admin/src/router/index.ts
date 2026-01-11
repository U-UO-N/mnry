import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/',
    component: () => import('@/layouts/AdminLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: '控制台', icon: 'Odometer' }
      },
      {
        path: 'products',
        name: 'Products',
        component: () => import('@/views/products/index.vue'),
        meta: { title: '商品管理', icon: 'Goods' }
      },
      {
        path: 'products/edit/:id?',
        name: 'ProductEdit',
        component: () => import('@/views/products/edit.vue'),
        meta: { title: '编辑商品', hidden: true }
      },
      {
        path: 'categories',
        name: 'Categories',
        component: () => import('@/views/categories/index.vue'),
        meta: { title: '分类管理', icon: 'Menu' }
      },
      {
        path: 'home-config',
        name: 'HomeConfig',
        component: () => import('@/views/home-config/index.vue'),
        meta: { title: '首页配置', icon: 'HomeFilled' }
      },
      {
        path: 'orders',
        name: 'Orders',
        component: () => import('@/views/orders/index.vue'),
        meta: { title: '订单管理', icon: 'Document' }
      },
      {
        path: 'orders/:id',
        name: 'OrderDetail',
        component: () => import('@/views/orders/detail.vue'),
        meta: { title: '订单详情', hidden: true }
      },
      {
        path: 'finance',
        name: 'Finance',
        component: () => import('@/views/finance/index.vue'),
        meta: { title: '资金管理', icon: 'Money' }
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('@/views/users/index.vue'),
        meta: { title: '用户管理', icon: 'User' }
      },
      {
        path: 'users/:id',
        name: 'UserDetail',
        component: () => import('@/views/users/detail.vue'),
        meta: { title: '用户详情', hidden: true }
      },
      {
        path: 'marketing',
        name: 'Marketing',
        component: () => import('@/views/marketing/index.vue'),
        meta: { title: '营销管理', icon: 'Present' }
      },
      {
        path: 'marketing/group-buy/edit/:id?',
        name: 'GroupBuyEdit',
        component: () => import('@/views/marketing/group-buy-edit.vue'),
        meta: { title: '编辑拼团活动', hidden: true }
      },
      {
        path: 'materials',
        name: 'Materials',
        component: () => import('@/views/materials/index.vue'),
        meta: { title: '素材中心', icon: 'Picture' }
      },
      {
        path: 'shipping',
        name: 'Shipping',
        component: () => import('@/views/shipping/index.vue'),
        meta: { title: '运费管理', icon: 'Van' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
