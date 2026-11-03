---
title: InvaSight — an investment portfolio data pipeline
date: 2026-09
summary: An ELT pipeline that turns a firm's transaction ledger and daily market prices into a SAR-valued star schema and a Power BI dashboard, orchestrated with Airflow.
tldr:
  problem: A small investment firm needed one reliable view of its portfolio, combining an internal transaction ledger with daily FX, precious-metal and equity prices, all valued in Saudi riyals.
  role: "Team capstone (SDA Data Engineering bootcamp). My part: orchestration and integration — the Airflow DAGs, landing and loading logic, Snowflake loading, CI/CD and the dashboard wiring."
  tools: Airflow, dbt, Snowflake, Azure Blob Storage, Power BI, Docker, GitHub Actions (DuckDB for the local version)
  result: An end-to-end pipeline with two DAGs, 13 dbt models and 79 data tests feeding a portfolio dashboard. The public version runs locally with a single docker compose command.
skills: [airflow, dbt, sql, python, etl, snowflake, data-modeling, power-bi, docker, ci-cd, azure]
links:
  github: https://github.com/fyoalharbi/invasight
featured: true
---

![Portfolio overview dashboard](https://raw.githubusercontent.com/fyoalharbi/invasight/main/docs/images/dashboard_overview.png)

*Dashboard from the original Snowflake deployment. All ledger data is synthetic and client names are blurred.*

## The problem

A small investment firm's reporting depended on two very different kinds of data: an internal transaction ledger that changes all day, and market data (FX rates, precious-metal prices, equity prices) from three rate-limited external APIs. Everything had to end up valued in **Saudi riyals (SAR)** so the portfolio could be read in one currency.

## How it works

The pipeline follows an **ELT** pattern:

1. **Ingest.** Ledger batches and market-data API responses are fetched and validated before anything is stored.
2. **Land.** Raw files go to a landing zone in Azure Blob Storage (or a local folder), one folder per source.
3. **Load.** Only the files this run landed are copied into the warehouse's `raw` layer, as delivered.
4. **Transform.** dbt models parse and type the raw data, convert prices to SAR, and build a **star schema**: holdings, market prices and a daily portfolio summary per client, with asset, client, currency, date and source dimensions.
5. **Serve.** Power BI reads the star schema for the portfolio dashboard.

Airflow orchestrates every step.

![Architecture diagram](https://raw.githubusercontent.com/fyoalharbi/invasight/main/docs/images/architecture.png)

## Design decisions

**Two DAGs, split by source.** The ledger arrives every 45 minutes; market data comes once a day from APIs that can rate-limit or fail. Separate DAGs give each its own schedule, retries and failure domain, so an API outage never blocks ledger ingestion. Each DAG's dbt build selects only the models downstream of its own sources.

**Keep the raw layer as delivered.** API responses are stored as whole JSON documents and ledger columns as text; all parsing happens in dbt. When an API adds a field or changes a type, loads keep working, and history can be re-parsed without re-fetching.

**Load exactly what this run landed, at most once.** Load tasks only pick up the files their own fetch produced, and load history makes retries safe. A bad file fails the task, so dbt never runs on partial data.

**Careful FX handling.** The free FX plan only returns EUR-based rates, so they're rebased and then converted to SAR. Facts use the latest rate on or before each date (an ASOF join). A missing rate stays empty and fails a test instead of silently defaulting to 1.0.

**One set of models, two warehouses.** Dialect differences between Snowflake and DuckDB live in a few macros, so the same models run on Snowflake in production and on DuckDB locally and in CI.

## Data quality

`dbt build` runs **79 data tests** alongside the models, and any failure fails the Airflow task: keys, referential integrity between facts and dimensions, accepted values, positive prices and quantities, and business rules such as *every transaction found an FX rate*. Payloads are also checked at extraction, so bad data never reaches the warehouse.

![dbt lineage graph](https://raw.githubusercontent.com/fyoalharbi/invasight/main/docs/images/dbt_lineage.jpg)

## What I'd do next

- Make `fact_holdings` incremental instead of rebuilding it every run.
- Model net positions, not just each day's traded quantity.
