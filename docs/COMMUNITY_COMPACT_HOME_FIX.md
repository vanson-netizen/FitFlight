# 社区减脂餐图片与首页紧凑布局修复

## 缺图根因与关联

上一轮有两条同名“减脂餐”，为避免误绑，压缩清单和图片 ID 映射都未加入减脂餐。因此前端找不到映射，直接返回占位图；不是图片路径大小写、扩展名或构建忽略的问题。本轮用户明确照片用于合一餐厅二楼。

基于现有发布记录与页面 service 追踪（未访问或修改云数据库）：

| 字段 | 合一二楼减脂餐 |
|---|---|
| _id / foodOptionId | food-xueyuan-option-bd51c94c2f |
| diningHallId | dining-xueyuan-hall-e9ba17ae34 |
| name（源字段 dishName） | 减脂餐 |
| category | healthy_light_meal |
| 页面资源 ID / 图片查询键 | food-xueyuan-option-bd51c94c2f |
| displayImage | /assets/community/food-xueyuan-option-bd51c94c2f.jpg |
| 压缩格式 | JPEG，768×432，62,966 字节 |

另一个同名餐品 food-xueyuan-option-27c87b7d71 的父实体是 dining-xueyuan-road-manwei-light-meal。其商家卡片始终按商家 diningHallId 查询 merchant-xueyuan-road-manwei-light-meal.jpg，标题仍为蔓味轻食，不使用新增减脂餐图。

project.config.json 的 packOptions.ignore 为空；新增文件真实存在，路径、扩展名与映射完全一致。原图及数据库记录未修改。图片失败记录 [community-images] load failed（id、path、message），再切换统一占位图；占位也失败时隐藏 image，保留底色与文字。

## 首页布局

保留纵向排列、左右边距、28rpx 圆角、整卡点击及所有路由。三张入口高度相同，间距18rpx；页内上下留白各18rpx，介绍区下边距18rpx。主标题30rpx，卡片标题32rpx，描述22rpx。

onReady/onResize 测量 scroll-view 顶部、介绍区高度和底部导航顶部，得到真实可用视口。计算公式为：

`卡片高 = clamp(floor((可用高度rpx - 介绍区高度rpx - 36页内留白 - 18介绍区间距 - 36两段卡片间距) / 3), 200, 230)`

scroll-view 明确高度截至底部导航上方，导航安全区由其实际边界包含。常见屏幕卡高230rpx，较紧凑视口200—229rpx；极小屏幕仍保持最小200rpx，允许滚动到论坛，不压缩至文字重叠。

图片仍为 aspectFill：以卡片宽度计算16:9图片本身高度，在卡片 overflow:hidden 内偏移。运动top=0、饮食裁剪位移系数0.5、论坛0.85，避免把窄卡片默认居中而裁掉运动人物头部。已查看最小高度下三张图片裁剪效果及新增减脂餐副本；这不等于真机首屏验收。

## 验证与边界

- 新增减脂餐稳定ID→非占位路径、商家封面隔离、失败路径记录测试。
- 新增实测视口计算、常见宽度首屏容纳、极小屏幕滚动、焦点、页面卸载回调测试。
- 社区页面、图片、云接口mock回归、WXML与路由检查通过。
- 数据库、云函数、训练方案和其他业务未改；本次只需重新编译预览／更新小程序前端。
- 开发者工具与真机仍需人工打开社区检查完整首屏、极小屏幕滚动到论坛、整卡跳转、图片失败回退和清晰度。未声称真机验收通过。
