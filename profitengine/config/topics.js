'use strict';

const TOPICS = [
  {
    niche: 'passive income',
    keywords: ['passive income', 'recurring income', 'digital assets', 'financial freedom'],
    angles: [
      {
        title_template: 'How to Validate a Passive-Income Idea Before Spending Money {year}',
        description: 'A practical validation process for testing demand, competition, delivery effort, and realistic margins before building.',
        reader: 'A beginner who has an income idea but does not want to waste money building the wrong thing.',
        outcome: 'Finish with a go/no-go validation checklist and a low-cost first test.',
        format: 'decision guide with a short validation workflow'
      },
      {
        title_template: 'Build a Repeatable Digital Income System With Free Tools {year}',
        description: 'How to connect a simple digital product, checkout, delivery, email follow-up, and measurement workflow using free or free-tier tools.',
        reader: 'A solo operator who wants a small automated income system without adding a large software bill.',
        outcome: 'Finish with a minimum viable automation stack and setup sequence.',
        format: 'step-by-step implementation tutorial'
      },
      {
        title_template: 'Turn One Useful Digital Asset Into Multiple Revenue Channels {year}',
        description: 'How to repurpose one original digital asset into several legitimate offers without duplicating low-value content.',
        reader: 'A creator or small business owner with one useful guide, template, checklist, or dataset.',
        outcome: 'Finish with a repurposing map, pricing logic, and launch order.',
        format: 'worked example plus action plan'
      },
      {
        title_template: 'A Beginner’s Recurring Digital Income Workflow for {year}',
        description: 'A realistic recurring-income workflow focused on useful products, repeat customers, maintenance, and measurable conversion.',
        reader: 'A beginner who wants recurring digital revenue without unrealistic passive-income promises.',
        outcome: 'Finish with a weekly operating routine and the metrics that matter.',
        format: 'operating playbook'
      }
    ]
  },
  {
    niche: 'affiliate marketing',
    keywords: ['affiliate marketing', 'affiliate content', 'buyer intent', 'conversion optimization'],
    angles: [
      {
        title_template: 'How to Write Affiliate Content That Helps Buyers Decide {year}',
        description: 'Create useful affiliate content around comparison criteria, tradeoffs, fit, and buyer intent instead of generic product lists.',
        reader: 'A publisher who wants affiliate articles that are genuinely useful and more likely to convert.',
        outcome: 'Finish with a buyer-decision article template and disclosure checklist.',
        format: 'editorial tutorial with examples'
      },
      {
        title_template: 'Build an Affiliate Content Funnel Without Paid Ads {year}',
        description: 'Connect search-intent articles, internal links, email capture, and follow-up content into a measurable organic funnel.',
        reader: 'A small publisher with limited budget and an existing site or newsletter.',
        outcome: 'Finish with a simple funnel map and measurement plan.',
        format: 'funnel build guide'
      },
      {
        title_template: 'How to Choose Affiliate Offers Without Damaging Reader Trust {year}',
        description: 'Evaluate relevance, terms, support, reputation, disclosure requirements, and audience fit before promoting an offer.',
        reader: 'A creator deciding which affiliate programs belong in their content.',
        outcome: 'Finish with a scoring rubric for accepting or rejecting offers.',
        format: 'decision framework'
      },
      {
        title_template: 'Refresh Old Affiliate Articles for Better Search Intent {year}',
        description: 'Audit outdated affiliate content for stale claims, weak intent matching, broken links, poor comparisons, and thin calls to action.',
        reader: 'A site owner with an existing library that is not converting as well as expected.',
        outcome: 'Finish with a prioritized refresh checklist.',
        format: 'content audit playbook'
      }
    ]
  },
  {
    niche: 'ai tools',
    keywords: ['ai tools', 'ai automation', 'small business automation', 'ai productivity'],
    angles: [
      {
        title_template: 'Build a Small-Business AI Workflow With Free Tools {year}',
        description: 'Design a useful AI workflow for intake, drafting, review, and follow-up while keeping a human approval point where it matters.',
        reader: 'A small business owner who wants practical AI automation rather than another list of tools.',
        outcome: 'Finish with one deployable workflow and its failure checks.',
        format: 'implementation tutorial'
      },
      {
        title_template: 'How to Evaluate an AI Tool Before Adding It to Your Business {year}',
        description: 'Test an AI tool for usefulness, privacy, reliability, exportability, lock-in, cost, and measurable time saved.',
        reader: 'A business owner comparing AI products and trying to avoid unnecessary subscriptions.',
        outcome: 'Finish with a repeatable evaluation scorecard.',
        format: 'decision guide'
      },
      {
        title_template: 'Automate Repetitive Admin Work Without Losing Quality {year}',
        description: 'Separate deterministic tasks from judgment-heavy work and automate only the parts that can be checked reliably.',
        reader: 'A solo operator or small team buried in repetitive administrative work.',
        outcome: 'Finish with an automation map and review gates.',
        format: 'workflow design playbook'
      },
      {
        title_template: 'Create a Human-in-the-Loop AI Content System {year}',
        description: 'Build an AI-assisted content workflow with research, drafting, quality checks, fact discipline, approval, publishing, and feedback.',
        reader: 'A publisher who wants scale without low-quality automated content.',
        outcome: 'Finish with a production-ready editorial workflow.',
        format: 'editorial operations guide'
      }
    ]
  },
  {
    niche: 'side hustle',
    keywords: ['side hustle', 'service business', 'digital product', 'make money online'],
    angles: [
      {
        title_template: 'How to Test a Side Hustle in One Weekend Without Overspending {year}',
        description: 'Use a small demand test, a narrow offer, direct outreach, and a simple fulfillment plan before investing heavily.',
        reader: 'A beginner choosing between several side-hustle ideas.',
        outcome: 'Finish with a weekend validation plan and pass/fail criteria.',
        format: 'time-boxed action plan'
      },
      {
        title_template: 'Turn an Existing Skill Into a Productized Service {year}',
        description: 'Package a skill into a clear scope, price, turnaround, proof, intake process, and repeatable delivery checklist.',
        reader: 'An experienced worker who wants to sell outcomes instead of open-ended hourly labor.',
        outcome: 'Finish with a productized-service offer template.',
        format: 'offer-building tutorial'
      },
      {
        title_template: 'How to Price a New Side Hustle Without Guessing {year}',
        description: 'Use delivery time, direct costs, risk, demand, minimum acceptable margin, and market positioning to set an initial price.',
        reader: 'A new operator who is unsure what to charge.',
        outcome: 'Finish with a simple pricing worksheet and review cadence.',
        format: 'pricing guide with worked example'
      },
      {
        title_template: 'Build a Side Hustle That Can Become Recurring Revenue {year}',
        description: 'Identify repeat problems, convert one-off work into maintenance or subscription offers, and track retention.',
        reader: 'A freelancer or service provider tired of restarting sales from zero each month.',
        outcome: 'Finish with three recurring-offer patterns and a conversion plan.',
        format: 'business model playbook'
      }
    ]
  },
  {
    niche: 'digital products',
    keywords: ['digital products', 'Etsy digital downloads', 'SVG files', 'printable products', 'creator business'],
    angles: [
      {
        title_template: 'How to Create and Sell SVG Files on Etsy Using Free AI Tools {year}',
        description: 'Create an original SVG product, clean and test the file, package it professionally, list it clearly, and build a repeatable creation workflow using free tools.',
        reader: 'A beginner who wants to create a legitimate digital product without expensive design software.',
        outcome: 'Finish with one tested SVG product and an Etsy-ready listing checklist.',
        format: 'hands-on step-by-step tutorial'
      },
      {
        title_template: 'How to Build and Sell a Printable Workbook With Free Tools {year}',
        description: 'Turn a specific customer problem into a useful printable workbook, test the pages, package the files, and prepare a clear listing.',
        reader: 'A beginner creating a first digital download.',
        outcome: 'Finish with a workbook outline, production workflow, and listing checklist.',
        format: 'hands-on build tutorial'
      },
      {
        title_template: 'Validate a Digital Product Idea Before You Design It {year}',
        description: 'Check demand signals, customer language, competing offers, differentiation, production effort, and likely support burden before building.',
        reader: 'A creator with too many product ideas and limited time.',
        outcome: 'Finish with a ranked shortlist and a low-cost validation test.',
        format: 'decision framework'
      },
      {
        title_template: 'Bundle Digital Downloads Without Creating Low-Value Filler {year}',
        description: 'Combine complementary files around one customer outcome and price the bundle based on usefulness rather than file count.',
        reader: 'A digital-product seller who wants a higher-value offer.',
        outcome: 'Finish with a bundle architecture and quality checklist.',
        format: 'product strategy guide'
      }
    ]
  },
  {
    niche: 'fleet and mobility',
    keywords: ['fleet management', 'vehicle rental business', 'delivery scooter rental', 'fleet utilization', 'mobility business'],
    angles: [
      {
        title_template: 'How to Decide Whether an Idle Vehicle Should Be Rented, Leased, or Kept In-House {year}',
        description: 'Compare utilization, insurance, maintenance, downtime, demand, administration, and risk before monetizing an underused vehicle.',
        reader: 'A small business with one or more vehicles that sit unused part of the week.',
        outcome: 'Finish with a decision matrix and break-even inputs to collect.',
        format: 'decision guide with a worked hypothetical example'
      },
      {
        title_template: 'A Practical Guide to Renting Fleet Vehicles to Gig Workers {year}',
        description: 'Design a small rental program around eligibility, deposits, insurance, maintenance, mileage, inspections, payment, and recovery procedures.',
        reader: 'A small fleet owner considering rentals to delivery or rideshare workers.',
        outcome: 'Finish with an operational checklist and risk controls.',
        format: 'operations playbook'
      },
      {
        title_template: 'How to Build a Small Delivery Scooter Rental Program {year}',
        description: 'Plan a small scooter-rental operation around customer fit, equipment, charging, maintenance, deposits, handoff, recovery, and unit economics.',
        reader: 'A local operator evaluating a last-mile mobility rental service.',
        outcome: 'Finish with a pilot plan and break-even worksheet inputs.',
        format: 'pilot implementation guide'
      },
      {
        title_template: 'Fleet Utilization Playbook: Turn Idle Vehicles Into Revenue Without Guessing {year}',
        description: 'Measure idle time, identify compatible use cases, calculate direct and risk-adjusted costs, run a controlled pilot, and review utilization data.',
        reader: 'A small fleet operator who wants a disciplined way to increase utilization.',
        outcome: 'Finish with a 30-day utilization pilot and measurement plan.',
        format: 'measurement-driven operating playbook'
      }
    ]
  }
];

function getTodayTopic(date = new Date()) {
  const dayIndex = Math.floor(date.getTime() / 86400000);
  const topicIndex = dayIndex % TOPICS.length;
  const cycle = Math.floor(dayIndex / TOPICS.length);
  const base = TOPICS[topicIndex];
  const angle = base.angles[cycle % base.angles.length];
  return {
    niche: base.niche,
    keywords: base.keywords,
    ...angle
  };
}

module.exports = { TOPICS, getTodayTopic };
