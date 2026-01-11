# 需求文档

## 简介

本项目是一个综合性电商平台，包含微信小程序（C端消费者+B端商家）和网站管理后台。小程序提供完整的购物体验、订单管理、拼团营销、会员权益等功能；管理后台提供商品管理、资金管理、内容管理等运营能力。

## 术语表

- **Mini_Program**: 微信小程序客户端，面向消费者和合作方
- **Admin_Panel**: 网站管理后台，面向运营人员
- **User**: 普通消费者用户
- **Merchant**: 门店/供应商等B端合作方
- **Product**: 商品实体，包含SKU、价格、库存等信息
- **Order**: 订单实体，包含商品、支付、物流等信息
- **Group_Buy**: 拼团活动，多人参与享受优惠价格
- **Cart**: 购物车，临时存储待购买商品
- **Coupon**: 优惠券，用于订单抵扣
- **Points**: 积分，通过消费/签到获取，可兑换商品

---

## 需求

### 需求 1：首页浏览

**用户故事：** 作为消费者，我希望在首页快速浏览核心商品和分类入口，以便快速找到想要的商品。

#### 验收标准

1. WHEN 用户打开小程序首页 THEN Mini_Program SHALL 展示轮播图/视频宣传内容
2. WHEN 用户打开小程序首页 THEN Mini_Program SHALL 展示热门商品列表（由后台配置）
3. WHEN 用户打开小程序首页 THEN Mini_Program SHALL 展示商品分类快捷入口（蒙牛乳品、白酒、葡萄酒、美妆等）
4. WHEN 用户在首页搜索框输入关键词 THEN Mini_Program SHALL 返回店内匹配商品列表
5. WHEN 用户点击商品卡片 THEN Mini_Program SHALL 跳转至商品详情页

---

### 需求 2：商品分类浏览

**用户故事：** 作为消费者，我希望通过分类筛选商品，以便按品类快速找到目标商品。

#### 验收标准

1. WHEN 用户进入分类页 THEN Mini_Program SHALL 展示一级分类列表（食品、饮品、日用品、美妆等）
2. WHEN 用户选择一级分类 THEN Mini_Program SHALL 展示该分类下的二级分类
3. WHEN 用户选择二级分类 THEN Mini_Program SHALL 展示该分类下的商品列表
4. WHEN 商品列表加载时 THEN Mini_Program SHALL 支持分页加载，每页展示合理数量商品

---

### 需求 3：购物车管理

**用户故事：** 作为消费者，我希望管理购物车中的商品，以便统一结算购买。

#### 验收标准

1. WHEN 用户进入购物车页面且购物车有商品 THEN Mini_Program SHALL 展示商品列表（图片、名称、规格、单价、数量）
2. WHEN 用户修改商品数量 THEN Mini_Program SHALL 实时更新小计和总价
3. WHEN 用户删除购物车商品 THEN Mini_Program SHALL 从列表中移除该商品
4. WHEN 用户勾选商品并点击结算 THEN Mini_Program SHALL 跳转至订单确认页
5. WHEN 购物车为空 THEN Mini_Program SHALL 展示空状态提示和"去逛逛"按钮
6. WHEN 用户点击"去逛逛" THEN Mini_Program SHALL 跳转至首页或分类页

---

### 需求 4：商品详情与加购

**用户故事：** 作为消费者，我希望查看商品详细信息并加入购物车，以便做出购买决策。

#### 验收标准

1. WHEN 用户进入商品详情页 THEN Mini_Program SHALL 展示商品图片轮播、名称、价格、规格选项
2. WHEN 用户进入商品详情页 THEN Mini_Program SHALL 展示商品描述、详情图片
3. WHEN 用户选择规格并点击"加入购物车" THEN Mini_Program SHALL 将商品添加至购物车
4. WHEN 用户选择规格并点击"立即购买" THEN Mini_Program SHALL 跳转至订单确认页
5. WHEN 商品库存不足 THEN Mini_Program SHALL 禁用购买按钮并提示"库存不足"

---

### 需求 5：订单管理

**用户故事：** 作为消费者，我希望查看和管理我的订单，以便跟踪购买状态。

#### 验收标准

1. WHEN 用户进入订单列表页 THEN Mini_Program SHALL 展示订单tab（全部、待支付、待发货、待收货、售后）
2. WHEN 用户切换订单tab THEN Mini_Program SHALL 筛选展示对应状态的订单
3. WHEN 用户点击待支付订单 THEN Mini_Program SHALL 支持继续支付或取消订单
4. WHEN 用户点击待收货订单 THEN Mini_Program SHALL 支持确认收货操作
5. WHEN 用户点击已完成订单 THEN Mini_Program SHALL 支持申请售后、评价商品
6. WHEN 用户查看订单详情 THEN Mini_Program SHALL 展示商品信息、物流信息、支付信息

---

### 需求 6：拼团功能

**用户故事：** 作为消费者，我希望参与拼团活动，以便以更优惠的价格购买商品。

#### 验收标准

1. WHEN 用户进入拼团商品详情页 THEN Mini_Program SHALL 展示拼团价格和单独购买价格
2. WHEN 用户点击"发起拼团" THEN Mini_Program SHALL 创建拼团订单并生成分享链接
3. WHEN 用户点击"参与拼团" THEN Mini_Program SHALL 加入已有拼团
4. WHEN 拼团人数达标 THEN Mini_Program SHALL 自动成团并通知所有参与者
5. WHEN 拼团超时未成团 THEN Mini_Program SHALL 自动退款并通知用户
6. WHEN 用户进入"我的拼团" THEN Mini_Program SHALL 展示拼团订单列表（进行中、已成功、已失败）

---

### 需求 7：会员权益管理

**用户故事：** 作为消费者，我希望管理我的积分、余额和优惠券，以便在消费时使用。

#### 验收标准

1. WHEN 用户进入个人中心 THEN Mini_Program SHALL 展示账户余额、积分数量、优惠券数量
2. WHEN 用户点击余额 THEN Mini_Program SHALL 展示余额明细和充值入口
3. WHEN 用户点击积分 THEN Mini_Program SHALL 展示积分明细和获取/使用记录
4. WHEN 用户点击优惠券 THEN Mini_Program SHALL 展示可用、已用、已过期优惠券列表
5. WHEN 用户在订单结算时 THEN Mini_Program SHALL 支持选择使用积分、余额、优惠券抵扣

---

### 需求 8：签到与兑换

**用户故事：** 作为消费者，我希望通过签到获取积分并兑换商品，以便获得更多权益。

#### 验收标准

1. WHEN 用户进入签到页面 THEN Mini_Program SHALL 展示签到日历和连续签到天数
2. WHEN 用户点击签到 THEN Mini_Program SHALL 增加用户积分并更新签到状态
3. WHEN 用户当日已签到 THEN Mini_Program SHALL 禁用签到按钮并提示"今日已签到"
4. WHEN 用户进入兑换中心 THEN Mini_Program SHALL 展示可兑换商品/福利列表
5. WHEN 用户积分足够并点击兑换 THEN Mini_Program SHALL 扣除积分并创建兑换订单

---

### 需求 9：用户个人中心

**用户故事：** 作为消费者，我希望管理我的个人信息和查看行为记录，以便获得个性化体验。

#### 验收标准

1. WHEN 用户进入个人中心 THEN Mini_Program SHALL 展示用户头像、ID、会员等级
2. WHEN 用户点击设置图标 THEN Mini_Program SHALL 进入个人信息编辑页面
3. WHEN 用户点击"我的收藏" THEN Mini_Program SHALL 展示收藏的商品列表
4. WHEN 用户点击"浏览记录" THEN Mini_Program SHALL 展示最近浏览的商品列表
5. WHEN 用户点击"我的评论" THEN Mini_Program SHALL 展示已发表的评论列表

---

### 需求 10：分销推广

**用户故事：** 作为推广者，我希望查看我的推广收益，以便了解分销业绩。

#### 验收标准

1. WHEN 用户进入"我的收入"页面 THEN Mini_Program SHALL 展示累计收益、可提现金额
2. WHEN 用户查看收益明细 THEN Mini_Program SHALL 展示每笔推广订单的返佣记录
3. WHEN 用户申请提现 THEN Mini_Program SHALL 校验可提现金额并提交提现申请
4. WHEN 用户分享商品链接 THEN Mini_Program SHALL 生成带推广标识的分享链接

---

### 需求 11：B端合作方入口

**用户故事：** 作为门店/供应商，我希望申请成为合作方，以便在平台开展业务。

#### 验收标准

1. WHEN 用户点击"门店申请" THEN Mini_Program SHALL 展示门店入驻申请表单
2. WHEN 用户点击"供应商申请" THEN Mini_Program SHALL 展示供应商入驻申请表单
3. WHEN 用户提交申请 THEN Mini_Program SHALL 保存申请信息并提示"等待审核"
4. WHEN 申请审核通过 THEN Mini_Program SHALL 通知用户并开通相应权限

---

### 需求 12：底部导航

**用户故事：** 作为消费者，我希望通过底部导航快速切换页面，以便高效使用小程序。

#### 验收标准

1. THE Mini_Program SHALL 在底部展示固定导航栏（首页、分类、购物车、我的）
2. WHEN 用户点击导航项 THEN Mini_Program SHALL 切换至对应页面
3. WHEN 购物车有商品时 THEN Mini_Program SHALL 在购物车图标上展示商品数量角标

---

## 管理后台需求

### 需求 13：商品管理

**用户故事：** 作为运营人员，我希望管理商品信息，以便维护商品库。

#### 验收标准

1. WHEN 运营人员进入商品列表 THEN Admin_Panel SHALL 展示所有商品（支持搜索、筛选、分页）
2. WHEN 运营人员点击"新增商品" THEN Admin_Panel SHALL 展示商品编辑表单（参照淘宝模板）
3. WHEN 运营人员编辑商品 THEN Admin_Panel SHALL 支持修改名称、价格、库存、规格、描述、图片
4. WHEN 运营人员上传商品图片 THEN Admin_Panel SHALL 支持多图上传和排序
5. WHEN 运营人员设置商品分类 THEN Admin_Panel SHALL 支持选择一级、二级分类
6. WHEN 运营人员点击"上架/下架" THEN Admin_Panel SHALL 更新商品状态
7. WHEN 运营人员保存商品 THEN Admin_Panel SHALL 校验必填项并保存至数据库

---

### 需求 14：分类管理

**用户故事：** 作为运营人员，我希望管理商品分类，以便组织商品结构。

#### 验收标准

1. WHEN 运营人员进入分类管理 THEN Admin_Panel SHALL 展示分类树形结构
2. WHEN 运营人员新增一级分类 THEN Admin_Panel SHALL 创建顶级分类节点
3. WHEN 运营人员新增二级分类 THEN Admin_Panel SHALL 在指定一级分类下创建子分类
4. WHEN 运营人员编辑分类 THEN Admin_Panel SHALL 支持修改分类名称、图标、排序
5. WHEN 运营人员删除分类 THEN Admin_Panel SHALL 校验分类下无商品后删除

---

### 需求 15：首页内容管理

**用户故事：** 作为运营人员，我希望配置小程序首页内容，以便灵活运营。

#### 验收标准

1. WHEN 运营人员进入首页配置 THEN Admin_Panel SHALL 展示轮播图、热门商品、分类入口配置区
2. WHEN 运营人员配置轮播图 THEN Admin_Panel SHALL 支持上传图片、设置跳转链接、调整顺序
3. WHEN 运营人员配置热门商品 THEN Admin_Panel SHALL 支持选择商品并设置展示顺序
4. WHEN 运营人员配置分类入口 THEN Admin_Panel SHALL 支持选择分类并设置图标、顺序
5. WHEN 运营人员保存配置 THEN Admin_Panel SHALL 实时更新小程序首页展示

---

### 需求 16：订单管理

**用户故事：** 作为运营人员，我希望查看和处理订单，以便完成订单履约。

#### 验收标准

1. WHEN 运营人员进入订单列表 THEN Admin_Panel SHALL 展示所有订单（支持按状态、时间、用户筛选）
2. WHEN 运营人员查看订单详情 THEN Admin_Panel SHALL 展示商品、用户、支付、物流信息
3. WHEN 运营人员处理待发货订单 THEN Admin_Panel SHALL 支持填写物流单号并发货
4. WHEN 运营人员处理售后订单 THEN Admin_Panel SHALL 支持审核退款/退货申请

---

### 需求 17：资金管理

**用户故事：** 作为运营人员，我希望管理平台资金，以便掌握财务状况。

#### 验收标准

1. WHEN 运营人员进入资金概览 THEN Admin_Panel SHALL 展示总收入、待结算、已提现金额
2. WHEN 运营人员查看交易流水 THEN Admin_Panel SHALL 展示所有支付、退款、提现记录
3. WHEN 运营人员处理提现申请 THEN Admin_Panel SHALL 支持审核并打款
4. WHEN 运营人员查看分销佣金 THEN Admin_Panel SHALL 展示推广订单和佣金明细

---

### 需求 18：用户管理

**用户故事：** 作为运营人员，我希望管理平台用户，以便维护用户体系。

#### 验收标准

1. WHEN 运营人员进入用户列表 THEN Admin_Panel SHALL 展示所有用户（支持搜索、筛选）
2. WHEN 运营人员查看用户详情 THEN Admin_Panel SHALL 展示用户信息、订单、积分、余额
3. WHEN 运营人员调整用户积分/余额 THEN Admin_Panel SHALL 记录操作日志
4. WHEN 运营人员审核合作方申请 THEN Admin_Panel SHALL 支持通过/拒绝并通知用户

---

### 需求 19：营销活动管理

**用户故事：** 作为运营人员，我希望管理拼团等营销活动，以便促进销售。

#### 验收标准

1. WHEN 运营人员进入拼团管理 THEN Admin_Panel SHALL 展示拼团活动列表
2. WHEN 运营人员创建拼团活动 THEN Admin_Panel SHALL 支持设置商品、拼团价、人数、时限
3. WHEN 运营人员编辑拼团活动 THEN Admin_Panel SHALL 支持修改活动参数
4. WHEN 运营人员查看拼团数据 THEN Admin_Panel SHALL 展示参与人数、成团率、销售额

---

### 需求 20：素材中心管理

**用户故事：** 作为运营人员，我希望管理宣传素材，以便供用户/合作方使用。

#### 验收标准

1. WHEN 运营人员进入素材中心 THEN Admin_Panel SHALL 展示素材列表（图片、视频）
2. WHEN 运营人员上传素材 THEN Admin_Panel SHALL 支持批量上传并设置分类、标签
3. WHEN 运营人员删除素材 THEN Admin_Panel SHALL 从素材库移除该素材
