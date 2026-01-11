import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface CartItem {
  id: string
  productId: string
  skuId: string
  productName: string
  productImage: string
  specValues: string[]
  price: number
  quantity: number
  selected: boolean
  stock: number
}

export const useCartStore = defineStore('cart', () => {
  // 状态
  const items = ref<CartItem[]>([])
  
  // 计算属性
  const totalCount = computed(() => {
    return items.value.reduce((sum, item) => sum + item.quantity, 0)
  })
  
  const selectedItems = computed(() => {
    return items.value.filter(item => item.selected)
  })
  
  const selectedCount = computed(() => {
    return selectedItems.value.reduce((sum, item) => sum + item.quantity, 0)
  })
  
  const totalPrice = computed(() => {
    return selectedItems.value.reduce((sum, item) => sum + item.price * item.quantity, 0)
  })
  
  const isAllSelected = computed(() => {
    return items.value.length > 0 && items.value.every(item => item.selected)
  })
  
  // 设置购物车数据
  function setItems(newItems: CartItem[]) {
    items.value = newItems
  }
  
  // 添加商品
  function addItem(item: CartItem) {
    const existingItem = items.value.find(
      i => i.productId === item.productId && i.skuId === item.skuId
    )
    if (existingItem) {
      existingItem.quantity += item.quantity
    } else {
      items.value.push(item)
    }
  }
  
  // 更新数量
  function updateQuantity(itemId: string, quantity: number) {
    const item = items.value.find(i => i.id === itemId)
    if (item) {
      item.quantity = quantity
    }
  }
  
  // 删除商品
  function removeItem(itemId: string) {
    const index = items.value.findIndex(i => i.id === itemId)
    if (index > -1) {
      items.value.splice(index, 1)
    }
  }
  
  // 切换选中状态
  function toggleSelect(itemId: string) {
    const item = items.value.find(i => i.id === itemId)
    if (item) {
      item.selected = !item.selected
    }
  }
  
  // 全选/取消全选
  function toggleSelectAll() {
    const newSelected = !isAllSelected.value
    items.value.forEach(item => {
      item.selected = newSelected
    })
  }
  
  // 清空购物车
  function clearCart() {
    items.value = []
  }
  
  // 清空已选商品
  function clearSelected() {
    items.value = items.value.filter(item => !item.selected)
  }
  
  return {
    items,
    totalCount,
    selectedItems,
    selectedCount,
    totalPrice,
    isAllSelected,
    setItems,
    addItem,
    updateQuantity,
    removeItem,
    toggleSelect,
    toggleSelectAll,
    clearCart,
    clearSelected
  }
})
