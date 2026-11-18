# MPS (Igloo Foretracker) — Handover Log

维护规则：**每次开始新的一项工作前，先看这份文件了解最近状态；完成一项工作后，在最上面追加一条新记录（倒序，最新的在最上面）。**

对接人：David Huang（david.huang@igloohome.co）。其他同事（Jessie/Jayvis/Berfin/Steven 等）只通过口头/Slack 向 David 反馈需求，不直接改代码。

---

## 2026-11-18 — Berfin 回复：根因在她的导入；接口文档补"地区筛选的副作用"和"备用库存 vs 需求"

Commit: (pending push)

**Berfin 的回复（David 转贴）**：她的导入只收"PO 同时出现在 groups 里"的货运，POO202608050001 (SK4) 有货运但没有分组，所以它的 6 条货运（1566/1567/1576/1578/1589/1590）全被跳过；**null etd/eta 不是原因**（我上一条的推断不对）；她已在她那边修好。她另外问：为什么 POO202608050001 在 groups 里没有条目，它和 12 月 SK4 的 POE202608040001（forecast 500、contracted 0）是不是同一个订单，会不会重复计算。

**查证**：
- POO202608050001/SK4 = forecast id 214，OPS Department、buffer、5,000 台，已签合同 5,000（华美），6 条货运全部声明发往 EU，共 3,492 台。分组**其实有**，只是 `?region=EU` 会把 OPS Department 的分组挡掉（文档写明的设计），货运行却带 EU 标签返回，于是"有货运、无分组"。不带 `region` 参数时分组会返回。
- POE202608040001/SK4 = forecast id 206，Berfin 8/4 填的 EU 12 月需求 500，Ops action "Consider stock transfer from other region"，备注 "Stock transfer from POO202608050001"，所以没有合同。**不是同一个订单号，是同一批货**：500 是需求、5,000 是供应，不能相加。
- 备用库存发往 EU 的 3,492 台**远多于**这条 500（EU 的 SK4 还有 10 月 600+250、11 月 500、2027-01 2,000 等需求）。**系统只记录"从备用库存发往 EU"，不记录每条货运对应 EU 的哪条需求**。

**决定（David 授权我定）**：①**不加**"货运对应哪条需求"的功能（会让 Christy 每次多填一项，且只为 Berfin 一人；见 [[mps-serve-all-users-not-berfin]]）；②**不改接口行为**：让 `?region=EU` 附带 OPS 分组会让她把 5,000 台备用库存当成 EU 需求，反而造成她担心的重复计算，且她已自行修复；③**只补文档**。

**改动**（`docs/Foretracker-Integration-API-Guide-Berfin.md`）：在 "Shared buffer stock" 一节补两条：`?region=` 的副作用（货运可能返回时没有对应分组，不要强制每条货运都有分组，或不带 region 再自行筛选）；不要把备用库存和地区需求相加（备用库存是供应、标"Consider stock transfer…"的地区 forecast 是需求，通常 contractedQty 为 0；系统不记录货运对应哪条需求，需她那边自行分摊）。**没改任何代码。**

**没验证**：没有端到端调用接口；她"已修复"是她自述，我没验证；3,492 台具体对应 EU 哪几条需求，系统里没有数据，我没有也不能给出对应关系。

---

## 2026-11-17 — Berfin 的 API 读不到 IG-SO-1589 / 1590：排查结论 + 接口文档补充

Commit: `cf9ac93`

**现象**：David 发截图（Christy 账号的订单履约页）说 IG-SO-1589、IG-SO-1590 两张单 Berfin 的 API 读不到，要求优化。

**查证（服务端不是原因）**：库里这两条是 `fulfillment_shipments` id 70/71，Christy 今天（UTC 08:48/08:49）刚建，POO202608050001 / SK4 / 2026-12，`region='EU'`，状态 `In preparation`，`estimated_ready_date=2026-10-02`，**etd/eta 都是 null**，无跟踪链接。接口 `app/api/integrations/v1/order-fulfillments/route.ts` **没有任何按状态/日期的过滤**，`listFulfillmentShipments()` 也没有 limit；我用接口同样的区域判断规则在库数据上复算：`?region=EU` 会返回 IG-SO-1566/1567/1576/1578/**1589/1590** 等共 28 条 EU 货运，没有"无分组被丢弃"的货运。Berfin 的密钥 `last_used_at` = 2026-11-17 08:56:44Z，**晚于这两条创建时间约 7 分钟**，说明她的系统在它们存在之后调用过接口。所以更像是**她那边的导入逻辑**把它们筛掉了（嫌疑：etd/eta 为 null，或只收 In transit/Delivered）——但**这只是推断，没有看到她收到的 JSON，也没有她那边的代码**。

**改动**（只改文档 `docs/Foretracker-Integration-API-Guide-Berfin.md`，没改接口行为）：示例 shipment 补上 `estimatedReadyDate`（响应里本来就有这个字段，文档漏写）；新增一段"并非每条货运都有日期"：In preparation / Pending trigger SO 阶段 etd、eta、trackingLink 通常为 null/空，**是真实的未结货运，请勿因 etd/eta 为 null 而跳过**，这类行用 `estimatedReadyDate` + `deliveryStatus` 定位；说明接口不做状态过滤（含 Delivered），以及 `deliveryStatus` 的全部取值。

**没验证**：**没有端到端调用接口**（没有密钥明文；之前创建临时密钥被权限拦下，没有绕过），"会返回"是用同一套规则在 SQL 数据上复算得出，不是真实响应。

**顺带发现的隐患（未改，待 David 决定）**：`lib/repositories.ts` 的 `getForecastsByRegions` 带 `limit 200`（按 created_at 倒序）。库里现在 170 条 forecast，按每月约 25 条，约 1–2 个月后会超过 200，**最旧的 forecast 会被悄悄截掉**：订单履约页和集成接口的分组会少，对应货运在 `?region=` 过滤时会因找不到分组而丢失。这与本次问题无关，但会产生同类"看不到某条"的问题。

---

## 2026-11-17 — 订单履约：默认视图改为"全部"（Christy 的账号"少了一行"）

Commit: `652c3fb`

**现象**：David 发来两张截图：Christy 的账号里 SK4/MP7 只有 3 行（IG-SO-1566/1576/1578），David 的账号有 4 行（多了 IG-SO-1567），问是不是 bug。

**结论：不是权限/数据 bug**。Christy 截图里高亮的是 "In progress (7)" 标签，David 的是 "All (18)"，两边 All 都是 18；Christy 那行的 "EU 2,484" = 552+600+732+600（四条之和），说明 1567 在她账号里也存在；缺的那条状态是 Delivered，被默认的"进行中"视图隐藏了。上一条只修了"搜 SO 号"，她这次用的是 SKU 下拉，不在修复范围里。

**David 的决定**：不要隐藏——她每周要对账，必须看到全部记录。

**改动**（`components/logistics/order-fulfillments-panel.tsx`）：默认视图 `active` → `all`；标签顺序改为 All / In progress / Needs attention（"All"排最前）。"进行中""需要处理"两个标签保留，想聚焦时手动点。SO 号搜索"忽略视图、搜全部"的逻辑保留（无害）。

**验证**：`tsc` 干净。真机：打开默认高亮 All（105）、In progress 67、Needs attention 22；选 SKU=SK4 → 18 行，其中 MP7 为 4 行，含 IG-SO-1567，与 David 账号一致。**没验证**：没用 Christy 的真实账号登录（regional_admin 权限下的分组可见性只靠截图里的数字间接确认）；中文界面。

---

## 2026-11-17 — 订单履约：搜 SO 号时不再被"进行中"视图挡住（IG-SO-1567"显示不出来"）

Commit: `5e26c95`

**现象**：David 转述 Christy 录入时 SO-1567 这条"无法显示"，问是不是 bug。

**查证**：库里这条在——`fulfillment_shipments` id 59，`IG-SO-1567`，POO202608050001 / SK4 / 2026-12，600 台，JDM UK，地区 EU，**状态 Delivered**，Christy 2026-10-28 建、2026-11-06 改为已送达。数据没丢，没被误删。根因是我今天早些时候加的视图：默认"进行中"会隐藏所有已送达的行，而 **SO 号筛选是叠加在视图之上的**——在"进行中"里搜 1567 得到"没有匹配该 SO 号的行"，看起来像数据丢了；把状态标成 Delivered 保存后，该行也会离开当前视图（保存时有提示，但容易忽略）。这是我引入的设计缺陷，不是数据 bug。

**修复**（`components/logistics/order-fulfillments-panel.tsx`）：只要 SO 号筛选框里有字，就**忽略视图、在全部状态里搜**（`effectiveView = soFilter ? "all" : view`）；此时三个视图标签都不高亮，数字变成"匹配的行数"，旁边显示"正在搜索全部状态（含已送达）"；清空后回到原来的视图。

**验证**：`tsc` 干净。真机：默认"进行中 69"下搜 1567 → 找到 1 行（Delivered，值为 IG-SO-1567），标签显示 0/0/1 且无高亮，出现"搜索全部状态"提示，**没有**"没有匹配"提示；清空 → 回到进行中 69 行、提示消失。**没验证**：没有当面复现 Christy 的原始操作（只能从数据和代码推断她是在"进行中"视图里找已送达的行）；中文界面；"保存后行离开当前视图"那条提示是否足够醒目（没改）。**建议 David 向 Christy 确认**她当时是在搜索，还是在标成已送达之后发现行不见了——两种情况都由这次修复覆盖搜索那一种，后一种只靠原有提示。

---

## 2026-11-17 — 全站字体/字号/色彩：修深色模式、提高灰字对比度、去掉 10/11px 小字

Commit: `34e9825`

**背景**：David 让我评估全站字体字号色彩。测量方法：遍历页面所有可见文字，取真实渲染的字号/前景色/有效背景色算 WCAG 对比度（用画布把 oklab 等颜色转 RGB），再配合全站代码统计。结论：字体（Inter + 系统中文字体）、14/12px 正文、14/18/24 标题层级、正文色 `#111827`(17.7)、次要色 `#4B5563`(7.6) 都合适；有三类具体问题，David 同意先做其中 1、2、4（第 3 项橙色待定）。

**改动**：
1. **深色模式 bug（最严重）**：全站有 178 处 `dark:` 样式（`cash-flow-dashboard` 78、`order-fulfillments-panel` 47、`landed-cost-consolidate-panel` 30 等），但应用没有深色主题（`color-scheme: light`、背景永远白）。**系统是深色模式的同事**会看到白底上的浅灰字（对比度 1.2–1.7，几乎看不见；我的测试窗口恰好是深色，订单履约页 44% 文字不达标才发现）。`app/globals.css` 加 `@custom-variant dark (&:where(.dark, .dark *));`，让 `dark:` 只在祖先带 `.dark` 时生效（没人设置它），178 处一起失效，没有逐个改。
2. **浅灰字太浅**：`--app-subtle` `#9ca3af`(2.4) → `#6b7280`(4.83)；`text-[#9CA3AF]` 25 处 → `text-[#6B7280]`；浅色模式下裸写的 `text-slate-400` 27 处 → `text-slate-500`；订单履约页"Not set"状态标签（在 slate-100 底上）→ `text-slate-600`；我上一轮写的 `text-app-muted/70`（会更浅）2 处去掉透明度。`dark:text-slate-400` 不动（已被 1 失效）。
4. **去掉 10px/11px 小字**：全站 40 处 `text-[10px]`/`text-[11px]` → `text-xs`(12px)。Forecast 页 36.7% 文字原来是 11px（我上一轮加的产品名/创建日期小字），订单履约页 10% 是 10px（待办标签）。图表坐标轴字号（recharts 的 `fontSize: 11`）**没改**。

**没做**：3. 橙色 `#EE6454` 作按钮底（白字）和作文字对比度都只有 3.2（标准 4.5），蓝色"In transit"白字 4.0——涉及品牌色，**等 David 决定**。候选：整体调深到 `#D03E2C`(4.76)，或只在"当文字用"时换深色（按钮仍 3.2）。

**验证**：`tsc` 干净、lint 基线 22 不变。真机对比（同一批页面，同一套检测脚本）：订单履约页在**系统深色模式下**不达标文字 44% → 6%（剩下的全是橙/蓝按钮，即第 3 项）、10px 文字 10.8% → 0；浅色模式下 10.4% → 同样只剩橙/蓝；Forecast 页 11px 的 36.7% → 0（全部 12px），不达标 0.6% → 0.1%；Forecast/仪表盘/供应链成本控制/订单履约 4 页均无横向溢出、无被截断文字（订单履约页"Attach file"是 sr-only 隐藏文字，非问题）。**没测**：合同、管理员、产品库、登录页等未逐页扫；中文界面字形（根节点固定 `lang="en"`，Windows 通常无碍，没实际看）；截图不可用，无法判断视觉观感；字号放大后是否有个别地方被挤变形，只靠"无溢出/无截断"的数值判断，没有人眼复查；这次因 CSS 改动在开发服务器热更新生效，生产构建未单独验证。

---

## 2026-11-17 — Forecast 页版面优化：记录表瘦身、点击才编辑、统一控件、Ops action 色标

Commit: `d648893`

**背景**：David 让我评估整页版面（控件大小、名称、色彩），量过实际数值后他说"1~7都做"。改前实测：记录表 15 列、总宽 1828px（可见 847px，横向滚动 2.2 倍）、每行 103px（每行都有一个评论文本框 + 一个 Ops action 下拉，各 171 个）、170 行共约 17,500px；录入区控件高度 31/33/35/36px 不齐、圆角 8px/12px 混用；"Add line"出现两次且都是橙色实心。

**改动**（只改 `components/forecast/forecast-form.tsx`）：
1. **控件统一**：录入区所有输入/下拉/按钮高度统一 36px、圆角 10px（用 `min-h-9 rounded-[0.625rem]` 工具类；数量类型小下拉保持紧凑）。
2. **只留一个"Add line"**：去掉表格上方的"SKU 明细"标题卡+橙色按钮，只留表格下方整行虚线按钮。
3. **橙色只给"保存"**：同上，橙色实心现在只有 Save Forecast。
4. **记录表点击才编辑**：备注、Ops action 默认只读显示（备注最多2行、Ops action 为色标），点击才变成输入框/下拉；备注失焦保存、**Esc 取消不保存**，Ops action 选完立刻保存。行高 103px → 平均约 52px，170 行总高约一半。
5. **记录表 15 列 → 9 列**：合并产品名称到 SKU 下面、创建日期到 Forecast # 下面（悬停可看创建人）、Incoterm 到目的国下面、BTO/BTS 合并成"数量"（合计 + BTS/BTO 标签，两者都有时显示"BTO x · BTS y"）、Buffer 变成区域旁的小标签；编辑/删除变成行末两个图标，**桌面端悬停或键盘聚焦才显示**（<lg 屏常显）。总宽 1828px → 1216px。**原有筛选都保留**：Buffer 筛选并入"区域"表头面板（两组复选框）；创建日期筛选挂在"Forecast #"表头。
6. **名称统一**："评论/Comment"统一叫"备注/Remark"（表头、占位、提示、aria）。
7. **Ops action 色标**：Ok to issue PO 绿 / Review the demand… 蓝 / Not build new lot… 琥珀 / Consider stock transfer… 紫。

**踩坑记录**：①自定义 CSS 类 `.app-field`（写在 globals.css）开发服务器**没编译出来**（重启服务器也一样，原因没查清），改用工具类，globals.css 已还原无改动。②Esc 取消后"跳过保存"的标记没复位，会让**下一次**编辑失焦被悄悄跳过保存（编辑框被移除时不一定触发 blur，Firefox 尤甚）——测试中发现并修复：每次打开编辑框都复位该标记。

**验证**：`tsc` 干净、lint 基线 22 不变。真机：控件全部 36px/10px；"Add line"只剩 1 个；表头 10 列（含勾选与操作）；区域面板含两组复选框、Forecast # 面板是创建日期范围；用一条临时 APAC 测试行验证：点备注→不改直接失焦**不发请求**；改字失焦**发 PATCH 且保留 Ops action**；Esc **不发请求**并还原；Esc 之后再编辑能正常保存（回归测试）；点 Ops action→选"Ok to issue PO"→发 1 次 PATCH、显示绿色标签；行高 53px。测试行已删，库里仍 170 条。**没测**：真实鼠标焦点流转（测试窗口无焦点，blur 用 focusout 事件模拟；下拉自动弹出 `showPicker` 未能验证）、悬停才显示的操作图标的实际视觉、删除图标/批量删除（未点）、中文界面、手机宽度、暗色模式、编辑已有记录的面板（`app-control-*` 控件也被统一成 36px，未看）。

---

## 2026-11-17 — Forecast 页：批量导入折叠成"导入"菜单 + 记录"录入方式"字段

Commit: `d5b436e`

**背景**：David 问 Bulk import 有没有人用。数据结论：正式阶段（4月下旬起）基本没用过——现存170条里没有 API 导入的备注签名，也没有 CSV 导入"短时间连续多行、PO 各不相同"的特征，成批行都是表单一次保存多行（共用1个PO、间隔约250–430ms）；3/26–4/20 的测试阶段有几批"多行各自不同 PO"的数据，删除原因全是 test（像是试过导入，但删除记录没有备注，无法证实）。因为用得少却占整张卡片，David 同意折叠。

**改动**：
- `components/forecast/forecast-form.tsx`：去掉整张"Bulk import"卡片，换成"新建"那一行最右边一个小的"导入 ▾"按钮，点开是三项（CSV 模板 / CSV 导入 / API 导入，各带一行说明，底部是原"导入说明"），点外面或按 Esc 关闭。导入结果/错误提示改成**只有有内容时才出现**，带 × 关闭；"没有启用产品"的警告仍然常驻。三个功能都保留，只是多点一下。
- **新字段 `forecasts.source`**：`'form'` / `'csv'` / `'api'`，**现有170条为空串 `''`（= 此前未记录，不是 form）**。`lib/db.ts`：`CURRENT_SCHEMA_VERSION` 12→13，两处 `alter table forecasts add column if not exists source text not null default ''`；`lib/repositories.ts` `createForecast` 两条 insert 都写入 source（默认 `form`）；批量导入路由传 `csv`、API 导入路由传 `api`。**只用于以后统计，界面不显示、不进 API 输出。** 一两个月后可 `select source, count(*) from forecasts group by 1` 判断导入功能去留。

**验证**：`tsc` 干净，lint 基线不变（该文件原有2个报错）。真机：菜单三项、点外面关闭、旧卡片已消失、文件 input 仍在；迁移已在生产库建出 `source` 列。**端到端真实保存一条**（APAC/AE1/数量1，备注 TEMP_SOURCE_TEST）：`source='form'`，预填的 Singapore/EXW/BTS 正确落库；该测试行已删除，库里仍170条。副作用：多了一条 forecast 审计日志（create），且 2026-11-17 的 APAC PO 流水号 `POA202611170001` 已被占用（下一条是 0002）。**没测**：真的点 CSV 导入/API 导入（API 导入会往生产库写一批数据，没做；CSV/API 路由只加了一个字段，未实测写入 source）、中文界面、手机宽度、暗色模式。

---

## 2026-11-17 — Forecast 录入表单：智能默认值 + 精简录入行；删除2条测试数据

Commit: `9e9c48d`

**背景**：David 让我结合 5–11 月实际录入记录评估 Forecast 页的控件，选了"智能默认值"和"精简录入行"两项一起做，并同意删除测试数据。依据（生产库 172 条）：89% 的行是创建月 +4/+5 个月；EU→Ireland 57、USA→United States 50、APAC→Singapore 46，三者占 89%，全库只用过 9 个国家；Incoterm **不由目的国决定**（爱尔兰 DAP 45/EXW 12，新加坡 EXW 40/DAP 6，美国 DDP 30/DAP 15/EXW 5）；只填 BTS 127、只填 BTO 39、两者都填仅 6；产品名称由 SKU 带出、172 条无一为空。

**改动**：
- `lib/forecast-entry-defaults.ts`（新，纯函数）：月份默认=当前月+4；区域→常用目的国（EU Ireland / USA United States / APAC Singapore，OPS 不猜）；目的国→Incoterm（Ireland DAP / United States DDP / Singapore EXW / 其余 EXW）；常用国家列表；`switchQuantityKind`（切换数量类型时不丢数字，从"拆分"合回单一类型时两数**相加**）。
- `components/forecast/forecast-form.tsx` 新建表单：①月份默认 +4；②目的国、Incoterm 按区域预填，**切换区域时只改"还是默认值或空"的行，用户自己选过的不动**；Incoterm 一旦手动改过，之后改目的国不再覆盖它（`incotermTouched`）；③"加一行"沿用上一行的目的国/Incoterm/数量类型；④目的国下拉顶部加"常用"分组（爱尔兰/美国/新加坡/澳大利亚/中国），下面是全部 249 个；⑤去掉"产品名称"列（改成 SKU 下面一行小字，防止选错 SKU）；⑥BTO/BTS 两个数字框合并为"数量 + 类型下拉（备货 BTS / 按单 BTO / 拆分）"，默认 BTS，选"拆分"才出现两个框，**提交给服务端的字段不变**；⑦数量留空显示占位 0，**保存时任一行总数量≤0 会在发请求前被拦下**并提示第几行（库里最小值是 1，没有 0 的行）。
- **没动**：区域下拉。它本来就带"Buffer Stock"选项，且单区域用户默认就是自己的区域，所以之前设想的"隐藏区域/Buffer"实际上已经是这样，不需要改；记录列表、编辑面板、导入功能。
- **数据**：删除 forecasts id 225、226（备注 `AUDIT_LOG_TEST_DELETE_ME`，David 9/7 建的 APAC/SK4 测试行，无合同、无货运行关联）。库里现 170 条。

**验证**：`tsc` 干净、lint 基线 22 不变。默认值/切换规则 14 个断言脚本全过。真机（super_admin，不保存）：月份默认 2027-03；APAC→Singapore/EXW；切 EU→Ireland/DAP；切 USA→United States/DDP；手动改 FOB 后再切 EU，目的国跟着变、Incoterm 保持 FOB；加一行沿用上一行；500 在 BTS→BTO→拆分→BTS 间流转不丢；第 2 行空数量提交 → 提示"Line 2…"且**没有发出任何 POST**；记录表 170 行正常渲染。**没测**：真实保存一条（保存请求体字段未变，故未在生产库写入）、中文界面、手机宽度、暗色模式、多区域账号（jessie/david）的"Buffer Stock"流程、编辑已有记录的面板。

**之后可考虑**（David 未选）：备注升级成带日期/填写人的记录栏；列表默认视图（我的区域、未来月份）；给每条记录记"录入方式"（手填/CSV/API）以便判断导入功能去留。

---

## 2026-11-17 — 删除 /potentials 演示页

Commit: `97eccb7` + `4dc5369`

**背景**：David 确认删除。该页是纯前端演示（4个分类、提交不保存、占位文案"davidhuang testing…"、与 Foretracker 无数据互通），侧边栏没有入口。

**改动**：删除 `app/potentials/page.tsx`；`proxy.ts` 的 `PUBLIC_PATHS` 去掉 `/potentials`（**它此前是免登录可访问的**，现在访问会走正常的登录/404）；`README.md`、`docs/ui-control-width-checklist.md` 里的条目一并删除。没有数据库表、API、其他代码引用它。

**验证**：`tsc` 干净；已登录状态下访问 /potentials 返回 404。**没测**：未登录状态下访问 /potentials 的实际跳转（只读代码：不在公开路径里，会被重定向到登录页）。

---

## 2026-11-17 — 仪表盘新增：供应商集中度

Commit: `2eaca94`

**背景**：David 要求把之前建议的第4项"供应商集中度"也做上。

**改动**：`lib/dashboard-insights.ts` 新增 `buildSupplierConcentration`（只统计已批准/已发出合同，按供应商汇总数量，最多8家，其余合并成"其他供应商 (N)"）；新组件 `components/dashboard/supplier-concentration-panel.tsx`（横条+占比+合同份数+最大供应商一句话）；`app/dashboard/page.tsx` 挂在漏斗和单位成本走势之间。**只看数量，不含金额；不分月份，也不跟月份筛选联动**（合同没有 forecast 月份维度，页面上已写明）。

**验证**：`tsc` 干净。真机 7 家供应商的数量、占比、合同份数与库里 SQL 直算完全一致（东广精密 26,631 / 47% / 51 份；华美安防 14,200 / 25%；温州金锏 6,500 / 12% …），合计 56,377 与漏斗"已签合同"一致；控制台无报错。**没测**：中文界面、手机宽度、暗色模式、超过8家时的"其他"合并行（目前只有7家，只用代码推演）、非 super_admin 账号（合同按其区域权限过滤，未实测）。

**业务观察（供 David 参考）**：东广精密一家占 47%、前两家合计 72%，供应商集中度较高。

---

## 2026-11-17 — 仪表盘新增：数量漏斗 + 单位成本走势

Commit: `c0ad608`

**背景**：David 不要"待办视图"，问仪表盘还能放什么；我建议只用数量/日期、不用金额（分期付款导致金额不准），并选了两项："预测→合同→发货→送达"数量漏斗、各产品单位成本走势。

**改动**：
- `lib/dashboard-insights.ts`（新，纯函数）：`buildSupplyFunnel`（按所选 Forecast 月份汇总 forecast/合同/货运录入/送达数量，货运只算属于范围内分组的，所以区域权限同样作用到货运）；`trendableSkus`（有≥2条报价的 SKU）；`buildUnitCostTrend`（某 SKU 的 USD 报价按日期，每个供应商一条线）。
- `components/dashboard/forecast-executive-overview.tsx`：下方新增漏斗（4条横条+占 Forecast 的百分比），**跟随页面顶部的 Forecast 月份筛选**。
- `components/dashboard/unit-cost-trend-panel.tsx`（新）：SKU 下拉（默认报价最多的）+ 折线图。
- `app/dashboard/page.tsx`：并行多读合同、货运、报价三份数据。

**口径（页面上已写明）**：「发货」=订单履约所有货运行的 SO 数量，**含"备货中"**，不等于已出发；「合同」=已发出且关联到 forecast 行的合同，可能大于 forecast（百分比可超 100%）。

**验证**：`tsc` 干净。真机全部月份下：Forecast 82,348 / 合同 56,377（68%）/ 录入发货 20,036（24%）/ 送达 12,007（15%），**与库里 SQL 直算的四个数完全一致**；走势图 22 个 SKU 可选，渲染正常，控制台无报错。**没测**：切换月份筛选后的数字、切换 SKU、中文界面、手机宽度、暗色模式、非 super_admin 账号。注意：合同数 56,377 只统计关联了 forecast 的合同（库里 88 份均为 sent），没关联 forecast 的合同不在内。

---

## 2026-11-17 — 精简侧边栏：只留在用的页面，空模块收进"已归档模块"

Commit: `3f7ec8b`

**背景**：David 看完页面使用分析（按各表数据量判断，系统没有页面访问统计）后选了"先精简侧边栏"。8个月里订单进度、量产看板、物流进度主页/Shipping Report/Inventory Global/到岸成本汇总、NPI、质量管理的表全是 0~2 条，侧边栏却占了一半位置。

**改动**：
- `components/shared/app-shell.tsx`：侧边栏现在是 仪表盘 / Forecast 填报 / 供应链管理 / 订单履约（直接链接，不再套"物流进度"）/ 产品数据库 / 用户管理（后两项仅 super_admin）。产品数据库原来挂在 NPI 下面，单独拿出来。
- **"已归档模块"折叠组（仅 super_admin 可见）**：订单进度、量产看板、生产管理、物流进度、Shipping Report、Inventory Global、到岸成本汇总、NPI、质量管理都在里面。**路由和数据一概没动，没有删任何东西**；普通同事侧边栏里看不到，但直接输网址仍能进。
- `components/shared/app-shell-nav.tsx`：子项新增 `exact` 选项（"/logistics-progress" 不能前缀匹配 ".../order-fulfillments"，否则订单履约页会同时点亮归档组）；新增 Archive 图标。
- `app/logistics-progress/order-fulfillments/page.tsx`：去掉顶部的物流子标签栏（现在它是唯一在用的物流页，一个标签没意义），标题改为"订单履约"。归档的物流页自己的子标签栏不变。

**验证**：`tsc` 干净。真机（super_admin 账号）：订单履约页侧边栏只点亮"订单履约"、归档组收起、无子标签栏、控制台无报错；打开 /logistics-progress（归档页）时归档组自动展开、只高亮"Logistics Progress"。**没测**：非 super_admin 账号的实际显示（只靠读代码：归档组和产品数据库/用户管理在同一个 role 判断里）、中文界面、手机宽度下的展开表现、暗色模式。

**后续建议（David 尚未决定）**：隐藏 1~2 个月没人来问再删代码；`/potentials` 演示页可直接删；NPI/质量需先问负责同事是否要用。

---

## 2026-11-17 — 货运行"从合同带出"：新行自动带出 + "从合同带出"按钮

Commit: `e092331`

**背景**：David 选了优化建议第2条"货运行从合同自动带出，减少 Christy 重复录入"。先查数据再设计：PO、SKU 本来就由分组带出，真正手填的是数量、日期、收货地、运输方式、状态；几乎每个分组只有1份合同，但被拆成2~4次发货，已发数量加起来≈合同数量，所以最有用的是自动算"剩余数量"。**没用 `forecast_cash_flow_settings.shipping_mode` 带运输方式**：104条全是默认的 `ocean`，没有信息量，带出来只会错。

**改动**：
- `lib/fulfillment-prefill.ts`（新，纯函数 `suggestShipmentFields`）：①SO 数量 = 合同数量（没合同则 forecast 数量）− 本分组其他货运行已填的数量（含没保存的，剩余≤0 则不建议）；②备货完成日 = 本分组合同最早的交期；③交付状态 = In preparation；④收货地、运输方式：**只有本分组已有货运行全部一致时才带出**（空值不算），空运海运混着发的就不猜，避免悄悄默认成其中一种；⑤Buffer 池（OPS Department）行：地区取已有货运行一致的地区，没有就按一致的收货地猜。
- `lib/types.ts` + `lib/order-fulfillment-groups.ts`：`FulfillmentGroup` 新增 `contractDeliveryDate`（合同最早交期，无合同为 null）。**这会让集成 API 的 groups 多一个字段**（只增不改，`docs/Foretracker-Integration-API-Guide-Berfin.md` 已补说明）。
- `components/logistics/order-fulfillments-panel.tsx`：①点"追加发货"产生的新行**自动带出**上述值；②没保存过的行（还没录过货运的、或新追加的）操作栏多一个"从合同带出"按钮：**只填空着的字段，已经填好的绝不覆盖**，填完弹提示列出填了哪些、提醒核对后保存，全都有值时提示"没有可带出的内容"；已保存的行不显示这个按钮。**带出只是填进输入框，不会自动保存**。

**验证**：`tsc`、`lint`同基线(22)。规则用15个用例脚本验过（含：剩余数量、超发/发满不建议、没保存的数量也算已用、无合同回落到 forecast 数量、收货地/运输方式不一致时不带、Buffer 池地区推断），全过。**真机逐项对 SQL**（在库里算出每个分组应带什么，再看页面）：POE202606300001/IGK3（合同 950、已发 500、收货地 3 种、运输方式 air+sea 混）→ 带出 450 / 2026-09-07 / In preparation，收货地和运输方式留空；POU202606020002/IGK3（已发满 1800）→ 数量留空、日期 2026-07-29、运输方式全是 air 所以带 air；POE202605290001/SP2X（合同 1200、已发 1150）→ 数量 50、air。"从合同带出"按钮：空白行（POA202605110001/IGB4）→ 260 / 2026-07-13 / In preparation；再点一次不变；先手打数量 7 再点，数量保持 7、其余照常填；已保存的行无按钮。全程没保存任何东西，库里货运行仍是 62 条（26 条未送达、24 条需处理）。**没测**：中文界面、暗色模式、提示文案的实际显示（只靠读代码和一张截图里见到了提示条）。

---

## 2026-11-17 — Order fulfillments"需要处理"机制 + 修掉视觉扫描发现的5个问题

Commit: `800f484`

**背景**：David 看完使用数据分析后选了优化建议第1条（让货运数据变准变全），并要求把上一条视觉扫描发现的5个问题一起修掉。数据依据（生产库）：62条货运里60条是 Christy 一个人录的；89%没有跟踪链接、16条没 ETA、17条没 ETD；15条已过 ETA 仍是在途/准备中；7条 SO 号被填成占位符 "/"。核心问题是数据又缺又旧，同事只能回头翻邮件/Slack，不信系统。

**第1条：需要处理机制**（`lib/fulfillment-attention.ts` 新文件，纯函数；`components/logistics/order-fulfillments-panel.tsx`；`app/api/…/order-fulfillment-api` 校验）：
- **规则** `shipmentIssues()`（已送达的永远没有待办）：ETA 已过（在途/准备中且 ETA<今天，显示"ETA 已过 N 天"）；在途但缺 ETA；在途但缺跟踪链接；缺 SO 号或 SO 号是占位符（"Pending trigger SO" 状态除外，因为那时 SO 本来就没开）；缺收货地；缺交付状态。故意**没做"在途超过N天没更新"**：海运本来就一个多月不用动，会满屏误报。
- **三个视图切换**（表格上方，带数字）：需要处理 / 进行中（默认）/ 全部。"进行中"=所有没送达的（含还没录过货运的 forecast），把36条已送达的默认收起来；"需要处理"数字为非零时是琥珀色。各视图的归属**按已保存的值判断**，不是正在打字的值，所以编辑时行不会乱跳。
- **每行待办标签**：SKU 下面，ETA 已过是红色，其余缺项是琥珀色，一眼知道这行还缺什么。
- **保存后提示**：保存成功后如果还有缺项，弹琥珀色提示"Saved … Still open: No ETA, No tracking link"；如果保存后这行不再属于当前视图（比如在"需要处理"里补全了，或标成已送达），提示里加一句"该行已移出当前视图"，避免以为数据丢了。
- **服务端拒绝占位 SO 号**：`/`、`-`、`N/A`、`TBD`、`none` 等（只含标点符号或这几个词）保存会被 400 拒绝并提示"填真实 SO 号，或留空等开出来再填"；中文 SO 号、正常 SO 号不受影响。**库里现有7条 SO 号是 "/" 的货运行（都是 SG，2条已送达、5条在途）**：在途的5条会出现在"需要处理"里（缺 SO 号），要重新保存必须先填真实 SO 号或清空。
- `todayIso` 由服务端页面传给组件（UTC 日期），不在组件里读时钟，避免服务端渲染和客户端水合因为日期/时区不同报水合错误。

**第2条起的5个视觉问题**：
1. Forecast 表 PO 号列被截断：`forecast-form.tsx` 列宽 9.5rem→11rem。
2. 供应商名被截断且没悬停提示：`unit-cost-panel.tsx`、`landed-cost-consolidate-panel.tsx`、`cash-flow-dashboard.tsx`（2处）都补了 `title`。
3. Tracking link 输入框太窄：加宽到至少 17rem，有 http(s) 链接时旁边多一个"打开物流跟踪页面"图标，输入框 `title` 显示完整链接。
4. 手机宽度下整页横向滚动：order-fulfillments 的真因是我上次加的 `sr-only`（屏幕阅读器专用文字，绝对定位）外层没有 `relative`，按整个页面定位后落在表格最右边，撑宽了页面（宽 1012 vs 视口 390）→ 给外层加 `relative`；admin/users 的真因是集成密钥面板里等宽字体的接口网址没法换行（423 vs 390）→ 加 `break-all`。两页修后在 390 宽下 `scrollWidth` 都等于视口宽。
5. Forecast 页水合错误：国家名之前用 `Intl.DisplayNames` 在渲染时生成，Node 和浏览器的 ICU 版本不同（"Falkland Islands" vs "Falkland Islands (Islas Malvinas)"）导致 React 每次都丢弃服务端 HTML 重渲染。`lib/forecast-destination-countries.ts` 改成静态表（249个国家 [英文, 简体中文]，以 Node ICU 78.2 的输出为准）。先查了库里实际存的9种国家名，**全部**和这张表一致，所以存量数据不受影响；TW/HK/MO 的自定义标签保留。修后 `/forecast` 控制台无水合错误。

**验证**：`tsc`、`lint`同基线(22)。规则用23个用例脚本验过（含：已送达永远无待办、ETA=今天不算已过、月/年边界、占位符识别、中文 SO 号不误判），全过。**真机**：页面上三个数字（需要处理 24 / 进行中 69 / 全部 105 / 已送达 36）与我用 SQL 独立算出的结果逐项一致（库里 62 条货运、26 条未送达、其中 24 条需处理；另 43 个还没录过货运的 forecast 组计入进行中和全部）；"需要处理"视图里每一行都有标签、"进行中"视图里 0 条已送达、"全部"里 36 条已送达；POST 带 "/" 或 "N/A" 的 SO 号返回 400 且没有创建数据；用一条 APAC 测试货运走完"填写→保存→弹出仍缺 ETA 和跟踪链接"的流程后已删除，库里确认 0 条残留、总数回到 62/26/24。视觉脚本在 forecast/unit-cost/landed-cost/order-fulfillments/admin-users 重跑：Forecast 页 0 个问题，供应商名现在全部带悬停提示。**没测**：中文界面、暗色模式、保存后"已移出当前视图"那句提示的实际显示（逻辑只靠读代码）。

---

## 2026-11-17 — 修复仪表盘饼图标签被裁 + 全站视觉 bug 扫描（只修了饼图，其余待 David 决定）

Commit: `77c62ab`

**背景**：David 截图指出"Volume by region"饼图的标签被裁断（"OPS Department 24%" 被 SVG 边界截成 "…rtment 24%"）。OPS Department 这个长名字是 7 月加 Buffer 后才出现在这张图里的。

**已修**：`components/dashboard/forecast-executive-overview.tsx` 饼图 `label` 只显示百分比（`41%`），区域名由图例和悬停提示负责——不管窗口多窄都不会被裁。全站只有这一个饼图。

**全站扫描方法**：写了一段检测脚本（页面横向溢出 / `overflow:hidden` 盒子里被截断的文字 / 文字被祖先容器裁掉 / 图表 SVG 里超出画布的文字 / 下拉与输入框内容被截断），在约30个页面上分别以 1440 宽和 390 宽（手机）跑。覆盖：dashboard、forecast、supply-chain 全部子页、order-progress 及子页、mass-production-kanban、logistics-progress 全部子页、npi 全部、quality-control 全部、admin 两页。**没测**：登录页、合同详情页/打印页、暗色模式、中文界面、1280 宽。

**扫描结果（均未修，待决定）**：
1. **Forecast 表 PO 号列**：23 行被省略号截断（文字 155px、列宽 152px，差 3px，最后一两位数字被吃掉；有 title 悬停提示但没必要）。`td.truncate.font-medium`。
2. **供应商名列被截断且没有悬停提示**：`unit-cost` 页（`max-w-[10rem]`，6 行，如 "TAIWAN FU HSING INDUSTRIAL CO., LTD."、"Aztech Technology Pte Ltd (Singapore…"）和 `landed-cost-consolidate` 页（`max-w-[12rem]`，2 行）；`payment-schedule` 页同样的列有提示。
3. **Order fulfillments 的 Tracking link 输入框**：只有约143px宽，粘进去的 URL 只看得到开头几个字。
4. **手机宽度下整页横向滚动**：`order-fulfillments`（页面宽 1012 vs 视口 390）、`admin/users`（425 vs 390）。dashboard / forecast / contracts / cost-control 在 390 下没问题。
5. **Forecast 页的 React 水合错误**（控制台报错，不是视觉 bug 但每次打开最常用的页面都触发）：国家下拉里 `Falkland Islands (Islas Malvinas)`（服务器端渲染）与 `Falkland Islands`（浏览器）不一致，原因大概率是 `Intl.DisplayNames` 在 Node 和浏览器的 ICU 数据不同；后果是 React 丢弃服务器 HTML 在客户端重新渲染，可能有闪烁/变慢。
6. 误报排除：`span.sr-only`（屏幕阅读器专用文字）被检测脚本标成 HARD-CLIP，是正常的。

---

## 2026-11-17 — 仪表盘删掉4个图：月度走势、现金流分析、Order progress、Logistics progress

Commit: `98b57d2`

**背景**：David 要求删掉仪表盘上的4块：①Forecast 全景里的"Monthly trend (BTO vs BTS)"；②"Forecast Cash flow analysis"卡片；③"Order progress"卡片；④"Logistics progress"卡片。理由：跟代工厂私下谈了分期付款，现金流金额已不准；Order progress / Logistics progress 运行半年仍看不出趋势。（①他没单独说理由，但4张图都贴了、一并按"这几个图"处理；如果其实想留，从 git 历史恢复即可。）

**改动**：
- `app/dashboard/page.tsx`：直接渲染 `ForecastExecutiveOverview`，**不再并行拉5份只给被删图表用的数据**（order progress、logistics、suppliers、unit cost quotes、现金流行），页面少了5个库查询，加载更快。
- `components/dashboard/forecast-executive-overview.tsx`：删掉月度走势图及只服务它的 `trendData`/AreaChart 引用；"三条读数依据"里 e1 那条文案去掉"走势"一词。仪表盘现在只剩"Forecast 全景"：月份多选筛选、BTO/BTS/合计/行数/SKU 数 KPI、区域占比饼图、产品 Top 柱状图、CSV 导出。
- 删除 `components/dashboard/cockpit-visualizations.tsx`（承载后3块 + 下钻弹窗）和 `components/dashboard/cash-flow-overview.tsx`（早就没人引用的死组件）。
- `lib/cockpit-dashboard-agg.ts`：从约420行收缩成仪表盘还在用的3个函数（`forecastKpis`/`aggregateForecastByRegion`/`aggregateForecastTopProducts`），其余订单/物流/走势/下钻聚合全部是死代码。

**没动、但现在成了死代码的**（留着是因为成本控制页还在用同一个大组件，不想为这次需求去动它）：`components/supply-chain/cost-control/cash-flow-dashboard.tsx` 里的 `dashboardChartsOnly`、`fcFilterForecastMonth` 两个 prop 及其分支（现在没有调用方传它们），以及 `lib/forecast-cash-flow-payment-bars.ts` 的 `uniqueForecastMonthKeysFromRows`。**成本控制 → 现金流分析页本身不受影响**（经办人入口还在 Supply Chain → Cost control）。

**验证**：`tsc`、`lint`同基线(22)。本地真机：`/dashboard` 标题只剩 Dashboard / Forecast at a glance / Volume by region / Top products by volume，页面文本里找不到 Monthly trend / Cash flow analysis，也没有 Order progress / Logistics progress 卡片；2张图表正常；KPI 数字 BTO 11,689 / BTS 70,659 / 合计 82,348 / 172 行 / 31 SKU；取消勾选第一个月份后数字联动变化（76,748 / 170 行）、点 All months 恢复；导出按钮在。`/supply-chain/cost-control?tab=cashflow` 正常渲染（4 张表、2 张图）。服务端无报错。**没测的**：CSV 导出的真实下载；暗色模式。

---

## 2026-11-17 — 货运行自带地区：共用 Buffer 池（OPS Department）按每次发货声明目的地区

Commit: `53a5812`

**背景**：接上一条。David 指出 Buffer 会被多个地区消耗（例如 5000 台，到发货时才知道发往哪），所以把整条 Buffer 改归 EU 不对（`POO202608050001` 还剩 2516 台，之后若发往非 EU 会被错标成 EU，且 5000 全算进 EU 汇总）。新模型：Buffer 一直留在 OPS Department 当共用池，**每条货运行在发货时自己声明发往哪个地区**。

**改动**：
- `lib/db.ts`：`fulfillment_shipments` 新增 `region text not null default '' check (region in ('','APAC','EU','USA'))`（加在 `createFulfillmentShipmentTables()`，两条建表路径都会走到）；`CURRENT_SCHEMA_VERSION` 11→12，让 `incremental_migrations_applied_v*` 标记失效，生产第一次请求会自动补列。
- `lib/types.ts`：`FulfillmentShipmentEntry.region: Region | ""`。
- 新文件 `lib/fulfillment-region.ts`：`effectiveShipmentRegion()`（所属 forecast 是真实地区→用 forecast 地区；是 OPS Department→用货运行声明的地区，没声明的老数据回落成 "OPS Department"）和 `suggestRegionFromShipTo()`（按收货地猜地区：JDM/IDM/EU/UK/IR→EU，US 开头→USA，SG/Thailand/AU 等→APAC，Canada 等不猜）。
- `lib/order-fulfillment-api.ts`：校验 `region`；`resolveShipmentRegion()`——**所属 forecast 是 OPS Department 时 region 必填**（否则 400），否则不管传什么都存成 ''。`app/api/logistics-order-fulfillments/route.ts`（POST）和 `[id]/route.ts`（PATCH）都走这条规则；`lib/repositories.ts` 的读写、新增 `getForecastRegionForGroup()`。
- `app/api/integrations/v1/order-fulfillments/route.ts`：shipments 的 `region` 改用 `effectiveShipmentRegion()`，`?region=EU` 按它过滤——即只返回声明发往 EU 的货运行；OPS Department 池的 group 本身 region 仍是 "OPS Department"，不出现在任何真实地区的 groups 里。
- `components/logistics/order-fulfillments-panel.tsx`：OPS Department 行的 Ship To 下面多一个地区下拉（没选时琥珀色提示），输入收货地时自动预选建议地区（只在地区为空或仍是上次自动建议时跟随，**不会覆盖用户手选的**）；保存前客户端先拦截没选地区的情况；Forecast Qty 单元格里按地区显示 Buffer 消耗（`EU 300 / USA 500 / Left 1,170`，超额变红，没选地区的单独一栏）。
- `docs/Foretracker-Integration-API-Guide-Berfin.md`：新增"Shared buffer stock"一节说明地区语义（不要从 PO 前缀 POO 推地区，用 `region` 字段）。

**验证**：`tsc`、`lint`同基线(22)。本地真机（开发环境连的是生产库，所以测试数据选 OPS 行和 APAC 行，用完已删，库里确认 0 条残留）：OPS 行不带 region→400；带 APAC→存成 APAC；PATCH 清空→400，改 USA→成功；非法值→400；非 OPS（APAC）行传 USA→被丢弃存成 ''。迁移已在生产库跑过（列存在、v12 标记已写入）。`effectiveShipmentRegion`/`suggestRegionFromShipTo` 用20个用例脚本验过，全过（含库里实际出现过的 ship_to：JDM IR/UK、IDM UK、EU IRLAND、US FBA/SW/OMNI、SG、Hanman SG、SYW AU、Virasa Thailand、Zeest Canada→不猜）。页面：OPS 行有下拉、非 OPS 行没有；输入 JDM IR→EU，改 US FBA→USA（跟随），手选 APAC 后再改收货地→保持 APAC（不覆盖）；消耗统计、超额变红、没选地区栏都对；没选地区点 Save→弹提示且不发请求。**没测的**：集成接口的真实调用——尝试建临时 API key 被权限拦下（会在生产库新建凭证、David 没授权），所以接口这一段只验了纯函数规则 + 读了代码，没有端到端调用；以及暗色模式下新下拉的观感。

**数据收尾（David 确认后已做，2026-11-17）**：①先把 `POO202608050001` 已有的 4 条货运行（IG-SO-1566/1567/1576/1578，id 58/59/61/63）`region` 补成 `'EU'`（对旧代码无影响，因为旧代码不读这一列）；②再把 `forecasts.id=214`（`POO202608050001`/SK4 Buffer 5000）的 `region` 从 `EU` 改回 `OPS Department`（SQL 带保护：只在4条货运行都已标 EU 时才执行）。改后核对：4 条货运行的有效地区仍都是 EU，库里 OPS Department 的 forecast 共 7 条（此前 6 条 + 这条）。**注意**：我无法直接确认 Vercel 上新代码已部署完（推送后 5 分钟、部署标识稳定，但没法证明它对应新版本）；若线上还是旧代码，旧代码会按 forecast 地区(OPS)过滤，Berfin 暂时看不到这4条，部署完即恢复。回滚办法：`update forecasts set region='EU' where id=214`。走的是 SQL，没有 `business_audit_logs` 记录，以本条为准。

**之后新增的货运**：这 7 条 OPS Department 的 forecast 之后录货运行时都必须选地区（系统会强制）。`POO202610280002` 的 forecast 月份是 2026-01（同批其余是 2026-10），疑似年份笔误，已提醒 David 让 Jessie 核对，未改动。

---

## 2026-11-17 — 生产数据修复：Buffer PO `POO202608050001` 从 "OPS Department" 改归 EU（Berfin 看不到新货运）

Commit: （无代码改动，仅数据 + 本记录）

**背景**：Berfin 反馈她的 EU Shipment Tracking 看不到最近的货运（SK4 的 `IG-SO-1566/1567/1576`）。Jessie 一度以为是"PO 没在 David 系统里确认"，实际不是。

**根因（查生产库确认）**：这几条货运行都在 MPS 里，全部挂在 PO `POO202608050001` 下——这是 Jessie 8/5 建的 Buffer Stock（SK4 5000，合同 sent），`forecasts.region='OPS Department'`（7月做 Buffer Stock 时的设计：暂放，等知道服务哪个地区再改）。Berfin 的系统用 `?region=EU` 调 `/api/integrations/v1/order-fulfillments`，接口按所属 forecast 的 region 给货运行打标签再过滤，所以 OPS Department 下的货运行全被滤掉。她说"10/13 之后就没有 EU 货运"吻合：Christy 10/28 起录的货运都挂这个 PO。JDM IR/JDM UK 都是 EU，但没人把 Buffer 改归 EU。

**操作**（David 同意直接改）：用带保护条件的单行 SQL 把 `forecasts.id=214`（`POO202608050001`/SK4）的 `region` 从 `OPS Department` 改为 `EU`（先确认仅1行、当前值确为 OPS Department）。事先读代码确认 `updateForecast` 本来就不改 `po_number`，所以 PO 号不变、已有货运行不会失联。改后验证：4 条货运行（IG-SO-1566/1567/1576/1578）通过 forecast 反查的 region 全部是 EU。**走的是 SQL 不是界面，所以没有 `business_audit_logs` 记录**——以本条为准。副作用：这笔 5000 Buffer 现在算进 EU 的 forecast 汇总。

**Berfin 提的另外两点（均非 MPS bug）**：①`IG-SO-1566` 同一票的 EB2 180 / AE1 90 在 MPS 里根本没录货运行，需 Jessie/Christy 补录；②2027年1月 4 条 EU forecast（`POE202609030001` 的 SK4/EB2/SW1、`POE202609080001` 的 AE1）区域是 EU、没合同，接口按 8/17 的放宽规则会输出（`contractedQty:0`），她 AOP 看不到更像是她那边要求合同量>0——这点只读了代码和库、没真调接口，待她确认。

**遗留/注意**：库里还剩 6 条 `OPS Department` 的 forecast，如果以后有货运行挂在它们下面，Berfin 同样会看不到。另外 `docs/Foretracker-Integration-API-Guide-Berfin.md` 写 region 只可能是 APAC/EU/USA，实际会出现 `OPS Department`，文档没写。还有 `IG-CO-26041`（IGK3 500 / JDM IR）的 ETA 是 2027-01-01，疑似笔误，已提醒 David 让 Christy 核对。

---

## 2026-10-09 — Order fulfillments：SO 查找从"跳转高亮"改成"只显示匹配行"

Commit: `82c6971`

**背景**：David 搜`26035`后反馈"显示了与他无关的内容"。复现确认匹配本身没错（数据里只有2行SO号含26035，都是`IG-CO-26035`，同一个PO下的IGK3和SP2X）；问题是"跳转+高亮"的交互——85行全部保留，命中行被滚到中间、上下全是别的订单，6秒后高亮消失就分不出哪行是命中的。David 选择改成筛选模式。

**改动**（`components/logistics/order-fulfillments-panel.tsx`）：删掉整套跳转逻辑（`jumpToSo`/`flushSync`/高亮state/`scrollTo`/`pinnedColumnsWidth`/`data-row-id`/`data-so-input`/`data-pin-end` 都不再需要），改成实时筛选输入框：输入即过滤，大小写不敏感、子串匹配，跟 Month/Region/SKU 三个筛选是AND关系；标签旁显示命中行数（`2 rows`/`2 行`，0行时变红）；输入框内有放大镜图标和×清除按钮，`Esc`也能清空；0命中时表格区显示"没有匹配该 SO 号的行"。**匹配的是已保存的SO号，不是正在编辑还没保存的值**——否则在筛选结果里改SO号时，行会在打字中途消失；代价是保存后如果新SO号不再匹配，那一行会随之消失。**草稿行**（点"+"新加、还没保存的）：只要所在分组有至少1个匹配的已保存行就跟着显示。每个分组筛选后的第一行显示完整PO徽章，其余行是"↳ PO"续行样式。上一条的"左3列固定"和"SO单元格压矮"保持不变。

**验证**：`tsc`、`lint`同基线(22)。本地真机：搜`26035`→2行（IGK3、SP2X），标签"2 rows"；大写/小写都命中；`NOPE-999`→0行+提示文案；`Esc`和×都能恢复85行；叠加SKU=IGK3后剩1行且该行显示完整PO徽章；截图确认外观。**没测的**：在筛选结果里实际编辑并保存SO号后行消失的流程（逻辑按设计，没真改生产数据去试）。

---

## 2026-10-09 — Order fulfillments：跳转不再带动整页；左侧3列固定；SO 单元格压矮

Commit: `82131a5`

**背景**：David 刷新后反馈"视觉感特别差"。排查（读`auto-hide-header.tsx`）：页头是`sticky`+70%白+模糊，**页面任何一次向上滚动都会让它弹出**，而我的SO跳转用`scrollIntoView`会连整页一起滚，页头弹出盖住标题和筛选栏（截图顶部那团模糊重影）——这是我引入的。另外表格本身视野小（17列/2280px宽，每行叠3个输入框约110px高，屏幕只能看到3行6列）是早就有的问题。David 要求先修页头问题，再改表格。

**改动**（`components/logistics/order-fulfillments-panel.tsx`）：
1. 跳转改为手动计算并只滚表格容器（`shell.scrollTo`），不再调`scrollIntoView`，页面不动、页头不会弹出；横向滚动时会避开左侧固定列（`pinnedColumnsWidth()`读`[data-pin-end]`那一列的实际右边界）。
2. 左侧3列（Forecast PO / Forecast month / SKU+delivery status徽章）`xl:`以上固定在左（`sticky left-*`，宽度用固定rem值：11.5/4.75/8.5，偏移0/11.5/16.25rem），横向滚到右边时始终知道在改哪一行、状态是什么。**只在xl(≥1280px)以上固定**：窄屏下固定块约397px会吃掉大半可视区。固定单元格用不透明底色（`bg-slate-50`），否则滚动内容会透出来；SKU列右侧加了分隔线和阴影。
3. SO 单元格从3行压成2行：SO号输入框一行；SO链接输入框 + `SO ↗`(有链接时) + 纸夹图标按钮(上传)同一行，已有附件时才多出文件名那一行。行高从约110px降到87px。上传功能本身没改（仍是隐藏的file input），纸夹按钮加了sr-only文字保证可访问性。

**验证**：`tsc`、`lint`同基线(22)。本地真机：1600宽下行高87px，横向滚900px后PO列贴左(1px)、SKU列在260px(=16.25rem)，固定列背景不透明；页面先滚到250px再连续两次跳转（含一次跨筛选），`scrollY`始终250不变；1300宽(shell仅858px)下命中的SO输入框自动横向滚动到固定块右侧，不被盖住；截图确认筛选栏不再被页头遮挡。**没测的**：附件上传/删除的真实流程（只改了布局，逻辑原样搬过去），以及暗色模式下固定列的观感。

---

## 2026-10-09 — 修复 SO 查找控件的3个显示问题（上一条的返工）

Commit: `08608a6`

**背景**：David 上线后截图反馈搜索按钮是个压扁的细长胶囊、跳转后第一列(Forecast PO)被滚出视野、也看不到高亮行。**根因全是我上一条写的**：①给输入框和按钮加了项目的`app-control-sm`类，它是个宽度类（`min-width:5rem; max-width:9.5rem`），把按钮撑成又宽又扁（我没给纵向padding）、输入框也被限在9.5rem内——这个类只能用在`<select>`上，不是通用的"小号控件"；②跳转用了`inline:"center"`横向居中，把最左列顶出视野，改成`"nearest"`（宽屏下SO列本来就可见则完全不横向滚动）；③高亮只设在`<tr>`背景上，被各`<td>`自己的底色（`autoCellCls`等）盖住，只剩描边，且3秒就消失——改成对`td`施加背景（`[&>td]:!bg-amber-100`，暗色模式另配）、持续6秒。

**验证**：`tsc`、`lint`同基线(22)。本地真机测：按钮32×32、输入框224px宽；跳转后命中行td背景实测为amber-100（亮色模式）、SO输入框完整可见；回车循环到2/2正常。

---

## 2026-10-09 — Order fulfillments：加 SO Number 查找跳转控件

Commit: `11f0824`

**背景**：David 要在 Order fulfillments 筛选区（Forecast month / Region / SKU 旁）加一个控件，输入 SO Number 后快速跳转到对应行。表格82行、17列、`min-w-[2280px]`，SO Number 在第7列，靠肉眼翻很费劲。

**改动**：`components/logistics/order-fulfillments-panel.tsx`——筛选区新增"Find SO Number"输入框+放大镜按钮，带 `<datalist>` 自动补全（已有的 SO 号）。回车或点按钮：精确匹配优先，没有精确匹配就按包含匹配（不区分大小写）；命中后滚动到该行的 SO 输入框（横向纵向都居中，窄窗口下第7列也能看到）并用琥珀色描边高亮3秒；同一关键词再按回车循环跳下一个匹配，标签旁显示 `1/15`；没匹配显示红色"Not found"。**如果目标行被当前 Month/Region/SKU 筛选隐藏，会先自动把3个筛选重置为 All**（否则跳转会静默失败）。匹配范围包含已保存的行，以及正在编辑但还没保存的 SO 号。用 `flushSync` 让筛选重置先落到 DOM 再滚动，没用 smooth 滚动（后台/失焦窗口里动画会被节流导致不滚动，而且"跳转"本来就该是瞬时的）。

**验证**：`tsc --noEmit`、`npm run lint` 干净（22个问题不变）。本地起 `mps-dev` 真机测：先把 SKU 筛选设成 DBX1（只剩5行），再搜一个 SK4 的 SO 号 → 筛选自动恢复 All（82行）、命中行高亮、SO 输入框完整进入表格可视区；不存在的号显示 Not found；部分匹配 `26` 显示 1/15 → 回车 → 2/15；大小写不敏感也命中。

---

## 2026-09-08 — Order fulfillments：delivery status 改成80cm外也能一眼分辨的实心徽章

Commit: `19f0c2d`

**背景**：David 截图指出 Order fulfillments 表格"一眼看过去不知道哪个发货了哪个没发货"，追问后明确要求"眼睛距离屏幕80CM也能轻易分辨"——即不能只靠颜色、不能太小。查代码发现原实现是`STATUS_DOT`：一个8×8px的纯色圆点，放在第15列（表格总共17列、`min-w-[2280px]`），日常视口下不滚动到最右根本看不到，就算看到了8px在80cm外也分辨不出颜色。

**改动**：`components/logistics/order-fulfillments-panel.tsx`——删掉`STATUS_DOT`，新增`STATUS_BADGE`/`STATUS_BADGE_EMPTY`/`STATUS_ICON`三个常量：实心背景色+白字+图标的徽章（Delivered=绿+对勾，In transit=蓝+卡车，Pending trigger SO=琥珀+时钟，In preparation=灰+包裹，未设置=浅灰描边+"Not set"文字），颜色和图标形状双重编码（色盲也能靠图标区分）。徽章位置从第15列挪到第3列SKU值正下方——这是表格里唯一保证不用横向滚动就能看到的位置。原第15列的编辑用下拉框简化，去掉了跟着一起冗余的迷你圆点。

**验证**：`tsc --noEmit`、`npm run lint`干净（22个问题不变，跟现有baseline完全一致）。本地起`mps-dev`真机验证，抽查了30行数据：Delivered（绿底白字+对勾）、In transit（蓝底白字+卡车）、Pending trigger SO（琥珀底深字+时钟）、未设置（浅灰描边+"Not set"）都渲染正确，颜色class和文字一一对应无误；徽章在默认视口下无需横向滚动即可见。

---

## 2026-09-08 — 左侧栏收窄：4个模块不再展开子项，删掉重复的"Cost Control"顶层bug

Commit: `0be271a`

**背景**：David 截图指出左侧栏"Cost Control"出现了两次——一次是"Supply Chain Management"展开后的嵌套子项，一次是它自己单独的顶层nav条目（查代码确认是`app-shell.tsx`第117行的遗留死代码，指向老的`/cost-control`重定向路由，本该在做模块整合时一起删掉但漏了）。顺带聊到更大的设计问题：Supply Chain Management/Order Progress/Logistics Progress/Quality Control 这4个模块，左侧栏嵌套展开的子项列表，跟各自页面顶部的module-tabs条（这次会话之前几轮做的`SupplyChainSubnav`/`LogisticsSubnav`等）内容重复——同一份"这个模块有哪几个子页"的信息画了两遍。跟 David 讨论后一致认为：对这种重复访问、非探索式使用的内部工具，顶部tab条留着做子导航唯一入口更好，左侧栏收窄成只显示顶层模块（NPI Management 因为没有对应的顶部tab条，暂时保留现状不动）。

**改动**：`components/shared/app-shell-nav.tsx`给`ShellNavItem`类型加了`showChildren?: boolean`——`children`数组本身仍然参与"这个item是否处于当前激活分支"的判断（`isInNavBranch`不变），但渲染时如果`showChildren===false`就强制走"普通扁平链接"那条分支（不出chevron、不出嵌套`<ul>`），不是简单粗暴地删掉`children`数据。**这个设计选择是有意的**：Order Progress的3个子项里"Mass production Kanban"这条压根不在`/order-progress/`这个路径前缀下（它是`/mass-production-kanban`，独立顶层路由）——如果直接删掉`children`只留一个扁平href，会导致用户在Kanban页面时左侧栏"Order Progress"不再高亮；保留`children`只是不渲染，高亮判断逻辑完全不受影响。`components/shared/app-shell.tsx`：给这4个模块的nav条目加`showChildren: false`（Supply Chain Management顺带把"Buyer Entities"补进了`children`列表——它之前压根没在左侧栏的匹配列表里，只能从顶部tab条到达，现在左侧栏在这个页面上也能正确高亮了），删掉第117行那个重复的"Cost Control"顶层条目和对应的`navText.costControl`、`icon: "cost"`类型（都确认没有别处引用）。

**验证**：`tsc --noEmit`、`npm run lint`干净（22个问题不变）。本地起`mps-dev`真机验证：4个模块的nav条目确认渲染成扁平链接（无chevron按钮），NPI Management确认还是原来的可展开样式（chevron点击后正确展开/收起）；专门测了两个最容易出问题的情况——`/mass-production-kanban`（路径前缀跟Order Progress完全不搭边）访问时左侧栏"Order Progress"正确高亮，`/supply-chain/buyer-entities`（之前从来没在左侧栏匹配列表里）访问时"Supply Chain Management"也正确高亮；另外抽查了Quality Control的8D Reports子页、Logistics Progress的Order fulfillments子页，高亮都对。确认重复的"Cost Control"顶层条目已经从列表里消失。

---

## 2026-09-08 — 修复登录慢：迁移检查状态从内存挪到数据库，冷启动少跑17次DB往返

Commit: `2090fde`

**背景**：David 反馈"最近登录要等很久"，让分析根本原因。排查`authenticateUser()`发现开头就是`await ensureDatabase()`，而这个函数判断"迁移是否已跑过"的`appliedSchemaVersion`是个**纯内存变量**——Vercel serverless 实例闲置回收后，下次请求是全新进程，这个变量重置成0，导致`applyIncrementalMigrations()`里**17条顺序执行的DDL语句**（改表结构、建索引、建表）重新跑一遍，每条都是一次独立网络往返。登录恰好是用户闲置后重新打开系统的第一个动作，也恰好最容易撞上冷启动，所以最先感觉到。这条迁移链从3月上线起一直在增长（我自己9月2/7号两天就分别加了2条），是"最近变慢"的原因——不是突发bug，是攒了半年的量变。

**改动**：`lib/db.ts`新增`applyIncrementalMigrationsIfNeeded()`包装函数，复用项目里本来就有、但只给2个一次性数据回填脚本用的`app_schema_migrations`表模式：先查一行`incremental_migrations_applied_v{CURRENT_SCHEMA_VERSION}`标记存不存在，存在就直接跳过17条DDL（只剩"建表(if not exists)+查标记"2次往返），不存在才真的跑一遍`applyIncrementalMigrations()`然后把标记写进去。以后改`CURRENT_SCHEMA_VERSION`（加新迁移时本来就要做的事）会让标记天然失效，自动重新跑一遍新的批次，不需要额外维护逻辑。

**验证**：`tsc --noEmit`、`npm run lint`干净（22个问题不变）。真机测试：本地起`mps-dev`，第一次登录（标记还不存在）确认`app_schema_migrations`表新增了`incremental_migrations_applied_v11`这一行，服务端日志无报错；重启进程模拟"下一次冷启动"，标记已存在，功能正常。**为了避开dev环境Turbopack编译耗时的干扰**，另外写了一个不经过Next.js、直接连生产库的对比脚本，各自用全新连接测量：`旧的17条完整链路`总耗时4824ms vs `新的2次往返快速路径`总耗时3447ms，两者都包含一次性连接建立耗时——单独测出"连接建立"本身是2679ms（后续同连接上的查询只要278ms/次）。**换算下来这次改动每次冷启动真实省下约1.4秒**，但连接建立那2.5~3秒是完全独立的另一个瓶颈（大概率是Vercel函数区域和Postgres数据库区域不在一起，跨区域网络延迟），**这次没有动**，如果登录体感还是慢，下一步该查的是这个，不是迁移检查了。

---

## 2026-09-07 — 第3步：给 forecast/contract 加通用操作审计日志（谁在什么时候改了哪条记录）

Commit: `0070b0b`

**背景**：延续数据体检第3项，David 确认设计"只记谁在什么时候改了哪条记录"（不用字段级diff）。现状是`admin_audit_logs`只覆盖User Management和Product Database，forecast/contract这类涉及金额的核心业务数据完全没有留痕（forecast的删除操作例外，`forecast_deletion_logs`早就有，带reason字段，比这次的更详细，两者并存不冲突）。

**改动**：
- 新表`business_audit_logs`（`entity_type`限定'forecast'/'contract'，`entity_id`，`action`限定'create'/'update'/'delete'，`actor_username`，`created_at`）+ 索引；`lib/types.ts`加`BusinessAuditLog`类型；`lib/repositories.ts`加`logBusinessAudit()`（写）+`listBusinessAuditLogs()`（按entity查，读，暂时只有函数没有UI页面——David这次只要求"记"，没要求"给我一个页面看"，以后想要页面可以单独提）。
- 接入10个业务写入点：forecast的`POST /api/forecasts`（新建）、`PATCH/DELETE /api/forecasts/[id]`（改/删）、`POST /api/forecasts/batch`（CSV批量新建，逐行记）、`POST /api/forecasts/batch-delete`（批量删，加在`deleteForecastsBatch()`内部循环里，跟已有的`forecast_deletion_logs`写入紧挨着）、`POST /api/forecasts/import-from-igloohome-web`（SKU Tracker导入新建）；contract的`POST /api/contracts`（从Order Progress建）、`PATCH/DELETE /api/contracts/[id]`（改状态/删草稿）、`POST /api/contracts/from-forecast`（从Forecast批量建，一次可能建多条，每条各记一次）。
- **⚠️ 踩了一个坑（表建了但没生效）**：第一次实现只在`setupSchema()`（全新空库才会跑的完整建库函数）里加了建表语句，本地/生产都是"已有数据库"，`ensureDatabase()`走的是`coreSchemaAlreadyPresent()`为true后只调`applyIncrementalMigrations()`的分支，`setupSchema()`根本不会执行，导致真机测试第一次POST forecast时500报错`relation "business_audit_logs" does not exist`。查了`createFulfillmentShipmentTables()`/`createIntegrationApiKeysTable()`这两个"新建表"的既有先例，发现正确模式是：写成独立函数，**同时**在`setupSchema()`和`applyIncrementalMigrations()`两处都调用（前者管全新库，后者管现有生产库），改成`createBusinessAuditLogsTable()`这个独立函数后两处都接上，问题解决。**以后在这个项目里新增表，必须走这个"独立函数+两处调用"模式，不能只写在`setupSchema()`里，否则对现有生产库（这个项目从来都是这个状态）完全不生效。**

**验证**：`tsc --noEmit`、`npm run lint`干净（22个问题不变）。本地起`mps-dev`，真实登录后用API完整走了一遍create→update→delete（一条打了`AUDIT_LOG_TEST_DELETE_ME`标记的临时forecast，事后已通过正常DELETE接口清理干净，生产forecast表确认无残留），直接查生产库`business_audit_logs`表确认3条记录（create/update/delete）的`actor_username`/`entity_id`/`created_at`全部正确对应；contract那几个写入点因为搭测试数据成本较高（需要真实order progress/forecast allocation）没有做真实create/update/delete测试，但走的是跟forecast完全同构的`logBusinessAudit()`调用+`contract.id`字段访问，`tsc`已确认类型正确（`ContractEntry`/`updateContractStatusById`返回类型含`id`字段），判断为低风险。

---

## 2026-09-07 — 第4步：彻底删除 Cost Control "成本分析" tab（4个月0数据，David 确认删）

Commit: `f0e3afa`

**背景**：延续同一次数据体检的第4项，David 确认"完全删除（推荐）"。这个tab背后是`CostAnalysisPanel`（成本分析手动录入）+`PoCashFlowPanel`（PO现金流手动录入），4个月0行真实数据，跟真正在用的"现金流分析"tab（自动从forecast+contract计算）是两套完全独立的东西，只是当初都挂在"成本控制"模块下造成混淆。

**⚠️ 排查过程中发现范围比最初估计的大**：`CashFlowDashboard`这个组件（`components/supply-chain/cost-control/cash-flow-dashboard.tsx`，1876行）是个"半死不活"的共享组件——Dashboard首页和"现金流分析"tab两个**真正在用**的地方调用它时，`entries`/`costAnalysisEntries`两个参数**永远传空数组**（`entries={[]}`），只有即将删除的`PoCashFlowPanel`会传真实数据并触发组件内部那段"手动KPI筛选表格"的死代码分支（`if (forecastSummaryOnly) {...} else {...}`的else分支）。所以不能简单删2个文件了事，还要把这个共享组件里被"永远走不到的分支"外科手术式地摘除，同时保留Dashboard和"现金流分析"tab两边真正在用的"Forecast现金流汇总+付款条形图+到岸成本"部分。

**改动**：
1. **`CashFlowDashboard`瘦身**：删除`forecastSummaryOnly`分支判断，只保留原来`if (forecastSummaryOnly)`为true时的那段渲染（因为剩下的2个调用方永远是true）；删除只服务于死分支的state（筛选条件11个useState、`enriched`/`supplierOptions`/`dateRange`/`filters`/`filtered`/`kpis`等memo）、`entries`/`costAnalysisEntries`/`forecastSummaryOnly`三个props、以及只被死分支用到的`enrichCashFlowRows`/`filterEnriched`/`computeKpis`/`getDateRangePreset`(部分保留)/`DashboardFilters`/`optNum`等。**保留了**`paymentMonthWindowAroundToday`/`monthKeysBetween`/`getDateRangePreset`/`RangePreset`（这几个是Dashboard自己的日期选择器、forecast付款条形图、payment schedule矩阵表在用的通用日期工具，虽然定义在同一个`lib/cash-flow-dashboard-agg.ts`里，但跟被删的手动录入功能无关，逐个грep确认外部引用后才决定保留）。
2. **删除组件+API+专属lib文件**：`cost-analysis-panel.tsx`、`po-cash-flow-panel.tsx`、`/api/cost-control/cash-flow/*`（2个路由）、`/api/cost-control/cost-analysis/*`（2个路由）、`lib/cash-flow-cost-analysis-link.ts`、`lib/cash-flow-validation.ts`、`lib/cost-analysis-compute.ts`、`lib/cost-analysis-validation.ts`（后两个是删除组件后才发现的孤儿文件，grep确认0处引用）。`lib/cash-flow-overview.ts`（原本8个export）只留了`addCalendarDays`一个——其余7个函数（`buildSkuCashMetaFromOrderProgress`/`scheduleCashFlowSlices`/`aggregateByPeriod`/`topSkuExposure`/`filterCashFlowForSession`等）逐个grep确认除了被删的功能外没人调用，一并清掉；`addCalendarDays`因为被真正在用的`landed-cost-cash-flow.ts`（到岸成本，Logistics模块）依赖，必须保留。
3. **`cost-control-panel.tsx`**：去掉tab切换逻辑，`/supply-chain/cost-control`页面现在只渲染"Cash flow analysis"这一块内容（不再有"cost"/"cashflow" section概念）。
4. **`lib/types.ts`/`lib/repositories.ts`/`lib/db.ts`**：删除`CashFlowEntry`/`CostAnalysisEntry`/`CostFreightMode`三个类型、`listCashFlowEntries`/`createCashFlowEntry`/`updateCashFlowEntryById`/`deleteCashFlowEntryById`/`listCostAnalysisEntries`/`createCostAnalysisEntry`/`updateCostAnalysisEntryById`/`deleteCostAnalysisEntryById`及对应`mapCashFlow`/`mapCostAnalysis`（504行CRUD代码整块删除）、两张表的`create table`建表语句。生产库直接`drop table cash_flow_entries`/`drop table cost_analysis_entries`（删前再次确认0行）。
5. **`SupplyChainSubnav`**：Cost Control嵌套菜单从4项（Cost analysis/Cash flow analysis/Unit cost/Payment schedule）删到3项，"Cash flow analysis"的链接从`/supply-chain/cost-control?tab=cashflow`简化成`/supply-chain/cost-control`（不再需要query param区分两个tab）。**踩了一个坑**：简化后"Cash flow analysis"和父级"Cost Control"共用同一个href，如果直接用通用的前缀匹配高亮逻辑，会导致在Unit cost/Payment schedule子页面时"Cash flow analysis"也被误判成高亮——加了一个精确匹配的特判（只有这一个子项需要，因为它是唯一一个href跟父级完全相同的子项）。

**验证**：`tsc --noEmit`干净；`npm run lint`从24个已知问题**降到22个**（净减少，删除的死代码本身带的问题也一起消失了，不是历史遗留被容忍）。全仓库grep确认`CashFlowEntry`/`CostAnalysisEntry`/`CostAnalysisPanel`/`PoCashFlowPanel`/`cash_flow_entries`/`cost_analysis_entries`均无残留引用。本地起`mps-dev`真机验证（清了一次`.next`缓存排除Turbopack批量删文件后的路由缓存失效噪音）：
- Dashboard首页"Forecast Cash flow analysis"板块：真实数字完整渲染（Computable forecast total $1,228,150.26等），确认瘦身`CashFlowDashboard`没有影响这个真正在用的路径。
- Cost Control 3个子页（主页/Unit Cost/Payment Schedule）：子导航都只显示3项且高亮状态正确（包括之前会误判的"Cash flow analysis"在Unit Cost/Payment Schedule页面上确认不再误高亮）；`.app-panel`卡片数确认都是1张；每个页面正文实测有5000+字符的真实渲染内容（含Forecast cash flow表格、真实美元金额、Export按钮等），排除了"看起来空白"的假警报（那是`get_page_text`/`innerText`在未激活显示的Browser pane里的已知不可靠表现，改用`textContent`直接读DOM验证为准）。
- 全程`preview_logs`查服务端日志无报错。

---

## 2026-09-07 — 数据驱动的系统体检：清理重复/测试账号 + 删除死表 `po_sequences`

Commit: `80e1623`

**背景**：David 让基于生产数据分析系统还有哪些值得优化的点。查了各表行数、创建时间分布、外键完整性等，汇总出5个方向，David 确认全部按建议方向执行，这次先做了其中风险最低的两项（第3项审计日志设计、第4项"成本分析"tab取舍、第5项NPI/QC/Logistics模块投入取舍，还需要跟David分别确认细节，未执行）。

**⚠️ 过程中纠正了一次差点搞反的判断**：最初只看 `users`/`user_regions` 表，发现 `apac`/`eu-admin`/`us-admin` 和 `apac_admin`/`eu_admin`/`usa_admin` 两组账号区域权限完全重复，凭直觉以为后创建的`_admin`后缀那组是"正式版"、该保留，前一组是废弃的、该删除。**动手删除前先查了每个账号实际创建过多少条forecast/contract记录，发现方向完全反了**：`apac`/`eu-admin`/`us-admin`三个账号合计创建了60条forecast（占全部123条的近一半，是真人在用的账号），而`apac_admin`/`eu_admin`/`usa_admin`三个账号确认0条forecast/0条contract，是真正没人用的账号。已经据此修正后再执行，没有误删任何真实在用的账号。

**改动**：
1. **删除4个确认0使用记录的账号**（`apac_admin`/`eu_admin`/`usa_admin`——0 forecasts/0 contracts的重复账号；`testbot`——0 forecasts/0 contracts的测试账号，之前还留着真实APAC区域权限）。删除前逐个查过`forecasts.created_by`/`contracts.created_by`确认为0，且确认`users`表所有被引用的外键（`created_by`/`updated_by`等约30处）都没设`on delete cascade`（只有`user_regions`一张表级联删除），就算判断错了也只会删除报错、不会误删业务数据。删除操作通过`admin_audit_logs`补记了4条`delete_user`审计记录（actor=david），保持审计记录连贯。
2. **删除死表`po_sequences`**：全仓库grep确认只在`lib/db.ts`的建表语句里出现过，没有任何代码读写它（真正在用的是`forecast_po_sequences`，命名很像但是两张完全独立的表），数据库里躺着1条孤儿数据。生产库直接`drop table`，同时从`lib/db.ts`删掉这段`create table if not exists po_sequences`建表代码，防止下次冷启动又建回来。

**验证**：`tsc --noEmit`、`npm run lint`全干净（24个已知历史问题不变）。删除账号后重新查过`users`表确认还剩25个（29-4），且`apac`/`eu-admin`/`us-admin`三个真实在用的账号完整保留；`to_regclass('po_sequences')`确认表已不存在；全仓库re-grep确认代码里没有残留引用。

**待确认后续（第3/4/5项，未执行）**：
- 第3项：给forecast/contract这类业务数据补操作审计日志——需要先跟David对齐记哪些字段、保留多久、谁能查，再动手实现，不能照抄`admin_audit_logs`现有模式直接套。
- 第4项：Cost Control的"成本分析"tab（`CostAnalysisPanel`+`PoCashFlowPanel`，背后`cost_analysis_entries`/`cash_flow_entries`两张表4个月0行真实数据）——要不要整个移除，是产品决策不是代码整理，需要David明确"删"还是"留"。
- 第5项：NPI Management/Quality Control/Logistics Progress 里一批模块（BOM/ECN/SOP/Tooling管理、4个QC子模块、Shipments/到岸成本汇总）7月摸底审计就是0行数据，9月复查依然0行——是否继续投入维护，是团队工作重心问题，只是把数据摆出来给David参考，没有定义具体的代码改动。

---

## 2026-09-02 — 全站子导航统一收进标题卡片，消除堆叠卡片和 Cost Control 重复子导航

Commit: `b985262`

**背景**：David 反馈 Order fulfillments 页面实际可操作区域太窄，追问下发现是标题卡片和子导航各占一张卡片、白白吃掉垂直空间；又发现 Cost Control 页面更离谱——同时存在两套完全独立、内容还对不上的子导航（一套塞在标题卡片里但漏了"Payment schedule"，另一套单独起一张卡片但顺序不同）。排查后发现 `AppShell` 本来就设计了 `moduleTabs` prop 用来把子导航合并进标题卡片（避免堆叠卡片，见 `components/shared/app-shell.tsx:20` 的注释），但只有 Supply Chain 的 Contracts/Suppliers/Buyer Entities 和 Order Progress 正确用了这个方式；Cost Control 两套都用（重复）；Logistics Progress、Quality Control 完全没用，各自单独起一张 `.app-subnav` 卡片。NPI Management 没有子导航（纯靠左侧栏），不在此次范围内。David 确认后要求把所有已有子导航的模块统一成 `moduleTabs` 合并这一种写法。

**改动**：
- `components/supply-chain/supply-chain-subnav.tsx`：Cost Control 的嵌套子项从 3 项补全成 4 项，加回缺失的 "Payment schedule"（跟被删除的 `CostControlSubnav` 保持内容一致）。
- 删除 `components/supply-chain/cost-control/cost-control-subnav.tsx`（重复实现，内容还跟 `SupplyChainSubnav` 里嵌套的那套不一致，是真正的 bug 根源）以及它在 `cost-control/page.tsx`、`cost-control/payment-schedule/page.tsx` 里的单独渲染；顺带清理了因此变成死代码的 `subnavActive` 变量、`tab` searchParams 解构（`CostControlPanel` 本来就是自己用 `useSearchParams()` 读 `?tab=`，不依赖页面传参）。
- `components/logistics/logistics-subnav.tsx`、`components/quality-control/quality-control-subnav.tsx`：去掉外层 `app-subnav p-3` 卡片包装（边框+阴影+背景），只保留内部的 tab 链接行——因为现在要塞进 `AppShell` 已经带边框背景的 `moduleTabs` 插槽里，不能再自带一层卡片外观，否则变成"卡片里套卡片"。
- Logistics Progress 5 个页面 + Quality Control 4 个页面：把各自的 `<LogisticsSubnav>` / `<QualityControlSubnav>` 从页面正文里的独立 `<div className="space-y-4">` 移到 `AppShell` 的 `moduleTabs` prop，跟标题合并成一张卡片。
- `app/npi/page.tsx` 里那个复用了同一套 `.app-subnav`/`.app-subnav-link` CSS 类的"快捷入口卡片"（跟这次的子导航重复问题无关，是落地页自己的一次性跳转入口）没有动。

**验证**：`tsc --noEmit`、`npm run lint` 全干净（24 个已知历史问题不变）；全仓库 grep 确认没有残留的 `subnavActive`/`CostControlSubnav`/旧卡片写法引用。本地起 `mps-dev` 逐页面实机验证（不是凭代码推断）：Cost Control 4 个路由变体（主页/Unit Cost/Payment Schedule/`?tab=cashflow`）、Logistics 5 个页面、Quality Control 4 个页面，每页都用脚本查了 `.app-panel`/`.app-subnav` 卡片数量（全部变成 1 张，之前 Cost Control 部分页面能查到 2 张）和 active tab 高亮状态（全部命中预期，包括之前漏掉的 Payment schedule）；对照检查了没有改动的 NPI 落地页确认它的入口卡片不受影响；全程查 `preview_logs` 无服务端报错，浏览器 console 除了跟代码无关的开发环境 HMR websocket 噪音外没有新增报错；截图确认 Order fulfillments 页面标题跟 tabs 现在是一张卡片，不再是两张堆叠的卡片。

---

## 2026-09-02 — Supply Chain Management 模块组件目录重整（第一步）

Commit: `35e2365`

**背景**：David 反馈 Supply Chain Management 模块目录乱，问有没有整理思路。诊断发现：路由早就统一在 `app/supply-chain/{cost-control,contracts,suppliers,buyer-entities}/` 下，但组件散落成 `components/contract/`、`components/cost-control/`、`components/supplier/`、`components/buyer-entities/` 四个各自独立、不带 `supply-chain` 前缀的顶层目录，同时又存在一个 `components/supply-chain/` 目录但只放了 `supply-chain-subnav.tsx`（模块内子导航）——路由和组件的目录结构对不上。API 层（`/api/contracts`、`/api/cost-control`、`/api/suppliers` vs `/api/supply-chain/contracts/*`）更分裂，风险也更高（要改前端硬编码的 fetch 路径、真正改变 URL），跟 David 商量后拆成两步，本次只做风险低的组件目录对齐（第一步），API 层重整（第二步）留待后续单独确认。

**改动**：
- `components/{contract,cost-control,supplier,buyer-entities}/*` → 统一挪到 `components/supply-chain/{contracts,cost-control,suppliers,buyer-entities}/*`，跟路由结构一一对应（用 `git mv` 保留文件历史）。
- **中途发现一个例外**：`components/cost-control/cost-control-form-controls.ts` 检查后发现根本不是 Cost Control 专属的东西，是纯通用的表单控件宽度/样式常量（`ccLabel`/`ccSelectSm` 等，配合 `docs/ui-control-width-checklist.md` 的"内容驱动宽度"规范），被 NPI（BOM/ECN/SOP/Tooling）、Quality Control（Test Cases/Certifications/ORT/8D）、Logistics（Inventory Global/Shipping Report）、Order Progress、Product Database 等一堆跟供应链无关的模块引用（37 处引用里有一半以上来自这些模块）。如果把它也搬进 `supply-chain/cost-control/`，会让这些无关模块的 import 路径变得更误导。所以把这一个文件单独挪到 `components/shared/field-controls.ts`，其余 10 个真正 Cost Control 专属的文件才搬进 `supply-chain/cost-control/`。这个判断是本次重构范围内的自然延伸，没有另外找 David 确认，完成后在这里说明。
- 同步更新了全仓库 37 处引用这些路径的 import（`app/supply-chain/*`、`lib/printable-po-*.ts(x)`，以及上面提到的 NPI/QC/Logistics/Order Progress/Product 等无关模块），四个旧目录（`components/contract`、`components/cost-control`、`components/supplier`、`components/buyer-entities`）搬空后删除。
- 未改动任何 URL、API、组件对外行为——纯内部文件位置 + import 路径调整。

**验证**：`tsc --noEmit`、`npm run lint` 全干净（24 个已知历史问题不变，说明没有漏改的 import）；`grep` 确认仓库里不再有任何指向旧路径的引用。本地起 `mps-dev` 实机走了一遍：Supply Chain 模块本身（Cost Control 首页+Payment Schedule+Unit Cost 子页、Contracts、Suppliers、Buyer Entities）全部正常渲染无 console 报错；另外抽查了引用 `field-controls.ts` 的 NPI（BOM Management）、Quality Control（Test Cases）两个无关模块页面，确认它们的表单控件样式没有因为这次搬家跟着坏掉。

---

## 2026-09-02 — 集成 API `order-fulfillments` 加 opsActions / comments 字段

Commit: `5c5aa62`

**背景**：Berfin 在 Slack 反馈，想在 group 对象里拿到 Ops action（"Ok to issue PO" / "Consider stock transfer from other region" 等）和 Comment 字段，用来在她的 AOP 看板里把"Consider stock transfer"的 SKU 单独标出来，跟已确认要生产的分开。举的例子是 `POE202608040001` / `IGM4` / Dec 2026 / EU。

**改动**：
- `lib/types.ts`：`FulfillmentGroup` 加 `opsActions: string[]`、`comments: string[]`。
- `lib/order-fulfillment-groups.ts`：`buildGroups()` 累加时收集每个 forecast 行的 `opsAction`/`remark`（UI 里"Comment"列实际存的是 `remark` 字段），去重后放进这两个数组。**用数组而不是单个字符串**，是因为一个 group 有可能对应 2 条 forecast 行——同一个 PO+SKU+月份如果同时填了 BTO 和 BTS 数量，表单会拆成两行分别存，每行的 Ops action/Comment 可能不一样。
- `docs/Foretracker-Integration-API-Guide-Berfin.md`：3.3 节补充说明这两个新字段，并解释了"为什么是数组"以及"多数情况下数组只有 0 或 1 个元素"这件事，避免 Berfin 那边假设是单个字符串。

**验证**：`tsc --noEmit`、`npm run lint` 全干净（24 个已知历史问题不变）。本地起 `mps-dev`（端口3002），临时建 `fulfillment:read` scope 的测试 key 直连验证，测完已删除：
- Berfin 举的例子 `?forecastPoNumber=POE202608040001&sku=IGM4` → 返回 `"opsActions":["Consider stock transfer from other region"],"comments":[]`，跟她在 UI 里看到的完全一致。
- 找了一条真实的 2 行 forecast（`POA202605110001`/`IGB4`/2026-09，两行 ops_action 都是"Ok to issue PO"、但 remark 不同）验证多行聚合逻辑：`opsActions` 正确去重成 `["Ok to issue PO"]`（没有重复），`comments` 正确列出两条不同备注 `["8月份forecast中150台未下单","RMA for SYW"]`——去重和多值列表两种情况都符合预期。

---

## 2026-08-18 — 侧边栏加收起/展开功能

Commit: `cf69d86`

**背景**：David 提出很多表格（比如 Forecast Records）列数多、需要横向滚动，问能不能牺牲侧边栏宽度换取页面完整性，但要对操作者友好。评估后建议做成"可收起侧边栏"而不是直接砍掉或默认隐藏——侧边栏 `md:w-56 lg:w-60`（224–240px）比起 Forecast 表格本身 `min-w-[72rem]`（1152px）来说不是横向滚动的主因，收起后也未必能完全消除滚动，但对 Jessie/Steven 这类需要在 8 大模块间频繁切换的人保留常驻导航更重要，所以做成用户自己选、记住偏好的开关，而不是强改所有人的默认体验。

**改动**：`components/shared/app-shell-nav.tsx` 加了 `collapsed` 状态（存 `localStorage` key `mps-nav-collapsed`，跟随浏览器记住偏好，不是全局强制设置）：
- 顶部加一个收起/展开按钮（`PanelLeftClose`/`PanelLeftOpen` 图标），只在 `md:` 以上尺寸显示。
- 收起后侧边栏从 `md:w-56 lg:w-60` 缩到 `md:w-14`，只显示图标（8 大模块图标 + hover/title 提示原文字），文字标签、二级子菜单展开箭头、子菜单列表全部隐藏。
- 有子菜单的模块（Supply Chain/Order Progress/Logistics/NPI/Quality Control）收起时点图标直接跳到模块首页，看不到子菜单——要看子菜单需要先展开侧边栏。这是有意的取舍，不做 hover 弹出子菜单（范围外的额外复杂度）。
- **移动端安全兜底**：收起状态全部用 `md:` 开头的响应式 class 实现（而不是简单粗暴的 JS 分支渲染两套 DOM），确保就算 `collapsed` 状态因为某种边界情况（比如在桌面端收起后把浏览器窗口缩到手机宽度）变成 true，移动端窄屏下依然强制显示完整文字标签、看不到那个收起按钮——移动端体验完全不受这个新开关影响。

**验证**：`tsc --noEmit`、`npm run lint` 全干净（同样中途撞到一次 `react-hooks/set-state-in-effect` 新增 lint 问题——组件挂载时从 `localStorage` 读取偏好写回 state 触发的——用 `queueMicrotask` 把这次 setState 挪到 effect 同步执行栈之外解决，最终还是 24 个已知历史问题没有增加）。本地起 `mps-dev` 用 david 账号实机验证：桌面视口下点击收起，侧边栏 240px→56px，图标居中、文字/子菜单/展开箭头全部正确隐藏；点击展开按钮变回原样；刷新页面后收起状态能从 localStorage 正确恢复（240px→56px 一致）；把窗口缩到手机尺寸（375px）时，即使 localStorage 里存的是收起状态，导航依然完整显示文字标签、收起按钮不可见——移动端没有受影响。验证过程中一度在 console 看到一次 "Hydration failed" 错误，经过对照测试（`git stash` 出改动前的版本 vs 改动后版本，各自开全新浏览器 tab 测试）确认这次改动本身不会复现该错误，两个版本都干净，判断是本地 dev server 冷启动编译时的偶发瞬时问题，非本次改动引入。

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

