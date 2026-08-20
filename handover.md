# MPS (Igloo Foretracker) — Handover Log

维护规则：**每次开始新的一项工作前，先看这份文件了解最近状态；完成一项工作后，在最上面追加一条新记录（倒序，最新的在最上面）。**

对接人：David Huang（david.huang@igloohome.co）。其他同事（Jessie/Jayvis/Berfin/Steven 等）只通过口头/Slack 向 David 反馈需求，不直接改代码。

---

## 2026-08-18 — 侧边栏加收起/展开功能

**背景**：David 提出很多表格（比如 Forecast Records）列数多、需要横向滚动，问能不能牺牲侧边栏宽度换取页面完整性，但要对操作者友好。评估后建议做成"可收起侧边栏"而不是直接砍掉或默认隐藏——侧边栏 `md:w-56 lg:w-60`（224–240px）比起 Forecast 表格本身 `min-w-[72rem]`（1152px）来说不是横向滚动的主因，收起后也未必能完全消除滚动，但对 Jessie/Steven 这类需要在 8 大模块间频繁切换的人保留常驻导航更重要，所以做成用户自己选、记住偏好的开关，而不是强改所有人的默认体验。

**改动**：`components/shared/app-shell-nav.tsx` 加了 `collapsed` 状态（存 `localStorage` key `mps-nav-collapsed`，跟随浏览器记住偏好，不是全局强制设置）：
- 顶部加一个收起/展开按钮（`PanelLeftClose`/`PanelLeftOpen` 图标），只在 `md:` 以上尺寸显示。
- 收起后侧边栏从 `md:w-56 lg:w-60` 缩到 `md:w-14`，只显示图标（8 大模块图标 + hover/title 提示原文字），文字标签、二级子菜单展开箭头、子菜单列表全部隐藏。
- 有子菜单的模块（Supply Chain/Order Progress/Logistics/NPI/Quality Control）收起时点图标直接跳到模块首页，看不到子菜单——要看子菜单需要先展开侧边栏。这是有意的取舍，不做 hover 弹出子菜单（范围外的额外复杂度）。
- **移动端安全兜底**：收起状态全部用 `md:` 开头的响应式 class 实现（而不是简单粗暴的 JS 分支渲染两套 DOM），确保就算 `collapsed` 状态因为某种边界情况（比如在桌面端收起后把浏览器窗口缩到手机宽度）变成 true，移动端窄屏下依然强制显示完整文字标签、看不到那个收起按钮——移动端体验完全不受这个新开关影响。

**验证**：`tsc --noEmit`、`npm run lint` 全干净（同样中途撞到一次 `react-hooks/set-state-in-effect` 新增 lint 问题——组件挂载时从 `localStorage` 读取偏好写回 state 触发的——用 `queueMicrotask` 把这次 setState 挪到 effect 同步执行栈之外解决，最终还是 24 个已知历史问题没有增加）。本地起 `mps-dev` 用 david 账号实机验证：桌面视口下点击收起，侧边栏 240px→56px，图标居中、文字/子菜单/展开箭头全部正确隐藏；点击展开按钮变回原样；刷新页面后收起状态能从 localStorage 正确恢复（240px→56px 一致）；把窗口缩到手机尺寸（375px）时，即使 localStorage 里存的是收起状态，导航依然完整显示文字标签、收起按钮不可见——移动端没有受影响。验证过程中一度在 console 看到一次 "Hydration failed" 错误，经过对照测试（`git stash` 出改动前的版本 vs 改动后版本，各自开全新浏览器 tab 测试）确认这次改动本身不会复现该错误，两个版本都干净，判断是本地 dev server 冷启动编译时的偶发瞬时问题，非本次改动引入。

Commit: (pending push)

---

## 2026-08-18 — 修复 Forecast Records 表列筛选下拉框被遮挡的问题

Commit: `177b905`

**背景**：David 反馈"All Forecast Records"表格的"Forecast Month"列筛选下拉框，部分选项被遮挡，选不到"Jan 2027"。

**根本原因**：`components/forecast/forecast-form.tsx` 里 6 个列筛选下拉框（Forecast Month/Region/SKU/Buffer/Created/Ops action）原来都是用 `position: absolute` 挂在表头按钮下面，而表格本身包在 `max-h-[65vh] overflow-auto` 的容器里（横向 + 纵向都会滚动，因为表格 `min-w-[72rem]` 比视口宽）。CSS 规则：任何祖先元素只要 `overflow` 不是 `visible`，就会把里面 `absolute` 定位的后代裁切到自己的可视范围内，跟 z-index 无关。所以下拉框列表超出这个容器可视高度的部分（比如月份列表往下滚到 Jan 2027）直接被截断，根本点不到。

**修复**：改用 React Portal（`createPortal` 挂到 `document.body`），下拉框内容不再是表格容器的 DOM 后代，改成 `position: fixed`，位置由触发按钮的 `getBoundingClientRect()` 实时计算（同时监听 window 的 scroll 捕获阶段 + resize 保持定位跟手；这里"接住"了后代滚动容器不冒泡的 scroll 事件本来抓不到的问题）。原来"点击面板外部关闭"的逻辑用同一个 ref 判断，现在面板挪到 portal 里不再是同一个 DOM 子树，所以新增了第二个 ref 专门追踪 portal 内容，点击判断改成"两个 ref 都不包含点击目标才关闭"，避免点下拉框里的复选框被误判成"点了外部"直接关掉。

**验证**：`tsc --noEmit`、`npm run lint` 全干净（过程中发现新代码触发了一次 `react-hooks/set-state-in-effect` 新增 lint 问题，已通过去掉不必要的 `setPosition(null)` reset 分支解决，最终还是 24 个已知历史问题没有增加）。本地起 `mps-dev`（端口3002）用 david 账号登录实机验证：Forecast Month 筛选面板打开后完整显示 Aug 2026 ~ Jan 2027 全部 6 个选项（面板 bottom 在 y=555，视口高 720，无裁切）；勾选 Jan 2027 → 表格正确过滤成"1 / 117 rows"（对应那条 POU202608200001/IGK3/North America 记录）；点击面板内"Clear"按钮不会误关闭面板；点击面板外部正确关闭；再次点击表头按钮正常切换关闭 —— 三种交互都没有回归。

---

## 2026-08-17 — 集成 API `order-fulfillments` 放宽收录条件，支持 forecast 阶段数据

**背景**：Berfin 反馈 `POE202608040001`（EU / Dec 2026 / 8 个 SKU）在"All Forecast Records"里能看到，但 `/api/integrations/v1/order-fulfillments` 无论加什么筛选参数都返回 0 条，一开始以为是 7月8日修的 region 参数 bug 复发。

**排查结论（查生产库确认，未改动数据）**：不是 bug 复发。这条 PO 的 8 行 SKU 全部还没建合同（`contracts` 表按 forecast_id / po_number 查都是 0 条），且 Ops action 要么是空、要么是"Consider stock transfer from other region"，没有一行是"Ok to issue PO"。`buildFulfillmentGroups()`（`lib/order-fulfillment-groups.ts`）原本要求两个条件都满足才收录（跟 Cash Flow Analysis 用同一条规则），这条 PO 两个都不满足，所以在网站自己的 Order Fulfillments 页面和集成 API 里都查不到——行为是一致的，不是 API 单独的问题。

**David 确认后的决定**：这个门槛对 Berfin 的 AOP 看板来说太晚了，需要放宽——但只放宽给外部集成 API，网站内部的 Order Fulfillments 页面（Jessie/Jayvis/Steven 平时看的）保持不变。放宽后不再要求 Ops action 或合同存在，approved forecast（即所有 forecast 记录）全部收录，`contractedQty` 为 0 表示还没建合同。

**改动**：
- `lib/order-fulfillment-groups.ts`：抽出公共 `buildGroups()`，用 `{requireApprovedForecast, requireContract}` 两个开关控制。`buildFulfillmentGroups()`（内部页面用）保持原有严格逻辑不变；新增 `buildIntegrationFulfillmentGroups()`（两个条件都关闭）给集成 API 用。
- `app/api/integrations/v1/order-fulfillments/route.ts`：改为调用 `buildIntegrationFulfillmentGroups`。
- `docs/Foretracker-Integration-API-Guide-Berfin.md`：更新 3.3 节说明，加上"`contractedQty` 为 0 表示 forecast 阶段还没合同"的说明，文档日期改成 2026年8月。

**验证**：`tsc --noEmit`、`npm run lint` 全干净（lint 剩余问题跟之前一样是 24 个已知历史问题，不在这次碰的文件里）。本地起 `mps-dev`（端口3002），临时建了一个 scope 仅 `fulfillment:read` 的测试 API key（`label='TEMP_DIAG_DELETE_ME'`）直连本地服务器验证：`?forecastPoNumber=POE202608040001` 返回 8 个 group，8 个 SKU 全部命中，`contractedQty` 均为 0；`?forecastMonth=2026-12&region=EU` 同样正确返回这 8 条；无筛选总 groupCount 从原来的 67 变成 107（新增的都是之前从未收录过的 forecast-only 记录，符合预期），`shipmentCount` 保持 2 不变（shipments 逻辑没碰）。确认内部 Order Fulfillments 页面（`app/logistics-progress/order-fulfillments/page.tsx`）仍然调用未改动的 `buildFulfillmentGroups`，不受影响。测试用的临时 API key 已通过 SQL 删除，未留痕迹。

Commit: `de2d9ab`

---

## 2026-07-22 — 产品数据库 Variant（型号）字段改为非必填

**需求**：David 要求把 Product Database 的 Variant 字段定义为非必填。

**改动**：
- `components/product/product-management.tsx`：创建产品表单的 Variant 输入框去掉 `required`。
- `app/api/admin/products/route.ts`（创建）、`app/api/admin/products/[sku]/route.ts`（更新）：必填校验去掉 variant；格式校验（"只能是数字，或数字+大写字母"）改成只有填了值才校验，留空直接放行。
- `app/api/admin/products/batch/route.ts`（CSV 批量导入）：同样的逻辑，variant 列可以留空。
- 数据库层面 `products.variant` 本来就是 `not null default` 之外没有非空限制（空字符串合法），`(sku, variant)` 唯一索引不受影响——同一 SKU 下最多一条 variant 为空的记录，逻辑上相当于"该 SKU 的默认款"。

**验证**：`tsc --noEmit`、`npm run lint` 全干净（24 个已知历史问题，无新增）。实机验证：Variant 留空直接创建成功；测试数据已删除。

---

## 2026-07-22 — 修复"创建产品失败"无错误提示的问题（NPI 产品数据库）

**问题**：David 反馈 NPI Management → Product Database 创建新产品失败，请查根本原因。

**根本原因**：`components/product/product-management.tsx` 的 `createItem()`（以及 `saveItem()`/`deleteItem()`）在请求失败时，无论后端 API 实际返回什么错误，一律只显示写死的通用文案"创建产品失败。"/"Create product failed."，把后端返回的具体原因（比如 Variant 格式不对、SKU 格式不对、SKU+Variant 已存在等）完全丢弃了。所以用户看到的永远是"失败了"，但不知道具体是哪个字段填错了，也无法自己排查或改正。

**验证复现**：起本地 dev（`mps-dev`，端口 3002，连的是生产数据库，测试完已把测试数据删除），实际尝试创建产品：
- Variant 填 "Default"（不符合"只能是数字，或数字+大写字母"的格式要求）→ 后端正确返回 400 及具体消息，但页面只显示通用失败文案。
- 换成合法 Variant（如 "1"）、以及带中文名称的正常创建 → 都能成功，说明创建产品的核心功能本身没坏，坏的是"看不到失败原因"这一层。

**修复**：`createItem`/`saveItem`/`deleteItem` 三处的失败分支都改成先读取 `response.json()` 里的 `message` 字段，有则显示服务端的具体原因，没有才 fallback 到原来的通用文案。

**验证**：`tsc --noEmit`、`npm run lint` 全干净（无新增问题，仍是 24 个已知历史问题）。实机验证：故意用不合法 Variant 提交，页面底部消息区域正确显示"Variant must be numbers only, or numbers followed by uppercase letters."；用合法数据创建/含中文名称创建均成功。

---

## 2026-07-21 — Contracts 加创建日期列 + 全站说明文字改成默认收起

**需求 1**：Contracts 列表加一列"创建日期"，方便追溯合同是哪天建的。
- `components/contract/contract-management.tsx`：表格加 `Created` 列，显示 `contract.createdAt` 的日期部分（`title` 悬停显示完整时间戳）。列表本来就是按 `created_at desc` 排序，不用额外加排序 UI。

**需求 2**：David 反馈很多页面顶部的说明文字（比如"Order fulfillments"页面同时有页面级和模块级两段几乎一样的话）对新用户有用，但老用户天天看着占地方。David 认可"做成默认收起、点开才展开"的思路，而不是直接删掉（怕以后招新人或者David自己忘了某个隐藏规则时找不到说明）。

**方案与改动**：
- **页面级说明**（`AppShell` 的 `description` 参数，全站 28 个页面共用这一个组件）：改成 `<details>`/`<summary>` 收起，默认只显示"About this page / 页面说明"一行，点开才展开原文。**只改了 `components/shared/app-shell.tsx` 这一处，28 个页面全部自动生效**，不用逐个页面改。
- **模块级说明**（各功能面板自己的 `intro`/`subtitle` 文案，散落在 13 个组件文件里）：逐个检查后发现大部分（BOM/工装/ECN/SOP/质量管理 4 个模块/线下合同上传，共 8 处）Cursor 当时就已经用了同样的 `<details>` 收起写法，不用改。真正还是"always-visible 大段文字"的只有 3 处：
  1. `components/logistics/order-fulfillments-panel.tsx` —— 这个正是 David 截图指出的那个页面，模块说明跟页面说明几乎重复。做法：**删掉页面级的重复说明**（`app/logistics-progress/order-fulfillments/page.tsx` 的 `description` 直接去掉），模块级说明改成收起（更详细，值得保留）。
  2. `components/admin/integration-api-keys-panel.tsx` —— 说明的是"密钥只在创建时显示一次，之后只存前缀"这种容易忘的系统行为，不是纯新手教程，保留内容但改成收起。
  3. `components/dashboard/cash-flow-overview.tsx` —— Dashboard 卡片说明现金流数字怎么算的，同样改成收起。
- `components/forecast/forecast-form.tsx` 里有个从未被渲染过的 `subtitle` 字段（死代码，不影响界面），没有处理，不在这次范围内。
- `components/cost-control/cash-flow-dashboard.tsx` 有一处很短的一行说明（"Overview — data refreshes with your filters"），判断为信息密度低、没必要额外加一次点击才能看到，保持原样。

**验证**：`tsc --noEmit`、`npm run lint` 全干净。实机验证：Contracts 列表新列显示正确的创建日期；Order fulfillments 页面原来两段重复说明现在只剩一个"About this module"收起项，点开内容完整无丢失；随机抽查 NPI BOM 页面确认"About this page"（页面级）+"About BOM"（模块级）两个收起项都正常，无页面级溢出。

---

## 2026-07-21 — 全站字体/输入框可读性检查与修复

**背景**：David 要求检查全站字体大小是否合适阅读，以及是否有输入框被撑爆或其他 UI bug。

**检查方法**：逐页（Dashboard、Forecast、供应链、订单进度、物流、NPI、质量管理、后台管理，20+ 页面）用脚本检测 (1) 页面级横向溢出 (2) input/select 元素自身内容溢出 (3) 小于 10.5px 的文字。

**结论**：
- **没有发现"页面被撑爆"的问题**——全站每个页面的 `document.documentElement.scrollWidth` 都没有超出视口，布局是健康的。
- 发现的是相反问题：**部分固定宽度的输入框/下拉框太窄，长文本被截断看不全**（不是布局损坏，是内容显示不全）。三处：
  1. NPI 管理 → 产品数据库，可编辑的"产品名称"输入框（最严重，最长的产品名 447px 宽的内容只有 224px 的框，被截断一半以上）
  2. Forecast 记录表的"Ops action"下拉框（长选项如"Consider stock transfer from other region"被裁切）
  3. Order Progress"新建"表单的产品名称只读框、物流进度"新建运输"表单的产品名称下拉框
- Dashboard 的 KPI 卡片小标题、图表图例用 10px，偏小但是常见的"小标签"设计，不算 bug，David 未要求改。

**修复**：
- 产品数据库的"产品名称"输入框加宽到 28rem（含中文名称字段加宽到 16rem），完全覆盖最长的产品名。
- Forecast"Ops action"下拉框加宽到 19rem（连同表格 `colgroup` 里对应的 `<col>` 宽度也要一起改，否则 `table-fixed` 布局下单独改 select 宽度不生效）。
- Order Progress 产品名称只读框、物流进度产品名称下拉框都加宽到 20rem。
- **踩坑记录**：给 `<input>` 元素只加大 `max-width` 不够，因为它本身 `width: auto` 时是按浏览器默认的 intrinsic 宽度渲染，不会因为 max-width 变大就跟着长——必须显式加 `!w-[Nrem]`（配合 `!important` 覆盖共享样式类里已有的 `max-w-[14rem]`）才会真正变宽。`<select>` 元素则不受此限制，只改 `max-width` 就够用。以后遇到类似"加宽了 CSS 但视觉没变化"的情况，先检查是不是这个原因。

**验证**：`tsc --noEmit`、`npm run lint` 全干净（复查过是 24 个跟这次改动无关的老问题）。逐个用脚本重新测了这 3+1 处输入框，修复后全部溢出量归零；同时确认加宽后没有引入新的页面级溢出（外层 `overflow-x-auto` 容器正常吸收了变宽的表格列，不影响页面本身布局）。

---

## 2026-07-20 — 供应商反馈：同一需求号多个 SKU 的 PO 单据加序号后缀区分

**背景**：一个 Forecast # / 需求号（比如 POU202607090001）建的时候如果一次填了多个 SKU 行，后面几行会复用第一行生成的 PO 号（这是本来就有的行为，没有改）。这些 SKU 后续分别创建合同后，每条合同的 `po_number` 都是同一个值——供应商单独收到每个 SKU 的 PO PDF 时，"PO No:" 那一行完全一样，没法区分/追溯。

**方案**（David 确认：只影响供应商看到的文档，前面所有流程不变）：
- 只在**生成给供应商看的 PDF/打印页/下载文件名**这一步做处理，`forecasts.po_number`、`contracts.po_number` 数据库里存的真实值完全不动——内部列表、筛选、现金流、集成 API 等所有依赖真实 po_number 的逻辑都没碰。
- 新增 `lib/printable-po-data.ts` 里的 `resolvePrintablePONumber(contract)`：查一下这个 po_number 下总共有几条合同（`listContractsByPoNumberGlobal`，不受当前登录账号的 region 权限限制——因为序号必须对所有人都一样，不能因为谁登录就编号不同）。**只有 1 条**（目前绝大多数情况）→ 显示原样，不加后缀。**2 条以上**→ 按合同创建先后顺序（id 从小到大）依次编号 `-001`、`-002`……
- 这个"显示用"的 PO 号同时用在了：打印页的"PO No:"、单个合同下载 PDF 的文件名、批量打包下载 ZIP 里每个文件的文件名。"Batch Print (Same PO)"（把同需求号所有 SKU 合并成一份文档）没有改，因为那本来就是一份文件，不存在区分问题。

**验证**：`tsc --noEmit`、`npm run lint` 全干净。拿真实数据测的——`POU202606020002` 这个需求号底下真的有 10 条合同（IGB4E/IGK3/SK3E/SP2E/SP2X/DBX1/DBX2/SK4/DAX6E/RG1），跑出来后缀正好是 `-001` 到 `-010`，顺序跟合同创建顺序（id 从小到大）完全对应；文件名也同步带上了后缀（如 `PO_POU202606020002-001_IGB4E.pdf`）。又拿了一条真实的单 SKU 合同（id=87，团队用 buffer stock 功能建的，不是我的测试数据）验证：只有 1 条的情况下，PO 号和文件名都保持原样，没有被误加后缀。

---

## 2026-07-20 — 合同"品名及规格"按供应商国内/国外自动切换中英文

**需求**：创建合同时，供应商在国内（境内合同计价）就用中文品名，供应商在国外就用英文品名——PO 单据的"品名及规格"要跟着自动切换。David 确认：(1) 已有的 52 条老合同也要跟着改，不是只影响新建的；(2) 我截图里 SKU 编号跟系统实际 SKU 对不上（比如 "IGP1-01"系统里其实是 "IGP1"，"SP3B/R/G/Y" 系统里是分开的 SP3B/SP3R 两条），不敢直接照抄导入，所以只加"中文名称"这个输入框，由 David 自己对着真实 SKU 填。

**方案**：
- 判断"国内/国外"用的是 `suppliers.is_domestic_contract`——本来就是给境内合同走人民币计价用的那个开关，正好复用，没加新字段。
- `products` 表加 `product_name_cn` 列（默认空字符串），NPI 管理 → 产品数据库页面加了"中文名称"输入框（单条创建/编辑 + CSV 批量导入都支持，CSV 表头 `chinese name` 是可选列，不填不影响老的 CSV 模板）。
- 两条创建合同的路径（"从 Forecast 现金流创建" `lib/repositories.ts` 的 `createContractsFromForecastPo`，"从 Order Progress 直接创建" 的 `createContractFromOrder`）现在都会在写入 `contracts.product_name` 时判断：供应商 `is_domestic_contract=true` 且该 SKU 填了中文名称 → 用中文；否则 → 用英文。
- **已有合同同步**：新增 `syncContractProductNamesForSku(sku)`，在产品数据库"创建/编辑/批量导入"任意一次保存后自动触发——按 SKU 找到所有引用它的合同（不区分新老），逐条按各自供应商的 is_domestic_contract 重新算一遍该用哪个名称，跟当前存的不一样才更新。**这样 David 以后在产品数据库里把某个 SKU 的中文名称填上并保存的那一刻，所有引用这个 SKU 的老合同就会自动跟着改过来，不需要额外点什么"批量修复"按钮。**

**验证**：`tsc --noEmit`、`npm run lint` 全干净。用脚本直接跑了真实代码路径（不是凭空验证逻辑）：挑了 SKU=DBX2（10 条已有合同，供应商都是境内），给它设一个临时中文名称→ 10 条合同的 `product_name` 全部自动变成那个中文名称；改回空字符串 → 10 条全部自动变回原来的英文名 "Deadbolt Go Matt black"，一个不差。另外单独测了 `resolveContractProductName`（新建合同用的解析函数）：`domestic=true` 返回中文，`domestic=false` 返回英文，跟预期一致。测试用的临时中文名称和数据全部还原干净，数据库里确认没有残留（45 个产品的 `product_name_cn` 全部还是空字符串，没有名字带 "TEST" 的合同）。

---

## 2026-07-20 — 合同 PDF 真实文件下载 + 批量打包下载

**背景**：David 反馈 Supply Chain → Contracts 页面下载合同"很痛苦"——两个具体痛点：(1) 只能一个一个点进详情页"Print PO"再下载；(2) "Print PO" 走的是浏览器 `window.print()` 原生打印对话框选"另存为 PDF"，每次都要手动输入文件名，无法绕过。

**根因**：合同 PO 单据一直是"网页 + 浏览器打印"，不是真正的服务端文件下载，所以文件名对话框没法消除；也没有任何批量选择/下载机制。

**方案**：
1. 新增服务端真实 PDF 生成：`lib/printable-po-pdf.tsx` 用 `@react-pdf/renderer`（不依赖浏览器内核，Vercel 部署友好）把 `PrintablePOData` 渲染成 PDF Buffer，中文字体用项目里已经存在但一直没人用的 `public/fonts/NotoSansSC-VF.ttf`（孤儿资源，正好用上）。数据组装逻辑从原来的 `[id]/print/page.tsx` 抽成共享的 `lib/printable-po-data.ts`（`buildPrintablePODataForContract` + `printablePOFileName`），两处复用，避免重复。
2. 单个下载：`GET /api/supply-chain/contracts/[id]/pdf`，`Content-Disposition: attachment; filename="PO_<po号>_<sku>.pdf"`，点击直接下载，不再弹任何对话框。
3. 批量下载：`POST /api/supply-chain/contracts/batch-pdf`（用 `jszip` 打包，单次最多 200 个），把选中的合同各自渲染成 PDF 后打成一个 `Contracts_<日期>.zip`，跳过未审批/无权限的会在响应头 `X-Skipped-Count` 里报告数量（前端用 `t.downloadPartial` 提示）。
4. UI（`components/contract/contract-management.tsx`）：合同列表加了勾选框列（复用之前 Forecast 表和 Buffer stock 那套"全选/单选 + 过滤后 pruning"模式）、每行新增直接的"Download PDF"链接（不用再进详情页）、顶部加"批量下载所选 (N)"按钮（用 blob + 临时 `<a download>` 触发保存）。**顺带发现并修了一个已有 bug**：这个组件的 `message` 状态一直只 `setMessage(...)` 没有任何地方 `{message}` 渲染出来，之前 `onSetStatus` 的报错就一直是静默失败——现在补了一行 `{message ? <p>...</p> : null}`，我自己新加的下载失败/部分跳过提示才用得上，顺便让老的状态切换报错也终于能被看到了。

**新增依赖**：`@react-pdf/renderer`、`jszip`（此前项目里两个都没有）。

**验证**：`tsc --noEmit`、`npm run lint` 全干净（新增/改动的文件零问题）。本地实测：单个下载 fetch 返回 `%PDF-1.3` 魔数、正确 `Content-Disposition` 文件名、57KB；用 Node 脱离浏览器直接渲染了一份含中文的示例 PO 并用 PDF 阅读器看过，版式、中英文字段都正常显示。批量下载勾选 3 条不同的合同，返回 `PK\x03\x04`（合法 ZIP）、`Contracts_2026-07-20.zip`、0 个跳过、173KB。全程没有创建/删除任何数据（纯读取），不需要清理测试数据。

（过程中遇到一次数据库连接瞬时 `ECONNRESET`，跟这次改动无关，刷新页面后自动恢复，不是新引入的问题。）

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

