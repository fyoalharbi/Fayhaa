---
title: InvaSight — pipeline لمحفظة استثمارية
date: 2026-09
summary: ELT pipeline يحوّل سجل معاملات الشركة وأسعار السوق اليومية إلى star schema مقيّم بالريال السعودي و Power BI dashboard، بـ Airflow orchestration.
tldr:
  problem: شركة استثمار صغيرة تحتاج صورة موحدة وموثوقة لمحفظتها، تجمع سجل المعاملات الداخلي مع أسعار العملات والمعادن والأسهم اليومية، وكلها مقيّمة بالريال السعودي.
  role: "Capstone project جماعي (Data Engineering Bootcamp في الأكاديمية السعودية الرقمية SDA، فريق من 4). دوري: الـ Orchestration والـ Integration — DAGs في Airflow، منطق الـ landing والـ loading، الـ loading إلى Snowflake، CI/CD وربط الـ dashboard."
  tools: Airflow و dbt و Snowflake و Azure Blob Storage و AWS EC2 و Power BI و Docker و GitHub Actions و pytest (و DuckDB للنسخة المحلية)
  result: pipeline متكامل فيه DAGين و13 dbt model و79 data test يغذي dashboard المحفظة. النسخة العامة تشتغل محلياً بأمر docker compose واحد.
skills: [airflow, dbt, sql, python, etl, snowflake, data-modeling, power-bi, docker, ci-cd, azure, aws, git]
links:
  github: https://github.com/fyoalharbi/invasight
featured: true
---

![Portfolio overview dashboard](https://raw.githubusercontent.com/fyoalharbi/invasight/main/docs/images/dashboard_overview.png)

*الـ Dashboard من النسخة الأصلية على Snowflake. كل بيانات السجل اصطناعية وأسماء العملاء مخفية.*

## المشكلة

تقارير الشركة تعتمد على نوعين مختلفين من البيانات: سجل معاملات داخلي يتغير طول اليوم، وبيانات سوق (أسعار صرف، معادن ثمينة، أسهم) من ثلاث APIs خارجية محدودة الطلبات (rate-limited). والمطلوب أن يكون كل شيء مقيّم **بالريال السعودي** عشان تنقرأ المحفظة بعملة وحدة.

## كيف يشتغل

1. **Ingest:** دفعات السجل وردود الـ APIs تنجلب وتتحقق قبل التخزين.
2. **Land:** الملفات الخام تنحفظ في landing zone على Azure Blob (أو مجلد محلي).
3. **Load:** فقط الملفات اللي استلمها هذا التشغيل تنحمّل للـ `raw` layer كما هي.
4. **Transform:** الـ dbt models تحلل البيانات وتحوّل الأسعار للريال وتبني **star schema**.
5. **Serve:** Power BI يقرأ الـ star schema لـ dashboard المحفظة.

و Airflow يسوي الـ orchestration لكل الخطوات.

![Architecture diagram](https://raw.githubusercontent.com/fyoalharbi/invasight/main/docs/images/architecture.png)

## قرارات التصميم

**DAGين مفصولين حسب المصدر:** السجل يوصل كل 45 دقيقة، وبيانات السوق مرة يومياً من APIs ممكن تتعطل. الفصل يعطي كل وحدة جدولها ومحاولاتها، فتعطل الـ APIs ما يوقف استلام السجل.

**Raw layer كما هي:** الردود تنحفظ كاملة والتحليل كله في dbt، فإذا تغيرت الـ API يستمر الـ loading ونقدر نعيد التحليل بدون جلب جديد.

**تحميل مرة وحدة بالضبط:** كل مهمة تحمّل ملفاتها فقط، والملف الخاطئ يوقف المهمة عشان dbt ما يشتغل على بيانات ناقصة.

**تعامل دقيق مع العملات:** آخر سعر صرف متاح لكل تاريخ، والسعر المفقود يفشل اختبار بدل ما يصير 1.0 بصمت.

## Data quality

`dbt build` يشغّل **79 data test** مع الـ models، وأي فشل يوقف مهمة Airflow: المفاتيح، العلاقات بين الـ facts والـ dimensions، القيم المسموحة، والقواعد مثل *كل معاملة لها سعر صرف*.

## قبل التسليم بيوم

قبل يوم من تسليم المشروع انتبهت إن فيه **3 محاولات دخول ناجحة** على سيرفرنا في EC2، بالإضافة لملفات dbt محذوفة سببت لنا مشكلة في الـ dashboard، وكل ما نصلح ملف ينحذف واحد ثاني! تتبعت المشكلة وتداركت الوضع، و**استعدت مشروع dbt كامل من الـ query history في Snowflake** قبل التسليم.

## وش بسوي بعدين

- أخلي `fact_holdings` incremental بدل إعادة بنائه كل مرة.
- أحسب صافي المراكز مو بس كمية التداول اليومية.
