# MPS (Igloo Foretracker) — Handover Log

维护规则：**每次开始新的一项工作前，先看这份文件了解最近状态；完成一项工作后，在最上面追加一条新记录（倒序，最新的在最上面）。**

对接人：David Huang（david.huang@igloohome.co）。其他同事（Jessie/Jayvis/Berfin/Steven 等）只通过口头/Slack 向 David 反馈需求，不直接改代码。

---

## 2026-07-17（第二次返工）— 选 Buffer Stock 时默认归到 "OPS Department"，而不是某个真实地区

**背景**：上一条记录（下面）把 Buffer Stock 做成 Region 下拉的第 4 个选项后，David 指出一个问题：选 Buffer Stock 时，用户往往还不知道这批缓冲库存最终会用在哪个地区，之前"二级下拉默认选第一个地区（APAC）"的做法不对——应该默认是一个"还没分配"的中间状态，取名 "OPS Department"。

**方案**：让 "OPS Department" 变成 `forecasts.region` 真正能存的第 4 个值（不再只是 UI sentinel），流程：
- `lib/db.ts`：`forecasts` 和 `forecast_deletion_logs` 的 region CHECK 约束从 `('APAC','EU','USA')` 拓宽到 `('APAC','EU','USA','OPS Department')`（schema version 9→10）。新建表用的 CREATE TABLE 内联约束直接改了；已有生产库走 `widenForecastRegionCheckConstraints()`——沿用上一条记录里那个"异常吞掉"的写法防并发报错。
- `lib/types.ts`：新增 `ForecastRegion = Region | "OPS Department"`，只用在 `ForecastEntry.region`、`FulfillmentGroup.region`、`LogisticsLandedCostConsolidateLineItem.region` 这几个来自 forecasts 表的字段上。**其他表（user_regions/order_progress/logistics_shipments/mass_production_kanban）的 region 一律保持严格的 `Region`，不受影响**——这几张表代表的是"已经落地的真实业务"，OPS Department 只在"还没分配地区的 forecast"这个阶段存在。
- `lib/forecast-po.ts`：加 PO 前缀映射，OPS Department → `POO`（跟 APAC→POA / EU→POE / USA→POU 一致的模式）。
- **可见性（David 拍板）**：所有登录账号都能看到/管理 OPS Department 的记录，不受各自 region 权限限制。这意味着 `lib/repositories.ts` 里所有"按 session region 过滤 forecasts"的查询（`getForecastsByRegions`、`findLatestForecastByPoAndSku`、月度/季度汇总、合同可见性判断、到岸成本汇总的权限检查等，一共 7 处）都加了 `or region = 'OPS Department'` 或等价的旁路判断，确保 OPS Department 的 forecast、以及由它生成的合同/后续数据，不会因为落在"没人的地区"而对谁都不可见。
- **UI**：Region 下拉选 "Buffer Stock" 时，自动把底层真实 `region` 设成 "OPS Department"；旁边"缓冲库存归属地区"二级下拉现在**永远显示**（不再只对多地区账号显示），列表第一项就是 "OPS Department"（默认选中），后面跟 APAC/EU/North America，方便日后知道具体地区了随时改过去。编辑面板做了同样处理。

**验证**：`tsc --noEmit`、`npm run lint` 全干净。本地实测：选 Buffer Stock → 二级下拉默认显示 "OPS Department" → 提交后 API 返回 `region:"OPS Department", demandType:"buffer"`，PO 号是 `POO202607170001`（前缀验证正确）→ 表格正确显示 "OPS Department" + Buffer 徽标 → 测试数据删除干净 → 数据库层面确认两处 CHECK 约束都已正确拓宽为 4 个值，其余 99 条真实数据的 region 全部还是 APAC/EU/USA，没有被迁移弄脏。

---

## 2026-07-17（返工）— Buffer stock 改为从 Region 下拉菜单直接选择

**背景**：下面这条 2026-07-17 的记录里，最初把 Buffer stock 做成了"SKU 明细行里的一个勾选框"。David 反馈这完全误解了需求——他要的是**直接在 Region 下拉菜单里加一个"Buffer Stock"选项**，和 APAC/EU/North America 并列，而不是另外单独一个勾选框。

**返工后的方案**：
- Region `<select>` 现在显示 4 个选项：APAC / EU / North America / **Buffer Stock**。选中 "Buffer Stock" 时前端设一个内部 `demandTypeMode` 状态为 buffer，不影响真实的 `region` 字段的 CHECK 约束/RBAC/PO 编号规则（技术上这些顾虑没变，见下面一条记录）。
- 由于 `forecasts.region` 数据库列仍然只能是 APAC/EU/USA 之一（不会真的塞入 "BUFFER" 这个值），选中 Buffer Stock 后：
  - 如果账号只有 1 个 region 权限（大部分 regional_admin）→ 直接静默用那个 region，不需要用户多选。
  - 如果账号有多个 region 权限（比如 David 的 super_admin）→ 在 Region 下拉旁边多弹出一个"缓冲库存归属地区"小下拉，二选一/三选一具体归到哪个真实地区（默认 `allowedRegions[0]`）。
- 编辑面板（"全部 Forecast 记录"点"编辑"）的 Region 下拉做了同样的合并处理，去掉了返工前加的那个独立勾选框。
- 因为 Buffer 现在是"新建这一批 SKU 明细行"共享的一个状态（跟 Forecast Month/Region 同一个层级），不再是逐行勾选——所以把 SKU 明细行里那个 Buffer 勾选框列整个删掉了。
- "全部 Forecast 记录"表格的 Buffer 列 + 筛选、CSV 导入的可选 `demand_type` 列、后端 schema/API（`demand_type` 字段本身）都不用动，因为这些都是作用在已保存的单条记录上，跟"新建时怎么录入"是两回事。

**验证**：`tsc --noEmit`、`npm run lint` 全干净。本地实测：Region 下拉里能看到 4 个选项；选 "Buffer Stock" 后（David 账号是 3 region）正确弹出"Buffer belongs to region"二级下拉；提交后 API 返回 `region:"APAC", demandType:"buffer"`；测试数据已删除，数据库确认无残留。

---

## 2026-07-17（第一版，已废弃上面提到的 UI 做法）— Forecast 支持"缓冲库存 (Buffer stock)"标记

**需求背景**：Region 目前只有 APAC/EU/USA 三个真实地理区域，但业务上有时需要为某个 SKU 单独囤一笔"缓冲库存"，用来应付 forecast 不准时的紧急需求。

**方案决策**（David 拍板）：
- 不新增第 4 个 region（region 深度绑定权限体系 `user_regions`、PO 编号前缀规则、多张表的 CHECK 约束，改动风险大且语义不对——buffer 是"用途"不是"地方"）。
- 改为在 `forecasts` 表加一个正交字段 `demand_type`（'regular' / 'buffer'，默认 'regular'）。
- Buffer forecast 要能像普通 forecast 一样走完整的合同/PO 流程；仪表盘/统计默认把 buffer 算进去（不额外剔除）。本质是"贴标签"式改动，不改变任何下游计算逻辑。

**改动文件**：
- `lib/db.ts`：`forecasts` 加 `demand_type` 列 + CHECK 约束（schema version 8→9）
- `lib/types.ts`：新增 `ForecastDemandType`，`ForecastEntry`/`FulfillmentGroup` 等挂上该字段
- `lib/repositories.ts`：`mapForecast`/`getForecastsByRegions`/`findLatestForecastByPoAndSku`/`createForecast`/`getForecastById`/`updateForecast` 全部支持读写 `demand_type`
- `app/api/forecasts/route.ts`、`[id]/route.ts`、`batch/route.ts`、`csv-template/route.ts`：新建/编辑/CSV 批量导入/CSV 模板都支持可选的 `demandType`/`demand_type`，不传时默认 'regular'（向后兼容旧 CSV）
- `components/forecast/forecast-form.tsx`：新建表单 SKU 明细行加"Buffer stock"勾选框；编辑面板同步支持；"全部 Forecast 记录"表格新增 Buffer 列（琥珀色徽标）+ 复用列筛选组件做筛选（第 6 个可筛选列）

**顺带修复的 bug**：验证时发现 `applyIncrementalMigrations()`（`lib/db.ts`）在冷启动时会被并发调用多次（`Promise.all` 里几个 repository 函数各自触发 `ensureDatabase()`，这条路径没有互斥锁保护，跟走完整 `setupSchema()` 的 `bootstrapPromise` 保护不一样）。我最初写的 "drop constraint if exists + add constraint" 两步操作在这个并发竞态下会报 "constraint already exists" 错误。改成用 `DO $$ ... EXCEPTION WHEN duplicate_object THEN NULL; END $$` 包裹，规避了竞态。**这个并发问题本身是老代码就有的（其他 idempotent 的 ADD COLUMN 语句因为天然幂等所以之前没暴露出来），以后如果要在 `applyIncrementalMigrations` 里加不是天然并发安全的 DDL（比如 drop+recreate 约束/索引），都要用这种 exception-swallowing 写法，不能简单 drop+add。**

**验证**：`tsc --noEmit` 和 `npm run lint` 全干净（lint 剩余 26 个问题全部是改动前就有的，不在这次碰的文件里）。本地开发环境实测：创建一条 APAC/Singapore/BTS=77 的 buffer forecast → API 返回 `demandType:"buffer"` → 表格里正确显示 Buffer 徽标 → 点击筛选只勾 Buffer 后精确显示这 1 条（"1 / 100 rows"）→ 测试数据已通过 DELETE 接口清理干净，数据库里确认无残留（`select count(*) from forecasts where id=198` 为空，其余 99 条 `demand_type` 全部是默认的 'regular'，没有因为迁移把老数据弄脏）。

---

## 2026-07-08 — Berfin 集成 API 加 region 支持

**背景**：Berfin（EU 同事）反馈她的库存系统对接 `/api/integrations/v1/order-fulfillments` 时，`?region=EU` 参数被忽略，返回数据也没有 region 字段，导致她没法只同步 EU 数据。

**改动**：
- `lib/types.ts`：`FulfillmentGroup` 加 `region` 字段
- `lib/order-fulfillment-groups.ts`：分组时从对应 forecast 行带出 region
- `app/api/integrations/v1/order-fulfillments/route.ts`：读取并校验 `?region=` 参数（大小写不敏感，非法值静默忽略不报错）；shipments 通过 forecastPoNumber+SKU 反查所属 group 的 region 打标签
- `docs/Foretracker-Integration-API-Guide-Berfin.md`：同步更新文档（新参数 + 新字段）

**验证**：`tsc --noEmit` 通过；`npm run lint` 干净；绕开 API key 直接跑底层数据函数验证——47 个 group（APAC 14 / EU 17 / USA 16），`region=EU` 精确过滤出 17 个 group、1 个 shipment，并用 PO 号前缀（EU=`POE`开头）做了独立交叉验证，全部吻合。网站原有 Order Fulfillments 页面重新截图确认无回归。

Commit: `8412831`

---

## 2026-07-08 — Forecast 记录表新增列筛选功能

**背景**："全部 Forecast 记录"表格没有筛选功能，97 条记录混在一起不好找。

**改动**：`components/forecast/forecast-form.tsx` 给 Forecast Month / Region / SKU / Created / Ops action 五列加了点击表头弹出的筛选面板（前四列是勾选列表，Created 是日期区间），纯前端过滤（数据本来就一次性全量加载），筛选之间是 AND 关系；"全选"逻辑改成只对当前筛选后可见的行生效，避免误删看不见的行。

Commit: `f9e1bcc`

---

## 2026-07-08 — 项目接手摸底 + 数据库巡检

David 提出让 Claude 接替 Cursor 继续开发 MPS。做了：全站功能浏览、代码架构梳理（Next.js 16 + 原生 SQL + Prisma Postgres）、数据库健康检查（无孤儿外键、发现孤儿表 `sku_product_requests`、发现 forecasts 允许同 PO+SKU 多行的设计）、确认部署流程（GitHub push → Vercel 自动部署）、确认备份情况（Prisma Postgres Starter 计划，每日备份保留 7 天）、理清 2 个陈旧分支（非在途工作）、识别外部依赖（Berfin 的库存系统读取 Integration API）。

**协作约定**：David 是唯一对接人；其他同事不再直接改代码；改动完成后默认先给 David 看+本地验证，确认后再推送（除非 David 明确说"直接推送"）。

