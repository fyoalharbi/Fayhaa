---
title: Personal Finance Analyzer
date: 2025-09
summary: A Streamlit app that reads a bank statement PDF, turns it into a DataFrame, and shows where your money comes from and goes.
tldr:
  problem: Banking apps don't break your transactions down the way you'd want. I wanted that analysis built in, so I built it myself.
  role: Built end to end, from PDF parsing and transaction classification to the analysis and the Streamlit app.
  tools: Python, Streamlit
  result: A working analyzer for any Al Rajhi Bank statement, with eight views from income vs. spending to hourly patterns and CSV export.
skills: [python, streamlit, data-cleaning]
links:
  linkedin: https://www.linkedin.com/posts/fayhaaralharbi_streamlit-dataabranalysis-fintech-ugcPost-7368461640532480003-fU7A
featured: true
---

## The problem

I kept wishing my banking app came with a real breakdown of my transactions, not just a list. So I built the analyzer I wanted to see inside it.

## How it works

1. **Read the statement.** The app takes a bank statement as a PDF and converts its transactions into a DataFrame.
2. **Understand each transaction.** Banks describe transfers in their own wording, so I worked through how each transaction type is phrased and wrote the logic to extract the useful details (who, what kind, how much) from that text.
3. **Analyze.** It runs the calculations and pulls out the key figures.

## What it shows

1. An overview of your income and spending
2. Filtering by transaction type, amount range and date
3. Income and spending over the period you choose
4. A comparison of your transaction types and each one's share
5. Spending vs. income per merchant or person
6. Monthly, weekly and hourly transaction patterns
7. Export of the cleaned data as CSV
8. Quick facts: average spending and income, the most frequent transaction, the largest payment and the highest income

## Result

It currently works for anyone banking with **Al Rajhi Bank**. The data shown in the demo is not real.

## What I learned

How banks structure transaction records, how to extract structured information from free text, and how to handle each transfer type based on the bank's own wording.
